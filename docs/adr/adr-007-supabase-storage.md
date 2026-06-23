# ADR-007 — Supabase Storage 도입 (OOTD 이미지 업로드)

## Status

Accepted — `feat/ootd-storage-schema` 브랜치에서 도입 (OOTD 피드 트랙 PR1)

## Date

2026-06-22

## Context

OOTD(오늘의 착장) 피드를 실제 작동하게 만들려면 사용자가 자신의 착장 **사진을 업로드**할 수 있어야 한다(`app/what-to-wear/page.tsx`의 "Post My Look"). 그런데:

1. **이미지 저장소 부재** — 현재 모든 이미지는 외부 CDN URL(kream/unsplash/dicebear)이며, 자체 업로드 인프라가 없다. try-on(`app/api/try-on/route.ts`)은 사용자 이미지를 base64로 Replicate에 전송만 하고 저장하지 않는다.
2. **ADR-005가 Supabase Storage를 명시적으로 보류** — "결정 2: 이미지 = 외부 URL, Supabase Storage 파일 업로드는 도입하지 않는다 ... 향후 관리자 상품 등록 트랙에서 별도 도입"(ADR-005 결정 2 / Consequences "향후 확장 트랙"). UGC(OOTD) 업로드는 외부 URL로 대체 불가하므로, **본 ADR이 그 보류를 선행 해제**한다.
3. **보안 민감도** — 업로드는 인증 사용자만 가능해야 하고, Storage 쓰기 권한 키(`service_role`)는 모든 권한을 가지므로 절대 클라이언트에 노출되면 안 된다(CLAUDE.md "클라이언트 코드에 시크릿 하드코딩 금지").

기존 스택: Supabase Postgres + Prisma + NextAuth v5(JWT). Supabase 프로젝트에는 Storage가 기본 포함되어 있어 신규 인프라 계약 없이 활성화 가능하다.

## Options Considered

### 결정 1: 이미지 저장 방식

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. Supabase Storage public 버킷 (채택)** | 기존 Supabase 활용(신규 인프라 0), public 버킷은 CDN 캐싱·서명 불필요, getPublicUrl 영구 URL | Storage↔DB 삭제 동기화 책임, 버킷 설정 필요 |
| B. 외부 URL 직접 입력 | 구현 단순 | UGC 업로드 본질에 안 맞음(일반 사용자가 URL 확보 불가) |
| C. base64 DB 저장 | 인프라 0 | 행 비대·성능 붕괴(이미지를 DB에) |
| D. Cloudinary/UploadThing 등 서드파티 | 자동 최적화 | 비용·추가 의존성·계약 — MVP 과잉 |

### 결정 2: 업로드 경로 / 키

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 서버 라우트 + service_role 키 (채택)** | 인증·파일 검증을 서버에서 강제(Zero Trust), 키가 서버에만 존재 | 파일이 서버를 경유 |
| B. 클라이언트 직접 업로드(anon 키 + RLS) | 서버 부하↓ | RLS 정책 설계 복잡, 클라 업로드 검증 우회 가능 |

### 결정 3: 버킷 공개 범위

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. public 버킷 (채택)** | 피드 이미지는 누구나 조회 — 단순, CDN 캐싱 | URL 알면 비로그인도 조회 가능(피드 공개 콘텐츠라 무방) |
| B. private + signed URL | 시간제한 접근 | 매 요청 서명·만료 처리, 공개 피드엔 과함 |

## Decision

**모든 결정 A 채택.**

- **버킷**: Supabase Storage `ootd-images` **public** 버킷 1개. OOTD 이미지 전용.
- **업로드 경로**: 서버 전용 모듈 `lib/supabase-storage.ts`(최상단 `import "server-only"`)에서 `service_role` 키로 **Storage REST API를 fetch로 직접 호출**한다. 클라이언트 컴포넌트에서 import 금지(빌드 단계에서 차단). env(`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`)는 호출 시점에 lazy 로드(키 없이도 빌드/테스트 통과).
  - **SDK(`@supabase/supabase-js`) 대신 REST 채택 이유**: SDK의 `createClient`가 realtime(WebSocket) 클라이언트를 초기화하는데, Node 20 서버 런타임은 전역 WebSocket이 없어 에러가 난다. Storage는 realtime이 불필요하므로, REST 엔드포인트(`/storage/v1/object/...`)를 fetch로 호출하는 것이 더 견고하고 의존성도 가볍다(SDK 미설치).
- **흐름**: 인증(`auth()`) → 서버에서 파일 MIME 화이트리스트(image/jpeg|png|webp)·크기 상한(5MB)·장수 상한 검증 → `storage.upload` → `getPublicUrl` → 그 public URL을 `OOTDPost.imageUrls`(String[])에 저장.
- **삭제 동기화**: 게시물 삭제 시 DB 행 삭제 후 Storage 파일 동기 삭제(`removeOOTDImagesByUrl`). 업로드 성공 후 DB 생성 실패 시 업로드분 보상 삭제(Storage는 Prisma 트랜잭션 밖이므로 인라인 보상).
- **next.config**: `images.remotePatterns`에 `<project-ref>.supabase.co` + `/storage/v1/object/public/**` 추가(미등록 시 `next/image`가 업로드 이미지 렌더 거부).

## Consequences

### 긍정

- **UGC 업로드 가능**: OOTD "Post My Look"이 실제 동작. 향후 관리자 상품 이미지 업로드(ADR-005가 예고한 트랙)도 이 인프라를 재사용 가능.
- **보안 경계 명확**: service_role 키는 `server-only` 모듈에만. 클라 유출 시 빌드 에러로 1차 방어. 파일 검증은 서버에서 강제(Zero Trust).
- **단순성**: public 버킷이라 서명/만료 처리 불필요, getPublicUrl 영구 URL.

### 제약 및 트레이드오프

- **고아 파일 책임**: Storage는 DB 트랜잭션 밖이라 부분 실패 시 보상 삭제 로직이 필요(인라인 처리, 백그라운드 GC 잡은 도입 안 함 — YAGNI).
- **public 노출**: URL을 알면 비로그인도 이미지 조회 가능. 피드는 공개 콘텐츠라 수용. 민감 이미지는 범위 외.
- **RLS 미사용**: 쓰기는 서버 service_role 단일 경로 + 서버 검증으로 보호하므로, 버킷 RLS 세밀 정책은 도입하지 않음(범위 외).
- **사용자 사전작업**: 버킷 생성·`service_role` 키 `.env.local` 주입은 프로젝트 소유자가 직접 수행(키는 commit 금지).

### ADR-005와의 관계

ADR-005는 "Supabase Storage는 도입하지 않고 외부 URL 사용, 향후 별도 트랙에서 도입"으로 **보류**했다. 본 ADR-007이 OOTD 트랙에서 그 보류를 **선행 해제**한다. ADR-005의 상품 카탈로그 이미지(외부 CDN URL) 결정은 **불변** — 본 ADR은 OOTD 사용자 업로드 이미지에만 적용되며, 상품 이미지를 Storage로 이전하지 않는다.

### ADR-003과의 관계

ADR-003 하이브리드 테스트가 적용된다. 업로드/삭제 헬퍼와 라우트는 단위 테스트에서 `vi.mock("@/lib/supabase-storage")`로 Storage를 mock한다(실 업로드는 통합/수동 검증).
