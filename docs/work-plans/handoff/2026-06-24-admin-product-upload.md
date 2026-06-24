# Handoff — 관리자 상품 등록 + 이미지 업로드 (다음 작업)

> 작성 시점 커밋 기준일: 2026-06-24. 작업 디렉터리: `e:\kamwoo\6.Programing\Potata\potata` (루트 `app/`·`components/`·`lib/`·`prisma/` — **`src/` 없음**. 옆 동명 `Potato\potato`(src/ 기반)와 혼동 금지).

---

## 1. 직전 세션 완료 요약

- **#34 CI 비용 절감** (머지): `package-lock.json`을 npm 11.3.0+로 재생성해 전 플랫폼 optional 네이티브 바인딩 포함(npm bug #4828 수정본) → ci.yml의 `rm lock && npm install` 우회책을 **`npm ci` + npm 캐시**로 전환. `push:main` 트리거 제거(PR 머지 시 중복 실행 제거). `concurrency: cancel-in-progress` + `timeout-minutes:15` 추가. CI green 실증.
- **#33 OOTD 상품 태그 피커** (머지): 검색 + 최근 구매 섹션 + 썸네일 그리드 + 선택 칩. `components/ootd/ProductTagPicker.tsx`.
- 로드맵(`roadmap.md`)을 #24~#34 반영으로 정정, 완료 plan 3개(ootd-feed / auth-google-oauth / persist-cart-wishlist) → `archive/` 이관.

---

## 2. 다음 작업: 관리자 상품 등록 + 이미지 업로드

### 경위 (왜 이 트랙인가)
- ADR-007에서 도입한 Supabase Storage 인프라를 **재사용**(ADR-007이 "향후 관리자 상품 이미지 업로드의 토대"로 명시).
- 현재 카탈로그는 seed 상품(8개)뿐 → **실상품 등록 수단이 검색·리뷰·배포의 상류**(선행 조건).
- 배포(Vercel 실유저 가동)는 보여줄 실상품이 생긴 뒤가 의미 큼 → 그 전 단계.

### Objective
운영자가 보호된 UI에서 신상품을 등록(필수 필드 + 이미지 업로드)하고, 등록 즉시 카탈로그/상세에 노출되게 한다.

---

## 3. ⚠️ 선결 결정 3가지 (다음 세션 `/plan`에서 반드시 먼저 확정 — cross-check 실측 기반)

직전 세션 cross-check(grep)로 확인된, naive 구현이 충돌하는 지점. 코딩 전 ADR/결정 필요.

### 결정 1 — 상품 SSoT 충돌 (가장 중요)
- `product-detail` 스킬(`.claude/skills/product-detail/SKILL.md:16`)이 **`prisma/seed.ts` PRODUCTS를 상품 SSoT**로 확립: "직접 DB write 대신 seed.ts에 추가/갱신 → `db seed` upsert. seed.ts가 진실, DB는 파생물. DB 리셋/재시드해도 콘텐츠 보존."
- 그런데 **admin UI는 런타임에 `prisma.product.create`로 DB 직접 write** → admin 등록 상품은 seed.ts에 없음 → **재시드 시 소실**.
- **결정 필요**: (a) seed.ts SSoT를 "초기 부트스트랩 전용"으로 완화하고 admin/런타임 상품은 DB가 진실 (권장 후보 — 운영 UI의 본질) / (b) admin이 seed.ts에 써넣기(런타임 UI엔 부자연) / (c) 하이브리드. → **ADR-008 후보**.

### 결정 2 — admin 권한 게이트
- User 모델에 `role`/`isAdmin` **없음**(schema 실측). 모든 라우트가 `auth()` + `session.user.id`만 사용.
- **결정 필요**: (a) `User.role`(또는 `isAdmin Boolean`) 필드 추가 + admin 체크 (Ask First: schema 변경) / (b) env `ADMIN_EMAILS` allowlist로 코드 게이트(스키마 무변경, 단순). → 초보자/단일 운영자엔 (b) allowlist가 단순할 수 있음(plan에서 판단).

### 결정 3 — Storage 헬퍼 일반화
- `lib/supabase-storage.ts`는 OOTD 전용: `uploadOOTDImage`가 `BUCKET = "ootd-images"` 하드코딩, 경로 `${userId}/...`.
- **결정 필요**: (a) 상품 이미지용 별도 버킷(`product-images`) + 헬퍼 일반화(bucket 파라미터화) / (b) 동일 버킷 다른 prefix. REST 패턴(fetch, SDK 미사용·server-only)은 그대로 재사용.

---

## 4. 재사용 패턴 (신규 발명 금지 — 기존 차용)

| 필요 | 차용 원본 |
|------|-----------|
| 인증 게이트 + `{success,data\|error}` + `extractErrorMessage` | `app/api/wishlist/route.ts` (정본) |
| 이미지 서버 업로드 (REST·server-only·보상 삭제) | `lib/supabase-storage.ts` + ADR-007 |
| 단위 테스트 (prisma+storage mock, ADR-003) | `app/api/ootd/route.test.ts` |
| 상품 읽기 헬퍼 | `lib/products.ts` (`getAllProducts`/`getProductById` — 현재 read-only, create 추가 필요) |
| Product 필드 (폼 스코프) | `prisma/schema.prisma:66-93` (id 수동지정 String, price Int(AED), imageUrl, images[], category, sizes[], colors[] 등) |

---

## 5. 시작 절차 (다음 세션)

1. `session.md` "지금 작업" 확인 + 본 handoff 정독.
2. **프로젝트 코딩 workflow 준수**: `CLAUDE.md` Git Policy(100줄+ → `/plan` 선행 필수, feat 브랜치+PR+squash) + `~/.claude/rules/coding-workflow.md`(① plan → ② momus → ③ 실행 → ④ 2-Tier 검증 → ⑤ 보완). 본 트랙은 schema/Storage/보안(권한) 포함 → **Ask First**(schema·next.config·의존성) + **Tier 2 적대검증** 대상.
3. 현재 브랜치 `feat/admin-product-upload`(이미 생성됨, 최신 main 기반)에서 시작 — 또는 트랙 변경 시 새 브랜치.
4. `/plan`으로 **선결 결정 3가지부터 확정**(인터뷰) → ADR-008(SSoT) 초안 → PR 분할(스키마/권한 → API+Storage → admin UI) → 구현.
5. 검증: `npx tsc --noEmit` / `npm run lint` / `npm run test` (통합 테스트는 로컬 pgbouncer 42P05로 실패 가능 — CI에서 통과. 로컬 1회성 스크립트는 `DIRECT_URL` 사용).

---

## 6. 불변 가드레일 (CLAUDE.md)
- `.env*` commit 금지 / 클라에 시크릿 하드코딩 금지 / service_role 키 server-only.
- main 직접 commit 금지(hook 차단) — feat 브랜치 + PR + squash.
- `session.user.id`만 신뢰(요청 body userId 불신). try-catch는 라우트 핸들러 최상위만.
- 가짜 user 객체(`user-${Date.now()}`) 금지. `data/dummy.ts` 신규 의존 금지.
