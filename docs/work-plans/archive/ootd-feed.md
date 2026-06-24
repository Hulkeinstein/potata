# Work Plan: OOTD 피드 실작동화 (업로드 게시 + 피드 + 좋아요 + 상품 태그)

> 상태: 설계·결정 확정(인터뷰 생략, 사용자 초보자·기술 위임). 실행 전 **사용자 사전작업(BLOCKER)**과 각 PR의 Wave 1 "스키마/인프라 결정 + Ask First 승인" TODO를 반드시 먼저 처리.
> 작업 디렉터리: `e:\kamwoo\6.Programing\Potata\potata` (패션 커머스, **`src/` 없는 루트** — `app/`, `components/`, `lib/`, `store/`, `prisma/`). **옆 동명 프로젝트 `Potato\potato`(src/ 기반)와 혼동 절대 금지** — 위 절대경로로만 접근.
> 정본 schema(현재 머지됨): `User` / `Order` / `Product` / `VerificationCode` / `WishlistItem` / `CartItem` / `RecentTryOn`. OOTD 3모델은 본 plan에서 신규 추가.
> 검증 기준 시점: 신규 브랜치(아래) · `prisma/schema.prisma`(User 11-26, Product 64-90, 조인 모델 컨벤션 92-130) · `app/api/wishlist/route.ts`(패턴 원본) · `components/providers/StoreSync.tsx` · `next.config.ts`(remotePatterns 4-19) · `lib/products.ts`(getProductById 51-54).

## Overview

- **Objective**: 현재 100% 목업인 OOTD 탭(`app/what-to-wear/page.tsx`)을 실제 작동하게 만든다 — 로그인 사용자가 사진(여러 장)을 업로드해 게시하고, 피드로 최신순 조회하고, 게시물에 좋아요(토글)를 누르고, 게시물에 상품을 태그(SHOP→상품 상세 링크)할 수 있다. 이미지는 Supabase Storage(public 버킷)에 서버 업로드 후 public URL을 DB에 저장한다.
- **Branch / PR 분할** (3개 PR — 순차, 각 100줄+ → plan 의무):
  - **PR1 (인프라+스키마+ADR)**: `feat/ootd-storage-schema` — 키 없이 선행 가능(코드/스키마/문서). Supabase Storage 헬퍼·Prisma 3모델·next.config·ADR-007.
  - **PR2 (업로드+게시 API+피드 GET)**: `feat/ootd-api` (PR1 머지 후 분기) — **사용자 사전작업(service_role 키 확보) 완료 후** 실 업로드 검증. 단위테스트는 키 없이 mock으로 가능.
  - **PR3 (UI 실연결+좋아요+삭제)**: `feat/ootd-ui` (PR2 머지 후 분기) — 목업 제거·실 피드 렌더·업로드 폼·좋아요 토글·본인 삭제.
- **Scope**:
  - **IN**: Supabase Storage public 버킷 "ootd-images" 서버 업로드(service_role, server-only) + getPublicUrl→DB; Prisma 3모델(`OOTDPost` imageUrls String[] / `OOTDLike` / `OOTDPostProduct` 조인 m:n) + User/Product 역관계; `POST /api/ootd`(auth 게이트→MIME/크기 검증→Storage 업로드 여러 장→post+태그 생성, 실패 시 Storage 보상 삭제); `GET /api/ootd`(cursor pagination 최신순, `_count.likes`, 태그 상품·작성자 include, 현재 유저 isLiked); `POST /api/ootd/[id]/like`(wishlist 멱등 토글); `DELETE /api/ootd/[id]`(본인만, DB 삭제→Storage 파일 동기 삭제); what-to-wear UI 실연결(목업 6개 제거, 빈 상태 "아직 게시물 없음", 업로드 폼, 좋아요 낙관적 UI, SHOP→상품 상세); 단위테스트(prisma+storage mock).
  - **OUT** (못박음): 댓글 / 팔로우 / 해시태그·검색 / 내 게시물 관리 전용 페이지 / 무한스크롤 자동(cursor **API만** 제공, UI는 "더 보기" 버튼 등 최소) / 이미지 리사이즈·썸네일·EXIF 처리 / 게시물 **수정**(생성·삭제만) / Storage RLS 세밀 정책(서버 service_role 단일 경로 + 서버 검증으로 충분) / 비로그인 게시·좋아요(로그인 필수 auth 게이트).
- **Approach**: 신규 발명 금지 — `app/api/wishlist/route.ts`가 확립한 패턴(`auth()` 401 게이트 → `session.user.id`만 신뢰·요청 userId 불신 → `prisma.product.findUnique` FK 선검증 → `createMany skipDuplicates` 멱등 토글 → try-catch 핸들러 최상위 → `extractErrorMessage` → `{success, data|error}` 응답)을 그대로 차용한다. 이미지 업로드만 신규 인프라(`lib/supabase-storage.ts`, server-only). Storage는 Prisma 트랜잭션 밖이므로 "업로드 성공 후 DB 실패 시 Storage 정리"(보상 삭제)와 "삭제 시 Storage 동기 삭제"를 명시 step+verify로 다룬다. OOTD 좋아요는 피드 항목별 토글이라 wishlist처럼 전역 store에 싣지 않고, 컴포넌트 로컬 낙관적 토글 + fire-and-forget POST로 처리(StoreSync 미변경 — surgical).

## Context

### Project Context (from docs/)

- **Product Goal** (`.claude/rules/session.md` 북극성): potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·상품상세 skill·Google OAuth·wishlist/cart/recents DB영속화 완료(머지). 본 작업은 "실유저 가동" 전 **참여형 UGC(OOTD)** 기능으로 체류·재방문 동기를 만든다. 부수 효과로 **Supabase Storage 인프라**를 처음 도입(향후 관리자 상품 이미지 업로드의 토대).
- **ADR Constraints Applied (DO NOT RE-DECIDE)**:
  - **ADR-004**(주문): 서버 재검증·로그인 필수 `auth()` 게이트. → OOTD도 모든 라우트 `auth()` 401 게이트, `session.user.id`만 신뢰(요청 body userId 불신).
  - **ADR-003**(하이브리드 테스트): 단위 = Prisma mock(`vi.hoisted`+`vi.mock`, `app/api/wishlist/route.test.ts` 골격) + Storage mock; 통합 1개 = 실 Postgres(CI `postgres:16`). 로컬 통합은 pgbouncer 42P05로 실패해도 선례대로 허용.
  - **ADR-005**(Product.id String, 이미지 외부 URL, **Supabase Storage 명시 보류**): 본 작업이 ADR-005가 보류한 Storage를 **선행 도입** → ADR-007로 기록(아래 Task). Product.id는 String이므로 OOTD 상품 태그 FK도 String.
  - **ADR-006**(NextAuth v5 JWT, no-adapter): `session.user.id` = DB `User.id`. 모든 라우트가 이 값에 의존.
- **Aligned with Existing Plans**: `persist-cart-wishlist.md`(좋아요 멱등 패턴·StoreSync·테스트 골격)·`auth-google-oauth.md`(인증 인프라) 위에 얹는 **독립 증분**. 기존 plan/ADR을 뒤집지 않음. wishlist 좋아요 패턴을 OOTD 좋아요에 재사용.
- **Out-of-Scope Items** (재확인): 가짜 user 객체(`user-${Date.now()}`) 금지(CLAUDE.md Forbidden), `data/dummy.ts` 신규 의존 금지, main 직접 commit 금지(feat 브랜치+PR), `.env*` commit 금지(클라 시크릿 하드코딩 금지), try-catch 핸들러 최상위만, 응답은 `{success, data|error}` 표준.

### Ask First 승인 항목 (실행 전 사용자 승인 — CLAUDE.md "Ask First")

각 항목의 diff를 사용자에게 제시 → "승인" 응답 전에는 적용 금지. PR1 Wave 1에서 일괄 제시.

1. **`package.json` 의존성 추가**: `@supabase/supabase-js`(서버 Storage 클라이언트). diff = dependencies에 1줄 + lockfile.
2. **`prisma/schema.prisma` 변경**: OOTD 3모델 + User/Product 역관계 추가(아래 Task 2 스키마 블록). 승인 후에만 `npx prisma db push`.
3. **`next.config.ts` 변경**: `images.remotePatterns`에 Supabase Storage 호스트 1개 추가(아래 Task 4 diff). 미등록 시 `next/image`가 업로드 이미지 렌더 거부.
4. **신규 env 키**: `.env.local`에 `SUPABASE_URL`(또는 기존 값 재사용) + `SUPABASE_SERVICE_ROLE_KEY`. `.env.example`엔 **키 이름만**(값 없이). `.env*` commit 금지.

### 갈림길 결정표 (기본값 채택 + 대안 기각 사유 — plan 검토 시 변경 가능)

| # | 갈림길 | 기본값 (채택) | 대안 (기각 사유) |
|---|--------|--------------|------------------|
| 1 | 이미지 저장 | **Supabase Storage public 버킷 "ootd-images" + 서버 업로드(service_role, server-only) → getPublicUrl→DB** | (a) 외부 URL 입력: UGC 업로드 본질에 안 맞음. (b) base64 DB 저장: 행 비대·성능 붕괴. (c) Storage private+signed URL: 피드 공개 이미지엔 과함(서명 만료·매 요청 서명) — public이 단순 |
| 2 | 게시물 이미지 모델 | **`OOTDPost.imageUrls String[]`**(Product.images String[] 패턴 재사용) | 별도 `OOTDImage` 1:N 테이블: YAGNI — 슬라이드 표시용 단순 배열로 충분, join만 늘어남(ADR-005 결정4와 동일 논리) |
| 3 | 상품 태그 다대다 | **명시적 조인 `OOTDPostProduct(@@unique([postId, productId]))`** | Prisma 암묵 m:n(`Product[]`/`OOTDPost[]`): 추후 태그 좌표·코멘트 등 확장 시 마이그레이션 필요 → 명시 조인이 확장 여지 확보(metis 권장) |
| 4 | 좋아요 모델·토글 | **`OOTDLike(@@unique([userId,postId]), @@index([postId]))` + `createMany skipDuplicates`/존재 시 delete 멱등 토글** | POST/DELETE 분리: 멀티탭/연타 시 클라·서버 불일치 — wishlist 멱등 단일 엔드포인트 패턴 재사용이 경쟁에 강함 |
| 5 | 좋아요 클라 상태 | **컴포넌트 로컬 낙관적 토글 + fire-and-forget POST**(GET의 `isLiked`/`likeCount`로 초기화) | 전역 store(StoreSync) 편입: OOTD 좋아요는 피드 항목별이라 productId[] 같은 전역 셋과 성격 다름 → StoreSync 미변경(surgical), wishlist HeartButton 낙관적 패턴만 차용 |
| 6 | 피드 페이지네이션 | **cursor(createdAt+id) API 제공, UI는 "더 보기" 최소**(자동 무한스크롤 OUT) | offset pagination: 게시 중 행 추가 시 중복/누락 — cursor가 정확. 자동 무한스크롤은 범위 초과(OUT) |
| 7 | 삭제 시 Storage 동기화 | **DB 삭제 후 Storage 파일 동기 삭제(보상)**, 업로드 후 DB 실패 시 업로드분 보상 삭제 | 고아 파일 방치: 비용·관리 부채. 백그라운드 GC 잡: 인프라 과함(YAGNI) — 인라인 보상이 단순·충분 |
| 8 | service_role 키 노출 경계 | **`lib/supabase-storage.ts` 최상단 `import "server-only"` + env 서버에서만 읽기** | 클라에서 직접 Storage SDK 사용: service_role 키가 클라 번들 유입 = 치명 보안 사고. 서버 단일 경로만 허용 |
| 9 | 파일 검증 | **서버에서 MIME 화이트리스트(image/jpeg\|png\|webp) + 크기 상한 5MB + 장수 상한(예 5장)** | 클라 검증만: 우회 가능(Zero Trust 위반). 서버 검증이 정본, 클라 검증은 UX 보조 |
| 10 | API 형태 | **Route Handler(`/api/ootd...`)** | Server Actions: 프로젝트 전부 Route Handler + `{success,error}` + `auth()` 게이트로 일관 → 비일관 도입은 변경 표면만 키움 |

### Research Findings (verified in codebase)

- `app/what-to-wear/page.tsx:11-18` — 목업 `OOTDS` 6개(unsplash URL·`@user`·likes·desc·product 문자열). **전부 제거 대상**. `:20-71` 마크업(sticky 헤더 "Post My Look" 버튼·columns-2/3 masonry·overlay·SHOP 태그·avatar·like 버튼)은 **레이아웃 골격 재사용**하되 실 데이터·핸들러로 교체.
- `app/what-to-wear/page.tsx:1` — 현재 파일 최상단 `"use client"`. 피드 GET을 클라에서 fetch + "use client" 유지가 기존 구조와 정합(아래 PR3 Task 10).
- `types/index.ts:56-64` — 기존 `OOTD` 인터페이스는 **비-DB 목업 형태**(id number·user string·image single). 신규 DB 계약 타입 별도 추가(기존 OOTD는 목업 제거 후 미사용 → 함께 제거).
- `app/api/wishlist/route.ts:8-97` — **좋아요 멱등 토글의 정본**: GET(8-34) `findMany` + `session.user.id` 필터, POST(37-97) `auth()` 401(40-45)→productId 검증(48-55)→`product.findUnique` FK 선검증(58-67)→`findUnique`로 존재 확인→있으면 `delete`(73-79)/없으면 `createMany skipDuplicates`(82-89)→try-catch 최상위(90-96)+`extractErrorMessage`. **OOTD like 라우트가 그대로 복제.**
- `app/api/wishlist/route.test.ts:1-115` — `vi.hoisted`로 mock fn 선언(4-12)→`vi.mock("@/auth")`/`vi.mock("@/lib/prisma")`(14-25)→라우트 import→`makeReq` 헬퍼(30-36). 401 미접근/검증/toggle on·off/멱등 케이스 단언. **OOTD 라우트 테스트 골격.**
- `lib/products.ts:51-54` — `getProductById(id)`(서버 전용, 없으면 null). OOTD 게시 시 태그 productId FK 선검증·피드 응답 상품 재조립에 사용.
- `lib/auth.ts:25-38` — `extractErrorMessage(error, fallback)`. 모든 라우트 catch에서 사용.
- `components/common/HeartButton.tsx:23-51` — 낙관적 토글(36 `toggleItem`) + fire-and-forget `fetch` POST(39-50, 실패 시 `console.warn`+롤백) + 비로그인 confirm→`/login` 게이트(27-34). **OOTD 좋아요 버튼이 차용할 낙관적 패턴.**
- `components/providers/StoreSync.tsx:19-135` — wishlist/cart/recents 전역 동기화. **OOTD는 전역 store 미사용이라 이 파일 미변경**(결정표 #5).
- `prisma/schema.prisma:11-26` — `User`에 `orders`/`wishlistItems`/`cartItems`/`recentTryOns` 관계. `ootdPosts`/`ootdLikes` 추가 필요. `:64-90` `Product`에 역관계(`ootdTags`) 추가 필요(명시 조인 채택 시).
- `prisma/schema.prisma:92-130` — `WishlistItem`/`CartItem`/`RecentTryOn` 모델 **작성 컨벤션**(id cuid·userId+user relation onDelete Cascade·`@@unique`·`@@index`). OOTD 3모델이 그대로 따름.
- `next.config.ts:4-19` — `images.remotePatterns` 3호스트(unsplash·dicebear·kream). Supabase Storage 호스트 1개 추가 필요(Task 4).

### Metis Hidden Complexity (반드시 명시 step+verify로 반영)

1. **service_role 키 server-only 격리**(PR1 Task 1): `lib/supabase-storage.ts` 최상단 `import "server-only"`. env는 `process.env.SUPABASE_SERVICE_ROLE_KEY`를 서버에서만 읽음. 클라 컴포넌트/번들에 import 금지. → verify: `import "server-only"` 존재 + 클라 컴포넌트에서 이 모듈 import 0건(grep).
2. **Storage↔DB 삭제 동기화**(PR2 Task 5 업로드 / PR2 Task 8 삭제): 업로드(Storage) 성공 후 DB(post) 생성 실패 시 → 업로드한 파일 보상 삭제. 게시물 삭제 시 → DB 행 삭제 후 Storage 파일 동기 삭제(고아 파일 방지). → verify: 보상/동기 삭제 경로의 단위 테스트(DB 실패 mock 시 storage.remove 호출 단언).
3. **파일 MIME 화이트리스트 + 크기 상한 서버 검증**(PR2 Task 5): `image/jpeg|png|webp`만, 파일당 ≤5MB, 장수 ≤5. 서버에서 검증(클라 검증은 보조). → verify: 비허용 MIME/초과 크기 업로드 시 400 + Storage 미호출 단언.
4. **next/image remotePatterns 미등록 시 렌더 거부**(PR1 Task 4): Supabase Storage 호스트를 `remotePatterns`에 추가하지 않으면 업로드 이미지가 `next/image`에서 런타임 에러. → verify: PR3 수동 검증에서 업로드 이미지가 피드에 정상 렌더.
5. **Storage는 트랜잭션 밖 → 부분 실패 처리**(PR2 Task 5): 여러 장 업로드 중 일부만 성공 후 DB 실패 시, 성공분 전부 보상 삭제. 업로드된 path 목록을 모아 실패 시 일괄 remove. → verify: 단위 테스트로 DB create 실패 시 업로드된 모든 path가 remove 인자에 포함.

### librarian (외부 베스트프랙티스 — 참고)

- Supabase Storage: 서버에서 service_role로 `storage.from(bucket).upload(path, file, { contentType })` → `getPublicUrl(path)`. public 버킷이면 서명 불필요. 삭제는 `remove([paths])`.
- next.config `remotePatterns`에 `<project-ref>.supabase.co` + `pathname: /storage/v1/object/public/**` 형태 권장(호스트 단위 등록도 동작).
- `import "server-only"`(Next.js 공식)로 서버 전용 모듈을 클라에서 import 시 빌드 에러로 강제 — service_role 키 유출 1차 방어선.

## Prerequisites

- [ ] **사용자 사전작업(BLOCKER) 완료**(아래 별도 섹션) — service_role 키는 **PR2 실 업로드 검증 시점**에 필수. PR1(스키마/인프라코드/ADR)은 키 없이 선행 가능.
- [ ] PR1 시작 전 `feat/ootd-storage-schema` 브랜치 생성(main 직접 commit 금지). PR2/PR3는 직전 PR 머지 후 분기.
- [ ] DB 접근: 로컬 `npx prisma db push` 가능한 `DATABASE_URL`/`DIRECT_URL`(`.env.local`). OOTD 테이블은 동일 DB.
- [ ] (실행자 인지) Ask First 4항목(위) 승인 step을 PR1 Wave 1에서 먼저 처리.

---

## 🚧 사용자 사전작업 (BLOCKER — 사용자가 직접 수행, 실행자가 클릭 단계 안내)

> 사용자는 초보자이며 "안내해주면 하겠다"고 동의함. 실행자는 아래를 그대로 안내. **service_role 키는 절대 commit 금지 / 클라 코드 노출 금지.** PR1은 키 없이 가능, PR2 실 업로드 검증부터 필수.

1. **Supabase Storage 버킷 생성**:
   - Supabase 대시보드 접속 → 좌측 메뉴 **Storage** → **New bucket**(또는 "Create bucket").
   - Name: `ootd-images` (정확히 이 이름 — 코드와 일치해야 함).
   - **Public bucket 토글 ON**(피드 이미지를 누구나 조회 가능하게 — 결정표 #1).
   - Create 클릭.
2. **service_role 키 확보**:
   - 대시보드 → **Project Settings**(톱니바퀴) → **API**.
   - **Project URL** 복사 → 이미 `.env.local`에 Supabase 연결값이 있으면 재사용, 없으면 `SUPABASE_URL=`로 추가.
   - **`service_role` secret** 키 복사(⚠️ `anon` 아님 — `service_role`. 이 키는 모든 권한이라 절대 클라/공개 금지).
3. **`.env.local`에 추가**(이 파일은 commit 안 됨):
   ```
   SUPABASE_URL=https://<your-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role 키 붙여넣기>
   ```
4. **확인**: 실행자에게 "버킷 생성 완료 + 키 .env.local에 추가 완료"라고 알리면 PR2 실 업로드 검증 진행. (실행자는 키 값을 보지 않음 — 사용자가 직접 입력.)

> `.env.example`엔 실행자가 **키 이름만**(값 없이) 추가: `SUPABASE_URL=` / `SUPABASE_SERVICE_ROLE_KEY=` (PR1 Task 4).

---

## PR1 — 인프라 + 스키마 + ADR (`feat/ootd-storage-schema`)

### TODOs

### PR1 Wave 1 (병렬 — 공유 의존성·결정·승인 먼저)

- [ ] 1. [PR1] `@supabase/supabase-js` 의존성 승인 + `lib/supabase-storage.ts`(server-only) 헬퍼 `category:ultrabrain`
  **Goal**: `lib/supabase-storage.ts` 신규. 최상단 `import "server-only"`로 클라 import를 빌드 단계에서 차단하고, service_role 키로 인증된 Supabase Storage 클라이언트 + `uploadOOTDImage`/`removeOOTDImagesByUrl`/`publicUrlToPath` 헬퍼를 노출한다. `@supabase/supabase-js` 의존성은 사용자 승인 후 설치.
  **References**:
  - `lib/products.ts:1-13` — 서버 전용 모듈 컨벤션(상단 주석 "`use client` 금지" 패턴). 동일 톤으로 server-only 경고 주석.
  - `lib/auth.ts:1-7` — `process.env` 상수/유틸 모듈 스타일.
  - 결정표 #8(server-only 격리)·Metis hidden complexity #1·librarian(Storage SDK 사용법).
  **구현 메모**:
  - 파일 1행: `import "server-only";`(Next.js 공식 — 클라 import 시 빌드 에러).
  - Storage 클라이언트는 **lazy** — 함수 호출 시 `process.env.SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 누락이면 명시 throw(모듈 로드 시 throw 금지 — 테스트/PR1 빌드가 키 없이도 통과해야 함). `const BUCKET = "ootd-images";`
  - `uploadOOTDImage(userId: string, file: { data: ArrayBuffer | Buffer; contentType: string; ext: string }): Promise<{ path: string; publicUrl: string }>` — path 예: `${userId}/${crypto.randomUUID()}.${ext}`. `supabase.storage.from(BUCKET).upload(path, data, { contentType })` → 성공 시 `getPublicUrl(path)`.
  - `removeOOTDImagesByUrl(publicUrls: string[]): Promise<void>` — 내부에서 `publicUrlToPath`로 변환 후 `supabase.storage.from(BUCKET).remove(paths)`. 보상/동기 삭제용(빈 배열이면 no-op).
  - `publicUrlToPath(publicUrl: string): string` — public URL 형식 `.../storage/v1/object/public/ootd-images/<path>`에서 `<path>` 추출. DB엔 publicUrl만 저장하므로 삭제 시 이 역변환 필요.
  **Must NOT do**: 이 모듈을 클라이언트 컴포넌트(`"use client"`)에서 import 금지(빌드 에러로 강제되지만 의도적으로도 금지). `anon` 키 사용 금지(service_role만 — 서버 단일 경로). env 키를 코드에 하드코딩 금지. 사용자 승인 없이 `npm install @supabase/supabase-js` 금지(Ask First). 모듈 최상위에서 env throw 금지(lazy).
  **QA Scenarios**:
  - Happy: 의존성 승인·설치 후 `npx tsc --noEmit` 통과, `import "server-only"`가 1행에 존재.
  - server-only 강제: 클라 컴포넌트에서 시험 import 시 빌드 에러(또는 grep으로 클라 컴포넌트의 이 모듈 import 0건 확인).
  - 승인 게이트: `package.json` diff 제시 → 승인 전 설치 안 함.
  - 단위 mock 가능: 헬퍼가 `vi.mock("@/lib/supabase-storage")`로 대체 가능한 named export 구조.
  - publicUrlToPath: `https://x.supabase.co/storage/v1/object/public/ootd-images/u1/abc.jpg` → `u1/abc.jpg` 추출.

- [ ] 2. [PR1] OOTD 3모델 Prisma 스키마 + User/Product 역관계 + Ask First 승인 `category:ultrabrain`
  **Goal**: `prisma/schema.prisma`에 `OOTDPost`/`OOTDLike`/`OOTDPostProduct` 3모델 + `User.ootdPosts`/`User.ootdLikes` + `Product.ootdTags` 역관계 추가. 사용자 승인 후 `npx prisma db push` + `npx prisma generate` 성공해 3모델 타입이 `@prisma/client`에 노출된다.
  **References**:
  - `prisma/schema.prisma:11-26` — `User` 모델. `recentTryOns RecentTryOn[]`(23행) 옆에 `ootdPosts OOTDPost[]` + `ootdLikes OOTDLike[]` 추가.
  - `prisma/schema.prisma:64-90` — `Product`. `recentTryOns`(86행) 옆에 `ootdTags OOTDPostProduct[]` 추가(명시 조인 역관계).
  - `prisma/schema.prisma:92-130` — `WishlistItem`/`CartItem`/`RecentTryOn` **작성 컨벤션**(id cuid·userId+user relation onDelete Cascade·`@@unique`·`@@index`). 그대로 복제.
  - 결정표 #2(imageUrls String[])·#3(명시 조인)·#4(좋아요 unique)·Metis.
  **스키마 (기본값)**:
  ```prisma
  model OOTDPost {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    imageUrls String[] @default([]) // Supabase Storage public URL 배열(슬라이드) — Product.images 패턴
    caption   String?
    createdAt DateTime @default(now())

    likes    OOTDLike[]
    products OOTDPostProduct[]

    @@index([createdAt]) // 피드 최신순 cursor 정렬 키
  }

  model OOTDLike {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    postId    String
    post      OOTDPost @relation(fields: [postId], references: [id], onDelete: Cascade)
    createdAt DateTime @default(now())

    @@unique([userId, postId]) // 한 유저가 한 게시물에 좋아요 1회(멱등)
    @@index([postId])          // _count.likes 집계 인덱스
  }

  model OOTDPostProduct {
    id        String   @id @default(cuid())
    postId    String
    post      OOTDPost @relation(fields: [postId], references: [id], onDelete: Cascade)
    productId String
    product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

    @@unique([postId, productId]) // 동일 게시물에 같은 상품 중복 태그 불가
    @@index([productId])
  }
  ```
  **Must NOT do**: 별도 `OOTDImage` 1:N 테이블 도입 금지(결정표 #2 — imageUrls String[]). Prisma 암묵 m:n 사용 금지(명시 조인 — 결정표 #3). 좋아요를 nullable 키로 두지 말 것(`@@unique` 동작 필수). 사용자 승인 없이 `db push` 금지(Ask First). `migrations/` 폴더 신규 생성 금지(현 dev 패턴은 `db push`). User/Product 기존 필드 수정 금지(역관계 줄만 추가 — surgical).
  **QA Scenarios**:
  - Happy: `prisma generate` 후 `npx tsc --noEmit` 통과, `import type { OOTDPost, OOTDLike, OOTDPostProduct } from "@prisma/client"` 해석됨.
  - 승인 게이트: schema diff 제시 → 승인 후에만 `db push`.
  - unique 동작: 동일 (userId, postId) 2회 OOTDLike insert 시 unique 위반. 동일 (postId, productId) 2회 태그 시 위반.
  - 역관계: `prisma.user.findUnique({ include: { ootdPosts: true, ootdLikes: true } })` 타입 해석. `prisma.product.findUnique({ include: { ootdTags: true } })` 해석.

- [ ] 3. [PR1] OOTD API 계약 타입 정의 `category:quick`
  **Goal**: `types/index.ts`에 OOTD API 계약 타입(게시 요청 메타·피드 응답 항목·좋아요 응답)을 추가하고, 미사용이 될 목업 `OOTD` 인터페이스(56-64) 제거 시점을 PR3로 표시(여기선 신규 타입만 추가, 제거는 목업 페이지 교체 시).
  **References**:
  - `types/index.ts:143-176` — `WishlistGetData`/`CartGetData`/`ApiResponse<T>` 기존 계약 타입 패턴. 동일 스타일.
  - `types/index.ts:6-25` — `Product`(피드 항목의 태그 상품 재조립 형태).
  - `app/api/wishlist/route.ts:23-24` — `{ success, data }` 응답 형태.
  **추가 타입(예)**:
  ```ts
  // OOTD 피드 항목(GET /api/ootd) — 서버가 재조립해 반환
  export interface OOTDFeedItem {
    id: string;
    imageUrls: string[];
    caption: string | null;
    createdAt: string;
    author: { id: string; name: string; avatar: string | null };
    products: Pick<Product, "id" | "name" | "brand" | "imageUrl">[]; // 태그 상품(SHOP 링크용)
    likeCount: number;
    isLiked: boolean; // 현재 로그인 유저 기준
  }
  export interface OOTDFeedData {
    items: OOTDFeedItem[];
    nextCursor: string | null; // cursor pagination(없으면 마지막)
  }
  // 게시 요청은 multipart/form-data(파일) — JSON 메타는 caption·productIds만
  // (파일은 FormData files, 본 타입은 비파일 메타 참고용)
  export interface OOTDCreateMeta {
    caption?: string;
    productIds: string[];
  }
  // 좋아요 토글 응답
  export type OOTDLikeData = { postId: string; liked: boolean; likeCount: number };
  ```
  **Must NOT do**: 응답 래퍼 표준(`{success,...}`) 변경 금지. 로직/함수 추가 금지(순수 타입만). 목업 `OOTD` 인터페이스를 여기서 제거 금지(PR3 페이지 교체와 함께 제거 — 미사용 orphan 발생 방지).
  **QA Scenarios**:
  - Happy: `npx tsc --noEmit` 통과.
  - Negative: 라우트/UI가 이 타입으로 import해도 순환 의존 없음(타입만).

- [ ] 4. [PR1] next.config remotePatterns + .env.example + ADR-007 작성 `category:writing`
  **Goal**: `next.config.ts`에 Supabase Storage 호스트 추가(승인 후), `.env.example`에 신규 env 키 이름 추가(값 없이), `docs/adr/adr-007-supabase-storage.md` 작성(ADR-005 Storage 보류를 OOTD가 선행 도입한 결정 기록).
  **References**:
  - `next.config.ts:4-19` — `images.remotePatterns` 3호스트. 4번째로 Supabase 추가.
  - `docs/adr/adr-005-product-model.md:32-37,66-73` — "결정 2: 이미지 저장 방식 = 외부 URL, Supabase Storage **보류**" 부분. ADR-007이 이 보류를 OOTD에서 선행 도입한다고 명시 연결.
  - `docs/adr/adr-005-product-model.md` 전체 — ADR 문서 포맷(Status/Date/Context/Options Considered/Decision/Consequences) 복제.
  **next.config diff(승인 항목)**:
  ```ts
  // images.remotePatterns 배열에 추가
  {
    protocol: "https",
    hostname: "<project-ref>.supabase.co", // SUPABASE_URL 호스트(사용자 프로젝트 ref)
    pathname: "/storage/v1/object/public/**",
  },
  ```
  - 호스트는 사용자 `SUPABASE_URL` 호스트와 일치해야 함(사전작업 키 확보 후 정확한 ref 반영).
  **.env.example 추가(값 없이)**:
  ```
  SUPABASE_URL=
  SUPABASE_SERVICE_ROLE_KEY=
  ```
  **ADR-007 핵심 내용**: Status=Accepted(`feat/ootd-storage-schema`), Date=작업일 / Context=OOTD UGC 업로드는 외부 URL 불가→자체 Storage 필요, ADR-005가 보류한 Storage를 본 트랙이 선행 도입 / Options=(public vs private+signed URL / 서버 service_role vs 클라 anon) → public 버킷 + 서버 service_role 단일 경로 채택(결정표 #1·#8 사유) / Decision=버킷 "ootd-images" public, 서버 업로드만, `import "server-only"` 강제, 고아 파일 보상 삭제 / Consequences=클라 키 유출 방지·고아 파일 보상 책임·향후 관리자 상품 이미지 재사용·RLS 세밀정책 범위 외, ADR-005와의 관계(보류 해제).
  **Must NOT do**: `.env.example`에 실제 키 **값** 기입 금지(이름만). next.config 변경을 승인 없이 적용 금지(Ask First). ADR-005 본문 수정 금지(ADR-007에서 "ADR-005 보류를 선행 도입"으로 연결만 — surgical). 다른 remotePatterns 호스트 제거/수정 금지.
  **QA Scenarios**:
  - Happy: `next.config.ts`에 Supabase 호스트 추가 후 dev 기동 시 설정 에러 없음.
  - 문서: `docs/adr/adr-007-supabase-storage.md` 존재, ADR-005와 상호 참조.
  - env: `.env.example`에 2개 키 이름만(값 빈칸), `.env.local`은 git에 안 올라감(`git status` 확인).
  - 승인 게이트: next.config diff 제시 → 승인 후 적용.

### PR1 Wave 2 (Wave 1 완료 후)

> PR1은 Wave 1의 4개 태스크가 사실상 독립(스키마/헬퍼/타입/문서)이라 별도 Wave 2 구현 태스크 없음. Wave 1 산출물을 모아 Final Verification으로 직행.

(PR1 Wave 2 없음 — Wave 1 → Final Verification)

### PR1 Final Verification Wave

- [ ] F1. [PR1] generate·tsc·lint 그린 + server-only 격리 확인
  **검증 단계**: 의존성 승인·설치 → `npx prisma generate`(OOTD 3모델 타입 생성) → `npx tsc --noEmit`(exit 0) → `npm run lint`(exit 0) → `npm run test`(기존 wishlist/cart/orders/auth/try-on 회귀 그린) → `lib/supabase-storage.ts` 1행 `import "server-only"` 확인 + 클라 컴포넌트의 해당 모듈 import 0건(grep `supabase-storage` in `components/`, `app/**/page.tsx`) → `git status`로 `.env.local` 미추적 확인. 기대결과: 전부 통과, OOTD 타입 노출, 보안 경계 확인.

---

## PR2 — 업로드 + 게시 API + 피드 GET (`feat/ootd-api`, PR1 머지 후)

### TODOs

### PR2 Wave 1 (병렬 — 라우트 4개 독립 구현)

- [ ] 5. [PR2] `POST /api/ootd` — 업로드 + MIME/크기 검증 + Storage↔DB 보상 + 태그 생성 `category:ultrabrain`
  **Goal**: `app/api/ootd/route.ts`에 POST 신규(GET은 Task 6과 동일 파일). `auth()` 401 게이트 → multipart/form-data 파일 수신 → 서버 MIME 화이트리스트·크기·장수 검증 → `lib/supabase-storage.uploadOOTDImage`로 여러 장 업로드 → productIds FK 선검증(`getProductById`) → `OOTDPost` + `OOTDPostProduct` 생성. **업로드 성공 후 DB 생성 실패 시 업로드한 모든 파일 보상 삭제.**
  **References**:
  - `app/api/wishlist/route.ts:37-67` — `auth()` 401(40-45) + `session.user.id`(46) + `product.findUnique` FK 선검증(58-67) + try-catch 최상위(90-96)+`extractErrorMessage`. **복제.**
  - `lib/products.ts:51-54` — `getProductById`(태그 productId 선검증, 없으면 400).
  - `lib/supabase-storage.ts`(PR1 Task 1) — `uploadOOTDImage`/`removeOOTDImagesByUrl`.
  - Task 3 타입(`OOTDCreateMeta`)·결정표 #1·#7·#9·Metis hidden complexity #2·#3·#5.
  **구현 메모**:
  - `const form = await req.formData();` → `form.getAll("images")`(File[]) + `form.get("caption")` + `form.getAll("productIds")`.
  - **검증(Zero Trust, Storage 호출 전)**: 장수 1~5 / 각 File `type` ∈ `["image/jpeg","image/png","image/webp"]` / `size` ≤ 5*1024*1024. 위반 시 즉시 400(Storage 미호출). ext는 contentType에서 매핑(jpeg→jpg 등).
  - 업로드: 각 File `arrayBuffer()` → `uploadOOTDImage(userId, {...})`. 업로드된 `{path, publicUrl}`를 배열에 수집(보상 대비).
  - 태그: `productIds`(중복 제거) 각각 `getProductById`로 존재 확인 — 하나라도 없으면 **업로드분 보상 삭제 후** 400. (정책: 일부만 유효 시 전체 거부가 단순·안전.)
  - DB 생성: `prisma.oOTDPost.create({ data: { userId, imageUrls: publicUrls, caption, products: { create: productIds.map(productId => ({ productId })) } } })`. **이 create를 try로 감싸 실패 시 `removeOOTDImagesByUrl(publicUrls)` 보상 삭제 후 re-throw(최상위 catch가 500).**
  - 응답: `{ success: true, data: { id } }`.
  **Must NOT do**: 클라 검증만 신뢰 금지(서버 검증이 정본). Storage 업로드를 검증 **전에** 호출 금지. DB 실패 시 업로드 파일 방치 금지(보상 삭제 필수). 요청 body userId 신뢰 금지(`session.user.id`만). try-catch 핸들러 최상위 외 중첩 금지(보상 삭제는 내부 try→re-throw 패턴). 가짜 user 금지. `data/dummy.ts` import 금지.
  **QA Scenarios**:
  - Happy: 로그인 + jpeg 2장 + caption + productIds["1"] → 200 `{success:true,data:{id}}`, Storage에 2파일·DB에 post(imageUrls 2개)+태그 1행.
  - Negative(401): `auth()` null → 401, Storage·DB 미접근.
  - Negative(MIME): `image/gif` 포함 → 400, Storage 미호출.
  - Negative(크기): 6MB 파일 → 400, Storage 미호출.
  - Negative(장수): 6장 → 400 / 0장 → 400.
  - Negative(태그): 없는 productId "999" → 업로드분 보상 삭제(`removeOOTDImagesByUrl` 호출) 후 400.
  - 보상(핵심): 업로드 성공 후 `prisma.oOTDPost.create` reject → 업로드된 모든 publicUrl이 `removeOOTDImagesByUrl` 인자에 포함, 응답 500.

- [ ] 6. [PR2] `GET /api/ootd` — cursor 피드(최신순·_count.likes·태그·작성자·isLiked) `category:ultrabrain`
  **Goal**: `app/api/ootd/route.ts`에 GET 신규(POST와 동일 파일). `auth()` 401 게이트(isLiked 계산 위해 로그인 필수) → cursor pagination 최신순 → 각 항목에 `_count.likes`·작성자·태그 상품 include·현재 유저 `isLiked` → `OOTDFeedData` 반환.
  **References**:
  - `app/api/wishlist/route.ts:8-34` — GET `auth()` 게이트 + `session.user.id` + `{success,data}` 형태.
  - `prisma/schema.prisma`(PR1 Task 2) — `OOTDPost`/`likes`/`products` 관계, `@@index([createdAt])`.
  - Task 3 타입(`OOTDFeedItem`/`OOTDFeedData`)·결정표 #6(cursor).
  **구현 메모**:
  - 쿼리: `take`(예 12) + `cursor`(URL `?cursor=<id>`), `orderBy: { createdAt: "desc" }`. cursor 있으면 `cursor:{id:cursor}, skip:1`.
  - include: `user`(작성자 name·avatar) + `products: { include: { product: true } }` + `_count: { select: { likes: true } }`.
  - `isLiked`: 별도 `prisma.oOTDLike.findMany({ where:{ userId, postId:{ in: pageIds } }, select:{ postId:true } })` → Set으로 매핑(N+1 회피). 또는 `likes: { where: { userId }, select: { id: true } }` include로 항목당 0/1 판정.
  - 응답 매핑: `OOTDFeedItem`(author·products는 `Pick<Product,...>`로 축소·createdAt ISO 문자열). `nextCursor` = 마지막 항목 id(`take`만큼 왔으면) else null.
  **Must NOT do**: offset pagination 금지(결정표 #6 — 중복/누락). N+1 쿼리 금지(isLiked는 단일 쿼리/include로). 요청 userId 신뢰 금지. 태그 상품 전체 객체 노출 대신 `Pick`으로 축소(과다 전송 방지). try-catch 최상위 외 중첩 금지.
  **QA Scenarios**:
  - Happy: 게시물 3개 존재 → 200 `data.items` 3개 최신순, 각 `likeCount`·`author.name`·`products[].id` 채워짐.
  - isLiked: 본인이 좋아요한 post는 `isLiked:true`, 아닌 건 `false`.
  - cursor: `take:2`로 2개 + `nextCursor` → `?cursor=<nextCursor>`로 다음 페이지 나머지, 중복 없음.
  - Negative(401): `auth()` null → 401.
  - 빈 피드: 게시물 0개 → `data.items:[]`, `nextCursor:null`.

- [ ] 7. [PR2] `POST /api/ootd/[id]/like` — 멱등 좋아요 토글 `category:ultrabrain`
  **Goal**: `app/api/ootd/[id]/like/route.ts` 신규. `auth()` 401 게이트 → post 존재 확인(404) → `OOTDLike` 멱등 토글(있으면 delete=liked:false, 없으면 `createMany skipDuplicates`=liked:true) → 현재 likeCount 재집계 → `{ postId, liked, likeCount }`.
  **References**:
  - `app/api/wishlist/route.ts:37-97` — **멱등 토글 정본 전체 복제**(productId→postId, wishlistItem→oOTDLike). `createMany skipDuplicates`(82-89)·존재 시 `delete`(73-79).
  - Task 3 타입(`OOTDLikeData`)·결정표 #4·Metis hidden complexity #4(경쟁).
  **구현 메모**:
  - dynamic param: `{ params }: { params: Promise<{ id: string }> }` → `const { id: postId } = await params;`(Next.js 15 async params).
  - post 존재: `prisma.oOTDPost.findUnique({ where:{ id: postId }, select:{ id:true } })` 없으면 404.
  - 토글: `findUnique({ where:{ userId_postId:{ userId, postId } } })` 있으면 `delete`(liked:false) 없으면 `createMany({ data:[{userId,postId}], skipDuplicates:true })`(liked:true).
  - likeCount: `prisma.oOTDLike.count({ where:{ postId } })`.
  - 응답: `{ success:true, data:{ postId, liked, likeCount } }`.
  **Must NOT do**: POST/DELETE 분리 금지(멱등 단일 — 결정표 #4). 요청 userId 신뢰 금지. 없는 post에 좋아요 생성 금지(404). try-catch 최상위 외 중첩 금지.
  **QA Scenarios**:
  - Happy(on): 로그인 + 첫 좋아요 → 200 `{liked:true, likeCount:1}`, `createMany skipDuplicates` 호출.
  - Happy(off): 같은 post 재호출 → `{liked:false, likeCount:0}`, `delete` 호출.
  - Negative(401): `auth()` null → 401, DB 미접근.
  - Negative(404): 없는 postId → 404.
  - Edge(멱등): 동시 2건 중 1건 skipDuplicates 흡수 → `liked:true`로 수렴, 중복 행 없음.

- [ ] 8. [PR2] `DELETE /api/ootd/[id]` — 본인만 삭제 + Storage 동기 삭제 `category:ultrabrain`
  **Goal**: `app/api/ootd/[id]/route.ts` 신규. `auth()` 401 게이트 → post 조회(없으면 404) → 소유자 검증(타인이면 403) → DB 삭제(Cascade로 likes·태그 자동 삭제) → `removeOOTDImagesByUrl(imageUrls)`로 Storage 파일 동기 삭제(고아 파일 방지).
  **References**:
  - `app/api/wishlist/route.ts:37-45,90-96` — `auth()` 401 + try-catch 최상위+`extractErrorMessage`.
  - `lib/supabase-storage.ts`(PR1 Task 1) — `removeOOTDImagesByUrl`.
  - 결정표 #7·Metis hidden complexity #2.
  **구현 메모**:
  - async params: `const { id } = await params;`.
  - 조회: `prisma.oOTDPost.findUnique({ where:{ id }, select:{ id:true, userId:true, imageUrls:true } })`. 없으면 404.
  - 소유자: `post.userId !== session.user.id` → 403 `{success:false,error:"본인 게시물만 삭제할 수 있습니다."}`.
  - 삭제 순서: `prisma.oOTDPost.delete({ where:{ id } })`(DB 먼저 — Cascade로 likes/태그 정리) → 성공 후 `await removeOOTDImagesByUrl(post.imageUrls)`(Storage). Storage 삭제 실패는 `console.warn`만(DB는 이미 삭제 — 고아 파일은 다음 운영 정리 대상, 응답은 성공 유지하되 로그 남김).
  - 응답: `{ success:true, data:{ id } }`.
  **Must NOT do**: 타인 게시물 삭제 허용 금지(403). Storage만 지우고 DB 남기거나 그 반대 금지(DB 삭제 후 Storage). 요청 userId 신뢰 금지(`session.user.id`). try-catch 최상위 외 중첩 금지.
  **QA Scenarios**:
  - Happy: 본인 post DELETE → 200, `prisma.oOTDPost.delete` 호출 + `removeOOTDImagesByUrl(imageUrls)` 호출.
  - Negative(401): `auth()` null → 401.
  - Negative(403): 타인 게시물(`post.userId !== userId`) → 403, delete·Storage 미호출.
  - Negative(404): 없는 id → 404.
  - Cascade: 삭제 후 해당 post의 likes·태그 행이 DB에서 사라짐(onDelete Cascade).

### PR2 Wave 2

> PR2 Wave 2 없음 — Wave 1 라우트 4개(5·6·7·8)는 서로 독립이라 병렬, 완료 후 테스트(Wave 3)로 직행.

(PR2 Wave 2 없음)

### PR2 Wave 3 (테스트)

- [ ] 9. [PR2] OOTD 라우트 단위 테스트(prisma+storage mock·보상/검증/멱등/소유자) `category:ultrabrain`
  **Goal**: 신규 테스트 3파일 — `app/api/ootd/route.test.ts`(POST/GET), `app/api/ootd/[id]/like/route.test.ts`, `app/api/ootd/[id]/route.test.ts`(DELETE). wishlist 골격 복제 + `vi.mock("@/lib/supabase-storage")`로 업로드/삭제 mock. 보상·검증·멱등·소유자 케이스를 커버, `npm run test` 그린.
  **References**:
  - `app/api/wishlist/route.test.ts:1-115` — `vi.hoisted` mock fn 선언(4-12)→`vi.mock("@/auth")`/`vi.mock("@/lib/prisma")`(14-25)→라우트 import→`makeReq`(30-36). **골격 복제.**
  - Task 5·6·7·8 라우트.
  - storage mock: `vi.mock("@/lib/supabase-storage", () => ({ uploadOOTDImage: vi.fn(), removeOOTDImagesByUrl: vi.fn(), publicUrlToPath: vi.fn() }))`.
  - `getProductById` 사용 시 `vi.mock("@/lib/products", ...)`(태그 FK 선검증 mock).
  **Must NOT do**: 실 DB/실 Storage 접근 금지(단위는 전부 mock). 기존 wishlist/cart/orders 테스트 수정 금지. 테스트 통과를 위한 라우트 로직 약화 금지(검증·보상 그대로).
  **QA Scenarios**:
  - POST 401: `authMock→null` → 401, `uploadOOTDImage` 미호출.
  - POST MIME 거부: gif File → 400, `uploadOOTDImage` 미호출.
  - POST 보상(핵심): `uploadOOTDImage` 성공 mock + `oOTDPost.create` reject → `removeOOTDImagesByUrl`가 업로드 publicUrl 전부로 호출됨, 500.
  - POST 태그 없음: `getProductById→null` → `removeOOTDImagesByUrl` 호출(보상) + 400.
  - GET: `oOTDPost.findMany` mock → `data.items` 매핑·`isLiked` 계산 단언.
  - like 토글: `findUnique→null` → createMany + liked:true / `findUnique→{id}` → delete + liked:false / 없는 post → 404.
  - DELETE: 본인 → delete + `removeOOTDImagesByUrl(imageUrls)` / 타인 → 403(미호출) / 없음 → 404.
  - 실행: `npm run test app/api/ootd` exit 0.

### PR2 Final Verification Wave

- [ ] F2. [PR2] tsc·lint·test 그린(mock 기반, 키 불필요)
  **검증 단계**: `npx tsc --noEmit`(exit 0) → `npm run lint`(exit 0) → `npm run test`(신규 OOTD 단위 3파일 + 기존 전부 그린). 기대결과: 키 없이 mock으로 전부 통과. service_role 키 없이도 PR2 코드 검증 완료.

- [ ] F3. [PR2] 실 업로드 수동 검증 (사용자 사전작업 완료 후)
  **검증 단계**: 사용자 사전작업(버킷+키) 완료 확인 → `npm run dev` → 로그인 → `curl`/임시 폼 또는 PR3 폼 선행 사용으로 `POST /api/ootd`(jpeg 1~2장+productIds) 호출 → Supabase 대시보드 Storage "ootd-images"에 파일 생성 확인 + DB `OOTDPost.imageUrls`에 public URL 저장 확인 → `GET /api/ootd`로 방금 게시물 최신순 1번 + likeCount 0 + isLiked false 확인 → `POST /api/ootd/[id]/like` 토글 200 확인 → `DELETE /api/ootd/[id]`로 본인 삭제 후 Storage 파일·DB 행 사라짐 확인. 기대결과: end-to-end API 정상(이미지 실제 업로드·조회·삭제 동기).

---

## PR3 — UI 실연결 + 좋아요 + 삭제 (`feat/ootd-ui`, PR2 머지 후)

### TODOs

### PR3 Wave 1 (피드 렌더·빈 상태)

- [ ] 10. [PR3] what-to-wear 목업 제거 → 실 피드 GET 렌더 + 빈 상태 `category:visual-engineering`
  **Goal**: `app/what-to-wear/page.tsx`의 목업 `OOTDS`(11-18)와 목업 의존 마크업을 제거하고, `GET /api/ootd` 결과를 masonry 피드로 렌더. 게시물 0개면 "아직 게시물 없음" 빈 상태. 슬라이드(imageUrls 여러 장)·작성자·캡션·likeCount·SHOP 태그(상품 상세 링크) 표시. 목업 `OOTD` 타입(types/index.ts:56-64) 제거.
  **References**:
  - `app/what-to-wear/page.tsx:1,11-95` — `"use client"` 유지, 목업 배열·`ImageWrapper`(73-95) 골격. masonry(`columns-2 md:columns-3` 32행)·overlay(40-49)·avatar(53-59)·like 버튼(62-65) **레이아웃 재사용**하되 실 데이터로 교체.
  - Task 3 타입(`OOTDFeedItem`/`OOTDFeedData`).
  - `lib/products.ts`는 서버 전용 — 클라 페이지에서 직접 import 금지(피드는 `fetch("/api/ootd")`).
  - `next/link` — SHOP 태그 → `/products/[productId]` 링크(상품 상세 경로 확인 후 사용).
  **구현 메모**:
  - `useEffect`/`useState`로 `fetch("/api/ootd")` → `OOTDFeedData`. 로딩 중 Skeleton(`components/ui/Skeleton` 기존 사용 6행). 401(비로그인)이면 로그인 유도 또는 빈 상태 + 안내.
  - 빈 상태: items 0개 → 중앙 "아직 게시물 없음" + "Post My Look" 유도.
  - 슬라이드: `imageUrls` 여러 장이면 간단 캐러셀(첫 장만 + 인디케이터, 또는 가로 스크롤) — UI 최소.
  - SHOP 태그: `products[]` 있으면 첫 상품 → `<Link href={'/products/' + p.id}>SHOP</Link>`(상품 상세 라우트 확인).
  - 작성자: `author.name`/`author.avatar`(avatar null이면 dicebear fallback — 기존 56행 패턴).
  **Must NOT do**: 목업 `OOTDS`/목업 `OOTD` 타입 잔존 금지(완전 제거 — orphan 방지). 서버 전용 `lib/products`/`lib/supabase-storage`를 클라 페이지에서 import 금지. 디자인 시스템 무시한 새 색/폰트 도입 금지(기존 masonry 톤 유지). 무한스크롤 자동화 금지(범위 외 — "더 보기" 버튼까지만 허용).
  **QA Scenarios**:
  - Happy: 게시물 존재 시 masonry로 최신순 렌더, 첫 이미지·작성자·likeCount·SHOP 표시.
  - 빈 상태: 게시물 0개 → "아직 게시물 없음" 안내.
  - SHOP: 태그 클릭 → 해당 상품 상세로 이동.
  - 이미지 렌더: 업로드 이미지가 `next/image`로 정상 표시(remotePatterns 등록 덕분).
  - tsc/lint: `npx tsc --noEmit`·`npm run lint` 그린, 목업 타입 제거로 인한 미사용 import 정리.

### PR3 Wave 2 (업로드 폼·좋아요·삭제·SHOP)

- [ ] 11. [PR3] "Post My Look" 업로드 폼 + 좋아요 낙관적 토글 + 본인 삭제 `category:visual-engineering`
  **Goal**: 헤더 "Post My Look" 버튼에 업로드 폼(다중 파일 선택 + 캡션 + 상품 다중 선택) → `POST /api/ootd`(multipart) → 성공 시 피드 갱신. 각 게시물 좋아요 버튼은 낙관적 토글 + `POST /api/ootd/[id]/like`(fire-and-forget·실패 롤백). 본인 게시물엔 삭제 버튼 → `DELETE /api/ootd/[id]` 확인 후 피드에서 제거.
  **References**:
  - `app/what-to-wear/page.tsx:26-28` — "Post My Look" 버튼(폼 토글 대상). Task 10에서 만든 피드 컴포넌트에 통합.
  - `components/common/HeartButton.tsx:23-51` — **낙관적 토글 + fire-and-forget POST + 실패 console.warn 롤백 + 비로그인 confirm→/login 게이트** 패턴 복제(productId→postId·`/api/ootd/[id]/like`). 단, OOTD 좋아요는 전역 store 미사용(결정표 #5) — 로컬 state(likeCount·isLiked)로 낙관적 반영.
  - Task 3 타입(`OOTDCreateMeta`/`OOTDLikeData`)·결정표 #5·#9(클라 검증은 UX 보조).
  - 상품 선택 옵션: `fetch`로 상품 목록(기존 카탈로그 GET이 있으면 사용, 없으면 간단 productId 입력 — 상품 목록 API 경로 확인). 클라에서 `lib/products` 직접 import 금지(서버 전용).
  **구현 메모**:
  - 폼: `<input type="file" multiple accept="image/jpeg,image/png,image/webp">`(클라 1차 검증·UX), caption `<textarea>`, 상품 다중 선택(체크박스/멀티셀렉트). 제출 시 `FormData`에 `images`(여러), `caption`, `productIds`(여러) append → `fetch("/api/ootd",{method:"POST",body:formData})`. 성공 시 피드 refetch 또는 응답 항목 prepend.
  - 좋아요: 클릭 시 비로그인 confirm→/login. 로그인 시 `isLiked`/`likeCount` 즉시 낙관적 토글 → `POST /api/ootd/[id]/like` → 실패 시 원복+`console.warn`.
  - 삭제: 본인 게시물(`author.id === session.user.id`)에만 삭제 아이콘 → `confirm("삭제하시겠습니까?")` → `DELETE` → 성공 시 피드에서 해당 항목 제거.
  - SHOP 링크는 Task 10에서 처리(여기선 좋아요/삭제/폼).
  **Must NOT do**: 업로드 중 UI 완전 블로킹 금지(로딩 인디케이터 + 낙관적). 좋아요를 전역 store에 편입 금지(결정표 #5 — 로컬 state). 타인 게시물에 삭제 버튼 노출 금지. 서버 전용 모듈 클라 import 금지. alert 남용 금지(삭제 confirm은 허용, 좋아요 실패는 조용한 롤백). 클라 검증만 믿고 서버 검증 우회 가정 금지(서버가 정본).
  **QA Scenarios**:
  - 업로드 Happy: 사진 2장+캡션+상품 선택 후 제출 → 피드 최상단에 새 게시물(슬라이드) 표시.
  - 업로드 검증: 6MB/gif 선택 시 클라 안내(또는 서버 400 메시지 표시) — 게시 안 됨.
  - 좋아요 낙관적: 클릭 → 하트·likeCount 즉시 +1 → POST 200 유지 / POST 실패 → 원복+경고.
  - 좋아요 비로그인: confirm→/login(서버 미호출).
  - 삭제 본인: 본인 게시물 삭제 아이콘 → confirm → 200 → 피드에서 제거 + Storage 파일 삭제(F5에서 확인).
  - 삭제 타인: 타인 게시물엔 삭제 버튼 없음(시도해도 서버 403).

### PR3 Final Verification Wave

- [ ] F4. [PR3] tsc·lint·test 그린 + 목업 제거 회귀
  **검증 단계**: `npx tsc --noEmit`(exit 0) → `npm run lint`(exit 0) → `npm run test`(전체 그린) → 목업 `OOTDS`/`OOTD` 타입 잔존 0건(grep `OOTDS`/목업 OOTD 인터페이스) → 미사용 import 없음. 기대결과: 전부 통과, 목업 완전 제거.

- [ ] F5. [PR3] OOTD end-to-end 수동 검증 (게시→피드→좋아요→SHOP→삭제)
  **검증 단계**: `npm run dev` → 로그인 → "Post My Look"으로 사진 2장+캡션+상품 태그 게시 → 피드 최상단에 슬라이드 이미지·작성자·캡션 표시(이미지 정상 렌더=remotePatterns OK) → 좋아요 클릭 시 즉시 +1, 새로고침 후에도 likeCount·isLiked 유지 → 다른 브라우저(다른 계정) 로그인 시 같은 게시물 보이고 좋아요 가능 → SHOP 태그 클릭 시 상품 상세로 이동 → 본인 게시물 삭제 → 피드에서 사라지고 Supabase Storage "ootd-images"에서 해당 파일도 사라짐(고아 없음) → 비로그인 시 게시·좋아요 차단(confirm→/login) → 게시물 0개일 때 "아직 게시물 없음". 기대결과: 모든 항목 충족.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 (storage 헬퍼+의존성 승인) | None | server-only Storage 래퍼 — API가 사용 |
| 2 (스키마+승인) | None | 모든 API 전제 |
| 3 (API 계약 타입) | None | 라우트·UI 공유 |
| 4 (next.config+env.example+ADR-007) | None | 렌더·문서 |
| F1 (PR1 검증) | 1,2,3,4 | generate·tsc·lint·보안 경계 |
| 5 (POST /api/ootd) | 1,2,3 (PR1 머지) | storage 헬퍼+스키마+타입 |
| 6 (GET /api/ootd) | 2,3 (PR1 머지) | 스키마+타입(재조립·_count·isLiked) |
| 7 (POST like) | 2,3 (PR1 머지) | 스키마+타입(멱등 토글) |
| 8 (DELETE) | 1,2 (PR1 머지) | 소유자 검증+Storage 동기 삭제 |
| 9 (단위 테스트) | 5,6,7,8 | 라우트 후 mock 테스트 |
| F2 (PR2 mock 검증) | 5,6,7,8,9 | tsc·lint·test(키 불필요) |
| F3 (PR2 실 업로드 수동) | F2 + 사용자 사전작업 | 실 Storage 검증(키 필요) |
| 10 (피드 UI 렌더+빈 상태) | 6 (PR2 머지) | GET 계약 필요 |
| 11 (업로드 폼+좋아요+삭제) | 5,7,8,10 | 모든 API + 피드 골격 |
| F4 (PR3 검증) | 10,11 | tsc·lint·test·목업 제거 |
| F5 (PR3 e2e 수동) | F4 + 사용자 사전작업 | 게시→피드→좋아요→삭제 |

## Parallel Execution Graph

```
PR1 (`feat/ootd-storage-schema`, 키 불필요):
Wave 1 (병렬): Task 1(storage 헬퍼+의존성 승인) ∥ Task 2(스키마+승인) ∥ Task 3(타입) ∥ Task 4(next.config+env.example+ADR-007)
Final:         F1 (generate·tsc·lint·server-only grep)

PR2 (`feat/ootd-api`, PR1 머지 후):
Wave 1 (병렬): Task 5(POST) ∥ Task 6(GET) ∥ Task 7(like) ∥ Task 8(DELETE)
Wave 3:        Task 9(단위 테스트 3파일)
Final:         F2 (mock 검증, 키 불필요) → F3 (실 업로드 수동, 사용자 사전작업 후)

PR3 (`feat/ootd-ui`, PR2 머지 후):
Wave 1:        Task 10(피드 UI 렌더+빈 상태)
Wave 2:        Task 11(업로드 폼+좋아요+삭제)
Final:         F4 (tsc·lint·test·목업 제거) → F5 (e2e 수동)

Critical Path: 2 → 5 →(머지)→ 6/7/8 → 9 →(머지)→ 10 → 11 → F4 → F5
```

## Category 배분

| Task | Category | Category Reason |
|------|----------|----------------|
| 1 | ultrabrain | server-only 보안 경계 + Storage upload/delete/getPublicUrl + URL↔path 변환 |
| 2 | ultrabrain | 3모델 스키마 설계(조인 m:n·imageUrls·좋아요 unique) + FK 정책 |
| 3 | quick | 타입 선언만(로직 없음) |
| 4 | writing | next.config diff + .env.example + ADR-007 문서 |
| 5 | ultrabrain | 업로드+MIME/크기 검증+Storage↔DB 보상+태그 FK 선검증 |
| 6 | ultrabrain | cursor pagination + _count + isLiked(N+1 회피) + 상품 재조립 |
| 7 | ultrabrain | 멱등 좋아요 토글(경쟁 안전) |
| 8 | ultrabrain | 소유자 검증 + Storage 동기 삭제 |
| 9 | ultrabrain | prisma+storage mock 다중 케이스(보상/검증/멱등/소유자) |
| 10 | visual-engineering | 피드 masonry UI + 빈 상태 + SHOP 링크 |
| 11 | visual-engineering | 업로드 폼(다중 파일·상품 선택)·좋아요 낙관적·삭제 |

## Test Strategy (ADR-003)

- **단위(주력)**: `vi.hoisted` + `vi.mock("@/auth")` + `vi.mock("@/lib/prisma")` + `vi.mock("@/lib/supabase-storage")`(+필요 시 `vi.mock("@/lib/products")`) — `app/api/wishlist/route.test.ts:1-115` 골격 복제. 신규: `app/api/ootd/route.test.ts`, `app/api/ootd/[id]/like/route.test.ts`, `app/api/ootd/[id]/route.test.ts`.
  - POST `/api/ootd`: 401 게이트 / MIME 비허용 400(Storage 미호출) / 크기 초과 400 / 장수 초과·0장 400 / 정상 업로드→post+태그 생성 / **DB create 실패 시 업로드 publicUrl 전부 `removeOOTDImagesByUrl` 호출(보상)** / 태그 productId 미존재 시 보상 삭제 후 400.
  - GET `/api/ootd`: 401 게이트 / cursor 적용·nextCursor / `_count.likes` 반영 / 작성자·태그 상품 include·`Pick` 축소 / `isLiked` 본인 기준(N+1 없음) / 빈 피드.
  - POST `[id]/like`: 401 / 없는 post 404 / toggle on(createMany skipDuplicates)·off(delete) 멱등 / likeCount 재집계 / `session.user.id`만 신뢰.
  - DELETE `[id]`: 401 / 타인 게시물 403(미호출) / 본인 게시물 DB 삭제 후 `removeOOTDImagesByUrl(imageUrls)` 호출 / 없는 id 404.
- **통합(선택, ADR-003)**: 시간 허용 시 `app/api/ootd/route.integration.test.ts` — 실 Postgres에 post 생성→GET 왕복(Storage는 mock 유지, 실 업로드는 F3/F5 수동 검증으로 대체). 로컬 pgbouncer(42P05) 실패는 선례대로 허용, CI 그린 기준.
- UI는 단위 테스트 신규 도입하지 않음(기존 페이지 컴포넌트 테스트 부재 — 패턴 일관). 검증은 F5 e2e 수동.

## Success Criteria

- [ ] 로그인 사용자가 사진 여러 장 + 캡션 + 상품 태그로 게시하면, 피드 최신순 맨 앞에 슬라이드 이미지로 나타난다.
- [ ] 이미지는 Supabase Storage "ootd-images" public 버킷에 저장되고, DB엔 public URL이 저장되며, `next/image`로 정상 렌더된다(remotePatterns 등록 확인).
- [ ] 게시물 좋아요를 누르면 즉시(낙관적) 반영되고, 새로고침·다른 기기에서도 좋아요 수·내 좋아요 상태가 유지된다(멱등 — 연타에도 중복 없음).
- [ ] SHOP 태그를 누르면 태그된 상품 상세 페이지로 이동한다.
- [ ] 본인 게시물만 삭제 가능하며, 삭제 시 DB 행과 Storage 이미지 파일이 함께 사라진다(고아 파일 없음).
- [ ] 비로그인 사용자는 게시·좋아요·삭제가 차단되고(auth 게이트), 빈 피드일 때 "아직 게시물 없음" 안내가 보인다.
- [ ] service_role 키는 서버에서만 사용되고(클라 번들·git에 없음), `import "server-only"`로 강제된다.
- [ ] 비허용 파일(MIME·크기·장수)은 서버에서 400으로 거부되고 Storage에 올라가지 않는다.
- [ ] `npx tsc --noEmit`·`npm run lint`·`npm run test`(신규 OOTD 단위 테스트 포함) 그린.
- [ ] 스키마 변경(`db push`)·의존성·next.config·env는 사용자 승인 후에만 적용되었다.

## Risks / Rollback

| 리스크 | 영향 | 완화 / 롤백 |
|--------|------|------------|
| service_role 키 클라 유출 | 치명(전권 키 노출) | `import "server-only"` 강제(Task 1) + 클라 import 0건 grep(F1) + `.env*` commit 금지 |
| Storage 업로드 성공 후 DB 실패 → 고아 파일 | Storage 비용·부채 | 업로드 publicUrl 수집 후 DB 실패 시 일괄 보상 삭제(Task 5, 단위 테스트로 단언) |
| 게시물 삭제 시 Storage 파일 잔존 | 고아 파일 누적 | DB 삭제 후 `removeOOTDImagesByUrl(imageUrls)` 동기 호출(Task 8 verify) |
| remotePatterns 미등록 | 업로드 이미지 렌더 거부 | Task 4에서 Supabase 호스트 등록 + F5 렌더 확인 |
| 비허용 파일 업로드 | 악성/대용량 | 서버 MIME 화이트리스트+크기·장수 상한(Zero Trust, Task 5) |
| `db push`가 기존 데이터 영향 | 낮음(테이블 신규 추가만) | 추가 전용. 문제 시 OOTD 3테이블 drop으로 원복(기존 기능 무영향) |
| Prisma 암묵 m:n 선택 시 확장 막힘 | 향후 마이그레이션 | 명시 조인 `OOTDPostProduct` 채택(결정표 #3) |
| OOTD 좋아요를 store에 넣어 StoreSync 복잡화 | 회귀 위험 | 전역 store 미편입(결정표 #5) — 컴포넌트 로컬 낙관적 토글만, StoreSync 미변경 |
| 키 미확보 상태로 PR2 실 업로드 진행 | 검증 불가 | PR1·PR2 코드/단위는 키 없이, 실 업로드(F3/F5)는 사용자 사전작업 완료 게이트 |
| GET isLiked N+1 쿼리 | 피드 성능 저하 | 단일 쿼리/include로 일괄 계산(Task 6) |

## Out of Scope (재확인 — 본 plan에서 만들지 않음)

댓글 · 팔로우 · 해시태그/검색 · 내 게시물 관리 전용 페이지 · 자동 무한스크롤(cursor API만, UI는 "더 보기"까지) · 이미지 리사이즈/썸네일/EXIF · 게시물 수정(생성·삭제만) · Storage RLS 세밀 정책(서버 service_role 단일 경로+서버 검증으로 충분) · 비로그인 게시/좋아요.
