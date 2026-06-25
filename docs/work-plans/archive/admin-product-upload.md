# Work Plan: 관리자 상품 등록 + 이미지 업로드 (3-PR)

> 상태: 선결 3결정 확정(인터뷰 완료, 2026-06-24). 실행 전 **사용자 사전작업(BLOCKER)**(`product-images` 버킷 생성 + `ADMIN_EMAILS` 설정)과 각 PR Wave 1의 Ask First 승인 TODO를 먼저 처리.
> 작업 디렉터리: `e:\kamwoo\6.Programing\Potata\potata` (패션 커머스, **`src/` 없는 루트** — `app/`, `components/`, `lib/`, `prisma/`). **옆 동명 프로젝트 `Potato\potato`(src/ 기반)와 혼동 절대 금지** — 절대경로로만 접근.
> 정본 schema(현재 머지됨): `User`/`Order`/`Product`/`VerificationCode`/`WishlistItem`/`CartItem`/`RecentTryOn`/`OOTDPost`/`OOTDLike`/`OOTDPostProduct`. **본 트랙은 스키마 변경 없음**(Product 모델이 이미 완비, 권한은 env allowlist).
> 검증 기준 시점: 현 브랜치 `feat/admin-product-upload` · `prisma/schema.prisma`(Product 66-93) · `lib/supabase-storage.ts`(BUCKET 하드코딩 14, upload 34-53, remove 59-72, publicUrlToPath 75-79) · `lib/products.ts`(toAppProduct 22-42, getAllProducts 45-48, getProductById 51-54) · `app/api/ootd/route.ts`(업로드+검증+보상 정본 18-97) · `app/api/wishlist/route.ts`(게이트+응답 정본) · `middleware.ts`(auth 래퍼+matcher) · `auth.ts`(session.user.id 61-66) · `lib/auth.ts`(extractErrorMessage 25-38, normalizeEmail 9-11) · `next.config.ts`(Supabase 호스트 18-23, public 패턴) · `types/index.ts`(Product 6-25, ApiResponse 183-188).

## Overview

- **Objective**: 운영자가 보호된 admin UI에서 신상품(필수 필드 + 이미지)을 등록하면, Supabase Storage(신규 `product-images` 버킷)에 이미지를 업로드하고 `Product` DB 행을 생성해 카탈로그(`/shop` 등)와 상세(`/product/[id]`)에 즉시 노출한다. ADR-007 Storage 인프라와 wishlist/ootd 라우트 패턴을 재사용한다.
- **선결 3결정 (확정 — ADR-008 + 결정표)**:
  1. **상품 SSoT** → **DB가 런타임 SSoT, seed.ts는 부트스트랩 전용**. admin 상품 id = `crypto.randomUUID()`. (ADR-008)
  2. **admin 권한** → **env `ADMIN_EMAILS` allowlist**(User 스키마 무변경). middleware + API 이중 게이트.
  3. **Storage** → **신규 `product-images` public 버킷 + `lib/supabase-storage.ts` bucket 파라미터화**(OOTD 래퍼 유지).
- **Branch / PR 분할** (3개 PR — 순차, 각 100줄+ → plan 의무). *원래 handoff의 "스키마/권한 → API+Storage → UI"를 결정2(allowlist=스키마 무변경)에 맞춰 "권한+헬퍼+ADR → Storage+API → UI"로 조정*:
  - **PR1 (권한 + 상품 헬퍼 + ADR)**: `feat/admin-product-upload`(현 브랜치) — 키 없이 선행 가능(코드/문서/mock 테스트). `lib/admin.ts`(isAdmin allowlist) + `middleware.ts` `/admin` 보호 + `lib/products.ts` `createProduct` 헬퍼 + ADR-008 + roadmap + `.env.example`.
  - **PR2 (Storage 일반화 + 등록 API)**: `feat/admin-product-api`(PR1 머지 후) — `lib/supabase-storage.ts` bucket 파라미터화 + `product-images` 헬퍼 + `POST /api/admin/products`(admin 게이트→필드/이미지 검증→업로드→create→보상 삭제). 단위테스트(mock)는 키 없이, **실 업로드 검증은 사용자 사전작업 후**.
  - **PR3 (admin UI)**: `feat/admin-product-ui`(PR2 머지 후) — `/admin/products/new` 등록 폼(필드 + 이미지 업로드) + 제출→성공→상세 이동, 즉시 반영(`revalidatePath`).
- **Scope**:
  - **IN**: env `ADMIN_EMAILS` allowlist 기반 `isAdmin(email)` 게이트(middleware UX 리다이렉트 + API Zero Trust 재검증); `lib/products.ts` `createProduct`(randomUUID id, 앱→Prisma 변환, category 6종 검증); `lib/supabase-storage.ts` bucket 파라미터화(제네릭 `uploadImage`/`removeImagesByUrl`/`publicUrlToPath(bucket,...)` + 기존 `uploadOOTDImage`/`removeOOTDImagesByUrl` 래퍼 유지 + 신규 `uploadProductImage`/`removeProductImagesByUrl`); `POST /api/admin/products`(multipart/form-data: 필드 + 이미지 1장 → 검증 → `product-images` 업로드 → `createProduct` → 실패 시 보상 삭제); `/admin/products/new` 등록 폼 UI(필수: name/brand/price/category/이미지; 선택: originalPrice/discountRate/description/sizes/colors/배지) + 제출 후 상세 이동 + 즉시 반영; 단위테스트(admin gate, createProduct, storage 일반화, API mock).
  - **OUT** (못박음): 상품 **수정/삭제**(create만 — ADR-008 범위); 다중 이미지 갤러리 업로드(1장만 — `imageUrl` + `images:[그것]`, 다중은 추후); `User.role`/`isAdmin` 스키마 필드(allowlist 채택); admin 대시보드/통계/상품 목록 관리 페이지(등록 폼만, 목록은 선택); seed.ts 역방출/동기화(ADR-008 — DB가 SSoT); 이미지 리사이즈·썸네일·EXIF; 카테고리 enum 정규화(String 유지 — ADR-005 결정4); 가격 통화 다변화(AED Int 유지); RLS 세밀 정책(서버 service_role 단일 경로 — ADR-007).
- **Approach**: 신규 발명 금지. 인증 게이트·응답·보상 삭제는 `app/api/wishlist/route.ts`·`app/api/ootd/route.ts`가 확립한 패턴(`auth()` 401 → `session.user.id`만 신뢰 → FormData 검증 → Storage 업로드 → DB create, 실패 시 `removeImagesByUrl` 보상 → try-catch 핸들러 최상위 → `extractErrorMessage` → `{success,data|error}`)을 차용한다. admin 게이트만 신규(env allowlist). Storage는 **기존 헬퍼를 bucket 파라미터화로 일반화**하되 OOTD 호출부는 래퍼로 무수정 보존(surgical). 상품 읽기 헬퍼(`lib/products.ts`)에 `createProduct` write 헬퍼를 대칭 추가한다.

## Context

### Project Context (from docs/)

- **Product Goal** (`.claude/rules/session.md` 북극성): potata = 한국→UAE 패션 커머스. P0~P3(인증·커머스 MVP·카탈로그 DB·OAuth·영속화·OOTD) 완료. 본 트랙 = **실 카탈로그 콘텐츠(관리자 상품 등록)** — 검색·리뷰·배포 모두의 상류(실상품이 있어야 배포·실유저 가동이 의미). roadmap "다음 작업".
- **ADR Constraints Applied (DO NOT RE-DECIDE)**:
  - **ADR-005**(Product 모델): `Product.id = String @id`(@default 없음 — 수동 공급), 이미지 외부 URL/`images String[]`, 상세 ISR(`revalidate=3600`, `dynamicParams=true`), sizes/colors/images = String[] 스칼라. → admin create가 randomUUID로 id 공급, 신규 상품 상세는 ISR on-demand로 노출.
  - **ADR-007**(Supabase Storage): server-only + REST(SDK 미사용) + service_role + public 버킷 + 보상 삭제. → 본 트랙이 `product-images` 버킷으로 재사용, 헬퍼 일반화.
  - **ADR-008**(본 트랙 신규): 상품 SSoT = DB(런타임/admin), seed = 부트스트랩. admin id = randomUUID. seed 비파괴 upsert 불변.
  - **ADR-006**(NextAuth v5 JWT): `session.user.id` = DB User.id, `session.user.email` = 로그인 이메일(NextAuth 기본 세션 필드). admin 게이트는 email 기준.
  - **ADR-003**(하이브리드 테스트): 단위 = `vi.mock("@/lib/prisma")` + `vi.mock("@/lib/supabase-storage")` + `vi.mock("@/auth")`; 통합은 CI 실 Postgres. 로컬 통합 pgbouncer 42P05 실패 허용.
- **Aligned with Existing Plans**: `ootd-feed.md`(archive — Storage 업로드+보상+검증 정본), `persist-cart-wishlist.md`(게이트 패턴) 위에 얹는 독립 증분. 기존 plan/ADR 불번복.
- **Out-of-Scope Items** (CLAUDE.md 재확인): 가짜 user 객체 금지, `data/dummy.ts` 신규 의존 금지, main 직접 commit 금지(feat 브랜치+PR), `.env*` commit 금지(클라 시크릿 하드코딩 금지), try-catch 핸들러 최상위만, 응답 `{success,data|error}` 표준, signup/login bcrypt 통일(본 트랙 무관).

### Ask First 승인 항목 (실행 전 사용자 승인 — CLAUDE.md "Ask First")

각 항목 diff를 사용자에게 제시 → 승인 전 적용 금지.

1. **신규 env 키 `ADMIN_EMAILS`**: `.env.local`에 운영자 이메일(콤마 구분). `.env.example`엔 **이름만**(값 없이). `.env*` commit 금지. (PR1)
2. **`app/api/` 신규 라우트 구조**: `app/api/admin/products/route.ts` 신규(CLAUDE.md "Ask First: app/api 라우트 핸들러 구조 변경"). diff 제시 후 승인. (PR2)
3. ~~`prisma/schema.prisma` 변경~~ → **불필요**(결정2 allowlist, Product 모델 완비).
4. ~~`next.config.ts` 변경~~ → **불필요**(동일 Supabase 호스트 `/storage/v1/object/public/**` 기존 등록이 `product-images` 버킷도 커버 — `next.config.ts:18-23` 실측).
5. ~~`package.json` 의존성~~ → **불필요**(id=randomUUID 내장, Storage=기존 REST fetch).

### 갈림길 결정표 (기본값 채택 + 대안 기각 사유 — plan 검토 시 변경 가능)

| # | 갈림길 | 기본값 (채택) | 대안 (기각 사유) |
|---|--------|--------------|------------------|
| 1 | 상품 SSoT | **DB = 런타임/admin SSoT, seed.ts = 부트스트랩 전용**(ADR-008) | (b) seed.ts에 write: 서버리스 파일쓰기 불가. (c) 하이브리드 역방출: YAGNI |
| 2 | admin 상품 id | **`crypto.randomUUID()`(서버 생성, 의존성 0)** | 숫자 max+1: product-detail 스킬과 할당 경쟁. cuid: 수동 호출용 공개 API 없음(의존성 필요) |
| 3 | admin 권한 게이트 | **env `ADMIN_EMAILS` allowlist + `isAdmin(email)`**, middleware(UX) + API(Zero Trust) 이중 | `User.role`/`isAdmin` 필드: 스키마 변경·마이그레이션, 단일 운영자 MVP에 과함 |
| 4 | 권한 게이트 위치 | **middleware `/admin` 리다이렉트(UX) + API 라우트 자체 `isAdmin` 재검증(정본 게이트)** | middleware만: API 직접 호출 우회 가능(Zero Trust 위반). API만: admin 페이지가 비admin에게 잠깐 노출 |
| 5 | Storage 버킷 | **신규 `product-images` public 버킷 + 헬퍼 bucket 파라미터화** | 동일 ootd-images + prefix: 관심사 혼재, 버킷명 오해 소지 |
| 6 | Storage 헬퍼 형태 | **제네릭 코어(`uploadImage(bucket,prefix,file)` 등) + 기존 OOTD 래퍼 유지 + 신규 product 래퍼** | OOTD 헬퍼 직접 수정: ootd 라우트 호출부 깨짐(비-surgical) |
| 7 | 이미지 장수 | **1장 필수**(`imageUrl` + `images:[그것]`), 다중 갤러리 OUT | 다중 업로드: MVP 과함(YAGNI), 추후 |
| 8 | 이미지 검증 | **서버 MIME 화이트리스트(jpg/png/webp) + ≤5MB**(ootd 재사용) | 클라 검증만: 우회 가능(Zero Trust 위반) |
| 9 | 필수 필드 | **name·brand·price(Int>0 AED)·category(6종)·이미지 1장** | 전 필드 필수: 운영 부담. 선택 = originalPrice/discountRate/description/sizes/colors/isNew·isBest·isHot |
| 10 | category 검증 | **서버에서 6종(Outer/Top/Bottom/Dress/Acc/Shoes) 화이트리스트, 'All' 거부** | 자유 문자열: 필터 깨짐(ADR-005 'All' 저장 금지) |
| 11 | API 형태 | **Route Handler `POST /api/admin/products`(multipart/form-data)** | Server Action: 프로젝트 전부 Route Handler+`{success,error}`+`auth()` 일관 — 비일관 도입 회피 |
| 12 | 등록 후 즉시 반영 | **API에서 `revalidatePath` 호출(목록 경로) + 상세는 ISR on-demand**, 폼은 성공 후 `/product/[id]`로 이동 | 미반영: "즉시 노출" Objective 위반. 전역 no-cache: 캐시 이점 상실 |
| 13 | sizes/colors 입력 | **콤마 구분 텍스트 → `split`/trim/빈값 제거 → String[]** | 동적 칩 입력 UI: MVP 과함(추후) |

### Research Findings (verified in codebase)

- `lib/supabase-storage.ts:14` — `const BUCKET = "ootd-images"` 하드코딩. `:34-53` `uploadOOTDImage(userId,file)`(path `${userId}/${randomUUID}.${ext}`, REST POST, x-upsert:false). `:59-72` `removeOOTDImagesByUrl`(DELETE prefixes). `:75-79` `publicUrlToPath`(marker 슬라이스). `:16-25` `getEnv()`(lazy throw). **bucket 파라미터화 대상 — 제네릭 코어로 추출 후 OOTD 래퍼가 `BUCKET` 바인딩.**
- `lib/products.ts:22-42` `toAppProduct`(Prisma→앱, null→undefined, category as ProductCategory). `:45-48` `getAllProducts`(createdAt asc). `:51-54` `getProductById`. **`createProduct(input)` write 헬퍼를 대칭 추가**(앱 입력→Prisma create, randomUUID id, category 검증).
- `app/api/ootd/route.ts:18-97` — **업로드+검증+보상 정본**: `auth()` 401(22-24)→`session.user.id`(25)→`formData()`(27)→파일 MIME/크기/장수 검증(35-55, ALLOWED_TYPES 9-13, MAX_SIZE 14)→FK 선검증(57-66)→Storage 업로드 루프(68-75)→DB create(78-88)→실패 시 `removeOOTDImagesByUrl` 보상(89-92)→catch 최상위+`extractErrorMessage`(93-96). **admin 라우트가 1장 버전으로 차용.**
- `app/api/wishlist/route.ts:8-34,37-97` — 게이트+`{success,data|error}`+`extractErrorMessage` 정본.
- `middleware.ts:4-25` — `auth((req)=>{...})` 래퍼, `req.auth`로 세션, `protectedPaths`(9) + `config.matcher`(24). **`/admin` 추가**: 로그인 + `isAdmin(req.auth?.user?.email)` 아니면 리다이렉트. matcher에 `/admin/:path*` 추가.
- `auth.ts:61-66` — session 콜백이 `session.user.id` 설정. `session.user.email`은 NextAuth 기본 세션 필드(credentials authorize 반환 user + Google profile에서 채워짐). **검증 필요**(F-검증): admin 로그인 시 `session.user.email` 존재 확인.
- `lib/auth.ts:9-11` `normalizeEmail`(trim+lowercase) — allowlist 비교에 재사용. `:25-38` `extractErrorMessage`.
- `next.config.ts:18-23` — Supabase 호스트 `ptosrqkdatrygksyuvpm.supabase.co` + `pathname:/storage/v1/object/public/**` 이미 등록. **`product-images` 버킷 public URL도 동일 호스트/패턴 → next.config 변경 불필요.**
- `prisma/schema.prisma:66-93` — `Product`: id String(@default 없음), name/brand/price Int/originalPrice Int?/discountRate Int?/imageUrl/images String[]/category/description?/sizes[]/colors[]/rating?/reviewCount?/isNew·isBest·isHot Boolean/createdAt/updatedAt. **무변경 — 모든 필드 폼으로 충족.**
- `app/product/[id]/page.tsx:5-27` — ISR(`revalidate=3600`, `dynamicParams=true`), `getProductById`로 렌더, 없으면 `notFound()`. **신규 randomUUID 상품 상세 on-demand 생성.**
- `types/index.ts:6-25` `Product`, `:27-34` `ProductCategory`(6종 + 'All'), `:183-188` `ApiResponse<T>`. 신규 admin create 요청/응답 타입 추가.
- `prisma/seed.ts:198-226` — `upsert`만(deleteMany 없음 — 비파괴, ADR-008 근거). 무변경.
- `.claude/skills/product-detail/SKILL.md:16` — "seed.ts가 진실의 원천" 서술. ADR-008에 따라 "스킬 관리 상품 한정" 주석 1줄 추가(PR1 문서 task).

### Hidden Complexity (반드시 명시 step+verify로 반영)

1. **session.user.email 가용성 + 정규화 비교**(PR1): admin 게이트는 `session.user.email`에 의존. NextAuth 기본 세션이 email을 싣지만, allowlist 비교 시 양쪽 `normalizeEmail`(소문자/trim)로 정규화해야 대소문자 불일치 누락 방지. → verify: 단위테스트(email 대소문자/공백 변형이 allowlist와 매칭) + 수동(admin 로그인 시 게이트 통과, 비admin 차단).
2. **middleware edge runtime + env**(PR1): `middleware.ts`는 edge에서 실행. `process.env.ADMIN_EMAILS`는 edge에서 읽힘(서버 env, `NEXT_PUBLIC_` 아님). Prisma 미사용(email 문자열 비교만)이라 edge 안전. → verify: middleware에 prisma import 0건, dev에서 비admin `/admin` 접근 리다이렉트.
3. **Zero Trust 이중 게이트**(PR1·PR2): middleware는 UX(페이지 리다이렉트)일 뿐 — `/api/admin/*`는 matcher에 없거나 우회 가능하므로 **API 라우트가 자체 `isAdmin` 재검증**(정본 게이트). → verify: 비admin 세션으로 `POST /api/admin/products` 직접 호출 시 403.
4. **Storage↔DB 보상**(PR2): 이미지 업로드 성공 후 `createProduct` 실패 시 업로드 이미지 보상 삭제(고아 파일 방지). → verify: 단위테스트(create reject mock 시 `removeProductImagesByUrl`가 업로드 URL로 호출).
5. **id 수동 공급**(PR2): `Product.id` @default 없음 → `createProduct`가 `crypto.randomUUID()` 공급 누락 시 Prisma 런타임 에러. → verify: create 데이터에 id 포함, 단위테스트로 id 생성 확인.
6. **헬퍼 일반화 시 OOTD 무회귀**(PR2): bucket 파라미터화로 추출하며 기존 `uploadOOTDImage`/`removeOOTDImagesByUrl` 시그니처·동작 불변 유지(ootd 라우트 import 무수정). → verify: 기존 ootd route.test 그린 + ootd 라우트 import 변경 0건.
7. **등록 즉시 반영**(PR2·PR3): 목록 페이지(`/shop` 등)가 정적/ISR 캐시면 신규 상품이 지연 노출 → API 성공 시 `revalidatePath` 호출(영향 목록 경로). 상세는 `dynamicParams=true`로 on-demand. → verify: 등록 직후 목록·상세에서 신규 상품 확인(수동).
8. **category 6종 화이트리스트**(PR2): 'All' 또는 임의 문자열 저장 금지(ADR-005). 서버에서 enum 검증. → verify: 잘못된 category → 400.

### librarian (외부 베스트프랙티스 — 참고)

- Next.js Route Handler `multipart/form-data`: `await req.formData()` → `form.get("name")`(string) + `form.get("image")`(File). 파일은 `await file.arrayBuffer()`로 BodyInit 변환(ootd 패턴과 동일).
- NextAuth v5: 기본 세션 `session.user`에 `name`/`email`/`image` 포함. 커스텀 필드(id)는 콜백으로 추가(현 `auth.ts`). admin 판정은 `session.user.email` 비교가 표준.
- Next.js `revalidatePath(path)`(server-only): mutation 후 캐시 무효화로 목록 즉시 갱신. API 라우트/서버액션에서 호출.
- Supabase Storage 멀티 버킷: 버킷은 격리 단위 — 관심사별 분리 권장. public 버킷 URL은 `/storage/v1/object/public/<bucket>/<path>` 동형(호스트 동일).

## Prerequisites

- [ ] **사용자 사전작업(BLOCKER)**(아래 별도 섹션) — `product-images` 버킷 + `ADMIN_EMAILS`는 **PR2 실 업로드·PR3 게이트 수동검증 시점**에 필수. PR1·PR2 코드/단위테스트는 키·버킷 없이 선행(mock).
- [ ] 현 브랜치 `feat/admin-product-upload`에서 PR1 시작. PR2/PR3는 직전 PR 머지 후 분기.
- [ ] service_role 키(`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`)는 OOTD 트랙에서 이미 `.env.local`에 존재(재사용).
- [ ] (실행자 인지) Ask First 2항목(env `ADMIN_EMAILS`, `app/api/admin` 신규 라우트) 승인 step을 해당 PR Wave 1에서 먼저 처리.

---

## 🚧 사용자 사전작업 (BLOCKER — 사용자가 직접 수행, 실행자가 클릭 단계 안내)

> service_role 키는 OOTD 때 이미 설정됨(재사용). 본 트랙 신규 사전작업은 **버킷 1개 + env 1개**. **키/이메일 절대 commit 금지.** PR1은 사전작업 없이 가능, PR2 실 업로드·PR3 게이트 수동검증부터 필수.

1. **Supabase `product-images` 버킷 생성**:
   - Supabase 대시보드 → 좌측 **Storage** → **New bucket**.
   - Name: `product-images` (정확히 이 이름 — 코드와 일치).
   - **Public bucket 토글 ON**(상품 이미지는 카탈로그에 공개 — 결정표 #5).
   - Create.
2. **`.env.local`에 `ADMIN_EMAILS` 추가**(commit 안 됨):
   ```
   ADMIN_EMAILS=your-admin@example.com,another-admin@example.com
   ```
   - 운영자(본인) 로그인 이메일을 콤마로 구분해 입력. 여기 없는 이메일은 admin 화면/API 접근 불가.
   - (배포 시) Vercel 환경변수에도 `ADMIN_EMAILS` 동일 추가 — 누락 시 프로덕션에서 admin 접근 불가.
3. **확인**: 실행자에게 "product-images 버킷 생성 + ADMIN_EMAILS 설정 완료"라고 알리면 PR2 실 업로드/PR3 게이트 수동검증 진행. (실행자는 값을 보지 않음.)

> `.env.example`엔 실행자가 **키 이름만**: `ADMIN_EMAILS=` (PR1 Task).

---

## PR1 — 권한 게이트 + 상품 create 헬퍼 + ADR (`feat/admin-product-upload`)

### PR1 Wave 1 (병렬 — 독립 파일)

- [x] 1. [PR1] `lib/admin.ts` — `isAdmin(email)` env allowlist 게이트 + `ADMIN_EMAILS` 승인 `category:ultrabrain`
  **Goal**: `lib/admin.ts` 신규. `process.env.ADMIN_EMAILS`(콤마 구분)를 파싱해 정규화한 admin 이메일 Set을 만들고, `isAdmin(email?: string | null): boolean`(email을 `normalizeEmail`로 정규화 후 Set 포함 여부)을 노출. `ADMIN_EMAILS` env는 사용자 승인 후 `.env.local`에 추가(Ask First).
  **References**:
  - `lib/auth.ts:9-11` — `normalizeEmail`(trim+lowercase) 재사용(양쪽 정규화).
  - `lib/supabase-storage.ts:16-25` — env를 **호출 시점에 읽는** lazy 패턴(모듈 로드 시 throw/캐시 금지 — 테스트가 env 주입 가능해야 함). `getAdminEmails()`도 호출 시 `process.env` 읽기.
  - 결정표 #3·Hidden Complexity #1.
  **구현 메모**:
  - `function getAdminEmails(): Set<string>` — `(process.env.ADMIN_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean)` → `new Set(...)`. (호출 시 평가 — 테스트가 `process.env.ADMIN_EMAILS` 설정 후 호출 가능.)
  - `export function isAdmin(email?: string | null): boolean` — `!!email && getAdminEmails().has(normalizeEmail(email))`.
  - **`import "server-only"` 불요**(권한 판정은 클라에서도 이론상 호출 가능하나, 실제 env는 서버에만 존재 — `ADMIN_EMAILS`는 `NEXT_PUBLIC_` 아님 → 클라에선 빈 Set. 미들웨어 edge에서도 동작). 단 라우트/미들웨어/서버컴포넌트에서만 사용.
  **Must NOT do**: `ADMIN_EMAILS`를 `NEXT_PUBLIC_`로 노출 금지(클라 유출). 모듈 로드 시 env 캐시 금지(lazy). 정규화 없이 raw 비교 금지(대소문자 누락). 사용자 승인 없이 `.env.local` 작성 강요 금지(이름만 `.env.example`).
  **QA Scenarios**:
  - Happy: `ADMIN_EMAILS="a@x.com, B@X.COM"` 설정 → `isAdmin("a@x.com")`/`isAdmin("b@x.com")`/`isAdmin(" A@X.COM ")` 모두 true.
  - Negative: `isAdmin("c@x.com")`/`isAdmin(undefined)`/`isAdmin(null)`/`isAdmin("")` → false.
  - Edge: `ADMIN_EMAILS` 미설정(빈 문자열) → 모든 이메일 false(게이트 닫힘 — 안전 기본값).

- [x] 2. [PR1] `lib/products.ts` — `createProduct` write 헬퍼(randomUUID id, category 검증) `category:ultrabrain`
  **Goal**: `lib/products.ts`에 `createProduct(input)` 추가. 앱 레벨 입력을 받아 `crypto.randomUUID()` id로 `prisma.product.create` 후 `toAppProduct`로 반환. category는 6종 화이트리스트 검증(위반 시 throw → 라우트가 400 변환). 기존 read 헬퍼와 대칭.
  **References**:
  - `lib/products.ts:22-42` — `toAppProduct`(반환 변환 재사용). `:45-54` 기존 read 헬퍼 스타일(서버 전용, `prisma` import 1행).
  - `prisma/schema.prisma:66-93` — Product 필드(price Int, originalPrice/discountRate Int?, images String[], category String, sizes/colors String[], 배지 Boolean).
  - `types/index.ts:27-34` — `ProductCategory`(6종, 'All' 제외 저장).
  - ADR-008(randomUUID id)·결정표 #2·#9·#10·Hidden Complexity #5·#8.
  **구현 메모**:
  - 입력 타입(types에 추가 — Task 3): `CreateProductInput`(name/brand/price/category/imageUrl 필수 + 선택 필드). `images`는 `[imageUrl]` 기본.
  - category 검증: `const VALID = ["Outer","Top","Bottom","Dress","Acc","Shoes"] as const;` 포함 아니면 `throw new Error("유효하지 않은 카테고리입니다.")`.
  - `prisma.product.create({ data: { id: crypto.randomUUID(), name, brand, price, originalPrice: input.originalPrice ?? null, discountRate: ... ?? null, imageUrl, images: input.images ?? [imageUrl], category, description: ?? null, sizes: ?? [], colors: ?? [], rating: null, reviewCount: null, isNew: ?? false, isBest: ?? false, isHot: ?? false } })` → `toAppProduct(row)`.
  - 숫자 필드는 라우트에서 Int 파싱·검증(price>0) 후 전달(헬퍼는 이미 검증된 값 가정 + category만 방어).
  **Must NOT do**: id에 숫자 max+1 사용 금지(스킬 경쟁 — 결정표 #2). 'All'/임의 category 저장 금지. `data/dummy.ts` 참조 금지. seed.ts 수정 금지(DB 직접 write — ADR-008). try-catch를 헬퍼에 중첩 금지(throw → 라우트 최상위 catch).
  **QA Scenarios**:
  - Happy: 유효 입력 → `prisma.product.create` 호출(data.id = uuid 형식), 반환이 앱 `Product`(id·category 채워짐).
  - Negative(category): category="All"/"Foo" → throw.
  - Edge: 선택 필드 미제공 → originalPrice null, images=[imageUrl], 배지 false.

- [x] 3. [PR1] admin 상품 등록 API 계약 타입 정의 `category:quick`
  **Goal**: `types/index.ts`에 admin 상품 등록 입력/응답 타입 추가(`CreateProductInput`, `AdminProductCreateData`). 순수 타입만.
  **References**:
  - `types/index.ts:6-25`(Product)·`:183-188`(ApiResponse) 스타일.
  - Task 2(createProduct 입력)·Task 6(API 응답).
  **추가 타입(예)**:
  ```ts
  // 관리자 상품 등록 입력(서버 createProduct 헬퍼 + API 폼 필드)
  export interface CreateProductInput {
    name: string;
    brand: string;
    price: number;          // AED Int > 0
    category: ProductCategory; // 'All' 제외 6종
    imageUrl: string;       // 업로드된 public URL
    images?: string[];
    originalPrice?: number;
    discountRate?: number;
    description?: string;
    sizes?: string[];
    colors?: string[];
    isNew?: boolean;
    isBest?: boolean;
    isHot?: boolean;
  }
  // POST /api/admin/products 성공 데이터
  export type AdminProductCreateData = { id: string };
  ```
  **Must NOT do**: 응답 래퍼(`{success,...}`) 변경 금지. 로직 추가 금지(타입만).
  **QA Scenarios**: `npx tsc --noEmit` 통과, 순환 의존 없음.

- [x] 4. [PR1] `middleware.ts` `/admin` 보호(로그인 + isAdmin) + matcher `category:ultrabrain`
  **Goal**: `middleware.ts`에 `/admin` 경로 보호 추가. 미로그인 → `/login?callbackUrl=`, 로그인했으나 비admin(`!isAdmin(req.auth?.user?.email)`) → `/`(또는 안내). `config.matcher`에 `/admin/:path*` 추가.
  **References**:
  - `middleware.ts:4-25` — 기존 `auth((req)=>{...})` + `protectedPaths`(9) + matcher(24). 패턴 그대로 확장.
  - `lib/admin.ts`(Task 1) — `isAdmin`.
  - Hidden Complexity #2·#3·결정표 #4.
  **구현 메모**:
  - `/admin` 분기: `if (nextUrl.pathname.startsWith("/admin")) { if (!isLoggedIn) return redirect(/login?callbackUrl); if (!isAdmin(req.auth?.user?.email)) return NextResponse.redirect(new URL("/", origin)); }`. 기존 `/mypage`,`/liked` 분기는 유지(surgical 추가).
  - matcher: `["/mypage/:path*","/liked/:path*","/admin/:path*"]`.
  **Must NOT do**: middleware에 prisma/무거운 import 금지(edge — email 문자열 비교만). 기존 보호 경로 동작 변경 금지(추가만). `/api/admin`을 middleware에만 의존 금지(API 자체 게이트 필수 — PR2).
  **QA Scenarios**:
  - Happy(admin): admin 이메일 로그인 → `/admin/...` 접근 통과.
  - Negative(비로그인): `/admin/...` → `/login?callbackUrl=/admin/...`.
  - Negative(비admin): 일반 로그인 → `/admin/...` → `/`로 리다이렉트.
  - 회귀: `/mypage`,`/liked` 기존 보호 동작 유지.

- [x] 5. [PR1] ADR-008 확정 반영 + roadmap + `.env.example` + SKILL.md 주석 `category:writing`
  **Goal**: ADR-008(이미 초안 작성됨 — Status Accepted 확정)·`roadmap.md`(다음 작업 → 진행 중 갱신)·`.env.example`(`ADMIN_EMAILS=` 이름만)·`product-detail/SKILL.md:16`("스킬 관리 상품 한정" 주석 1줄) 정합.
  **References**:
  - `docs/adr/adr-008-product-ssot.md`(작성됨) — 본 plan과 상호 참조 확인.
  - `docs/work-plans/roadmap.md:79-86` — "다음 작업" 섹션을 "진행 중(본 trc)"로 갱신, ADR-008 링크.
  - `.env.example` — 기존 키 목록에 `ADMIN_EMAILS=`(값 없이) 추가.
  - `.claude/skills/product-detail/SKILL.md:16` — "seed.ts가 진실" 문장에 "(스킬 관리 큐레이션 상품 한정 — 런타임 admin 등록 상품은 DB가 SSoT, ADR-008)" 주석.
  **Must NOT do**: `.env.example`에 실제 이메일 값 기입 금지(이름만). ADR-005/007 본문 수정 금지(ADR-008에서 참조만). SKILL.md 동작 로직 변경 금지(주석 1줄만 — surgical).
  **QA Scenarios**: ADR-008 존재·상호참조, roadmap 갱신, `.env.example`에 `ADMIN_EMAILS=`, SKILL.md 주석 1줄. `git status`로 `.env.local` 미추적 확인.

### PR1 Wave 2 (테스트)

- [x] 6. [PR1] 단위테스트 — isAdmin allowlist + createProduct(prisma mock) `category:ultrabrain`
  **Goal**: `lib/admin.test.ts`(isAdmin 정규화/경계) + `lib/products.test.ts`(createProduct: `vi.mock("@/lib/prisma")`로 create mock, randomUUID id·category 검증·기본값). `npm run test` 그린.
  **References**:
  - `app/api/wishlist/route.test.ts:1-36` — `vi.hoisted`+`vi.mock` 골격.
  - Task 1·2.
  **Must NOT do**: 실 DB 접근 금지(mock). 기존 테스트 수정 금지. env는 테스트 내 `vi.stubEnv("ADMIN_EMAILS", ...)` 또는 `process.env` 직접 설정 후 복원.
  **QA Scenarios**:
  - isAdmin: 정규화 매칭/비매칭/빈 env/undefined.
  - createProduct: create 호출 data.id가 uuid 형식 + 반환 앱 Product / category "All" → throw / 선택 필드 기본값.
  - 실행: `npm run test lib/` exit 0.

### PR1 Final Verification Wave

- [x] F1. [PR1] tsc·lint·test 그린 + 보안 경계 확인
  **검증 단계**: `npx tsc --noEmit`(exit 0) → `npm run lint`(exit 0) → `npm run test`(신규 lib 테스트 + 기존 전부 그린) → grep `ADMIN_EMAILS` 클라 컴포넌트(`"use client"`)에서 참조 0건 + `NEXT_PUBLIC_ADMIN` 0건 → `git status`로 `.env.local` 미추적. 기대결과: 전부 통과, admin 게이트 단위 검증, env 클라 미노출.

---

## PR2 — Storage 일반화 + 등록 API (`feat/admin-product-api`, PR1 머지 후)

### PR2 Wave 1 (Storage 일반화 — API 선행 의존)

- [x] 7. [PR2] `lib/supabase-storage.ts` bucket 파라미터화(제네릭 코어 + OOTD 래퍼 유지 + product 래퍼) `category:ultrabrain`
  **Goal**: `lib/supabase-storage.ts`를 bucket 파라미터화. 제네릭 코어(`uploadImage(bucket, pathPrefix, file)`, `removeImagesByUrl(bucket, urls)`, `publicUrlToPath(bucket, url)`) 추출 + 기존 `uploadOOTDImage`/`removeOOTDImagesByUrl`를 `"ootd-images"` 바인딩 **래퍼로 유지**(ootd 라우트 무수정) + 신규 `uploadProductImage`/`removeProductImagesByUrl`(`"product-images"` 바인딩).
  **References**:
  - `lib/supabase-storage.ts:14`(BUCKET)·`:34-53`(upload)·`:59-72`(remove)·`:75-79`(publicUrlToPath)·`:16-25`(getEnv lazy). **bucket을 인자로 받도록 추출.**
  - `app/api/ootd/route.ts:6,73,90` — `uploadOOTDImage`/`removeOOTDImagesByUrl` 호출부(시그니처 불변 유지 확인).
  - 결정표 #5·#6·Hidden Complexity #6.
  **구현 메모**:
  - 제네릭: `uploadImage(bucket: string, pathPrefix: string, file: ImageFile): Promise<{path; publicUrl}>` — path `${pathPrefix}/${crypto.randomUUID()}.${ext}`(prefix 빈 문자열이면 루트). `publicUrlToPath(bucket, url)` marker = `/storage/v1/object/public/${bucket}/`.
  - OOTD 래퍼: `uploadOOTDImage(userId, file) = uploadImage("ootd-images", userId, file)`; `removeOOTDImagesByUrl(urls) = removeImagesByUrl("ootd-images", urls)`. **시그니처·동작 불변.**
  - product 래퍼: `uploadProductImage(file) = uploadImage("product-images", "products", file)`(prefix "products" 또는 "" — userId 무관, 상품 이미지는 단일 네임스페이스); `removeProductImagesByUrl(urls) = removeImagesByUrl("product-images", urls)`.
  - `ImageFile` 인터페이스(기존 `OOTDImageFile`)를 `ImageFile`로 일반화 또는 재export(타입 깨짐 방지).
  **Must NOT do**: OOTD 래퍼 시그니처/동작 변경 금지(ootd 라우트·테스트 회귀). `import "server-only"` 1행 제거 금지(보안 경계). SDK 도입 금지(REST fetch 유지 — ADR-007). env eager 로드 금지(lazy 유지).
  **QA Scenarios**:
  - Happy(product): `uploadProductImage(file)` → `product-images` 버킷 path/publicUrl(`.../public/product-images/...`).
  - 회귀(OOTD): `uploadOOTDImage(userId,file)` 동작·반환 불변, 기존 `app/api/ootd/route.test.ts` 그린.
  - publicUrlToPath: `.../public/product-images/products/abc.jpg` → `products/abc.jpg`.
  - 단위 mock 가능: named export 구조 유지.

### PR2 Wave 2 (등록 API — Storage 헬퍼 의존)

- [x] 8. [PR2] `POST /api/admin/products` — admin 게이트 + 필드/이미지 검증 + 업로드 + create + 보상 `category:ultrabrain`
  **Goal**: `app/api/admin/products/route.ts` 신규(라우트 구조 Ask First 승인 후). `auth()` 401 → `isAdmin(session.user.email)` 403(Zero Trust) → multipart/form-data 수신 → 필드/이미지 검증 → `uploadProductImage` → `createProduct` → 실패 시 `removeProductImagesByUrl` 보상. 성공 시 `revalidatePath`(목록) + `{success,data:{id}}`.
  **References**:
  - `app/api/ootd/route.ts:18-97` — **업로드+검증+보상 정본**(1장 버전으로 축소). ALLOWED_TYPES(9-13)/MAX_SIZE(14)/formData(27)/검증(35-55)/업로드(68-75)/create+보상(78-92)/catch(93-96).
  - `app/api/wishlist/route.ts:37-45,90-96` — `auth()` 401 + catch 최상위 + `extractErrorMessage`.
  - `lib/admin.ts`(isAdmin)·`lib/products.ts`(createProduct)·`lib/supabase-storage.ts`(uploadProductImage/removeProductImagesByUrl).
  - 결정표 #7~#12·Hidden Complexity #3·#4·#7·#8.
  **구현 메모**:
  - 게이트: `auth()` null → 401. `!isAdmin(session.user.email)` → 403 `{success:false,error:"관리자 권한이 필요합니다."}`(Zero Trust — middleware와 무관하게 재검증).
  - `const form = await req.formData();` → 필드(`name`/`brand`/`price`/`category`/`description`/`sizes`/`colors`/`originalPrice`/`discountRate`/`isNew`...) + `form.get("image")`(File).
  - **검증(Storage 호출 전)**: name/brand 비어있지 않음, price = `Number.parseInt` > 0, category ∈ 6종, image instanceof File + MIME ∈ jpg/png/webp + size ≤ 5MB. sizes/colors = 콤마 split→trim→빈값 제거(결정표 #13). 위반 시 400(업로드 미호출).
  - 업로드: `await image.arrayBuffer()` → `uploadProductImage({data,contentType,ext})` → `{publicUrl}`.
  - create: `createProduct({ name, brand, price, category, imageUrl: publicUrl, images:[publicUrl], originalPrice, discountRate, description, sizes, colors, isNew, isBest, isHot })`. **try로 감싸 실패 시 `removeProductImagesByUrl([publicUrl])` 보상 후 re-throw**(최상위 catch 500). createProduct의 category throw도 보상 경로 통과.
  - 즉시 반영: 성공 후 `revalidatePath("/shop")`(+ 필요한 목록 경로 — 코딩 시 grep으로 getAllProducts 소비 페이지 확인). 
  - 응답: `{success:true,data:{id}}`.
  **Must NOT do**: 클라 검증만 신뢰 금지. 검증 **전** 업로드 금지. create 실패 시 이미지 방치 금지(보상). 요청 body의 admin 여부/userId 신뢰 금지(`session`만). try-catch 핸들러 최상위 외 중첩 금지(보상은 내부 try→re-throw). 가짜 user 금지. `data/dummy.ts`/seed.ts 참조 금지.
  **QA Scenarios**:
  - Happy: admin + jpg 1장 + name/brand/price=100/category=Top → 200 `{id}`, `product-images`에 1파일·DB Product 1행(imageUrl=publicUrl, images=[publicUrl]).
  - Negative(401): `auth()` null → 401, 업로드/DB 미접근.
  - Negative(403): 비admin 세션 → 403, 업로드/DB 미접근(Zero Trust).
  - Negative(필드): price=0/음수/NaN → 400 / name 공백 → 400 / category="All" → 400. 업로드 미호출.
  - Negative(이미지): image 없음 → 400 / gif → 400 / 6MB → 400. 업로드 미호출.
  - 보상(핵심): 업로드 성공 후 `createProduct` reject → `removeProductImagesByUrl([publicUrl])` 호출, 500.

### PR2 Wave 3 (테스트)

- [x] 9. [PR2] 단위테스트 — admin products 라우트(게이트/검증/업로드/보상, mock) `category:ultrabrain`
  **Goal**: `app/api/admin/products/route.test.ts` 신규. `vi.mock("@/auth")`/`vi.mock("@/lib/admin")`/`vi.mock("@/lib/products")`/`vi.mock("@/lib/supabase-storage")`. 게이트(401/403)·검증·업로드·보상 케이스. `npm run test` 그린.
  **References**:
  - `app/api/ootd/route.test.ts`(존재 시 — 업로드/보상 mock 골격) + `app/api/wishlist/route.test.ts:1-36`.
  - FormData mock: `new Request(url,{method:"POST",body: formData})` 또는 `Request`에 FormData 직접.
  - Task 8 라우트.
  **Must NOT do**: 실 DB/Storage 접근 금지(전부 mock). 기존 테스트 수정 금지. 통과 위해 라우트 검증 약화 금지.
  **QA Scenarios**:
  - 401: auth null → 401, `uploadProductImage` 미호출.
  - 403: `isAdmin→false` → 403, 미호출.
  - 검증 거부: gif/6MB/price=0/category="All"/name 공백 → 400, `uploadProductImage` 미호출.
  - Happy: 유효 → `uploadProductImage` + `createProduct` 호출, 200 `{id}`.
  - 보상: `uploadProductImage` 성공 + `createProduct` reject → `removeProductImagesByUrl([publicUrl])` 호출, 500.
  - 실행: `npm run test app/api/admin` exit 0.

### PR2 Final Verification Wave

- [x] F2. [PR2] tsc·lint·test 그린(mock, 키 불요) + OOTD 무회귀
  **검증 단계**: `npx tsc --noEmit`(0) → `npm run lint`(0) → `npm run test`(신규 admin 테스트 + 기존 ootd/wishlist/orders 전부 그린) → `app/api/ootd/route.ts` import diff 0(OOTD 래퍼 무수정 확인). 기대결과: 키 없이 통과, OOTD 회귀 0.

- [x] F3. [PR2] 실 업로드 수동 검증 (사용자 사전작업 완료 후) — product-images 라운드트립(업로드/서빙/삭제) 200 확인. 풀 UI E2E는 PR3 폼에서.
  **검증 단계**: 버킷·env 완료 확인 → `npm run dev` → admin 로그인 → `curl`/임시 폼으로 `POST /api/admin/products`(jpg 1장 + 필드) → Supabase `product-images`에 파일 생성 + DB Product 행 확인(`prisma/check-product.ts <id>` 또는 `/product/<id>` 방문) → 비admin/비로그인 호출 403/401 확인. 기대결과: end-to-end 등록 정상.

---

## PR3 — admin 등록 UI (`feat/admin-product-ui`, PR2 머지 후)

### PR3 Wave 1 (등록 폼)

- [x] 10. [PR3] `/admin/products/new` 등록 폼 + 이미지 업로드 + 제출→상세 이동 `category:visual-engineering`
  **Goal**: `app/admin/products/new/page.tsx`(+ 필요 시 클라 폼 컴포넌트) 신규. 필수(name/brand/price/category select 6종/이미지 파일) + 선택 필드 입력 → `multipart/form-data`로 `POST /api/admin/products` → 성공 시 `/product/[id]` 이동(즉시 노출 확인), 실패 시 에러 표시. 미리보기(선택).
  **References**:
  - `app/checkout/page.tsx` / `app/login/page.tsx` — 기존 폼 입력·버튼·에러 표시 **스타일 재사용**(코딩 직전 grep으로 input className·제출 핸들러 패턴 확인).
  - `app/what-to-wear/page.tsx`(OOTD 업로드 폼, PR3에서 추가됨) — 파일 input + `FormData` 제출 패턴 차용.
  - `components/ootd/ProductTagPicker.tsx`(#33) — 썸네일/입력 UI 톤 참고(선택).
  - `types/index.ts`(CreateProductInput)·`ProductCategory`(6종 select).
  - 결정표 #7·#9·#12·#13.
  **구현 메모**:
  - `"use client"` 폼. category = `<select>` 6종(All 제외). 이미지 = `<input type="file" accept="image/jpeg,image/png,image/webp">` + 클라 사전검증(크기/타입, 서버가 정본 — 보조).
  - sizes/colors = 콤마 구분 텍스트 입력(placeholder "S, M, L"). 배지 = 체크박스.
  - 제출: `FormData` 구성 → `fetch("/api/admin/products",{method:"POST",body:fd})` → `{success,data:{id}}` → `router.push("/product/"+id)`. 실패 시 `error` 표시.
  - 페이지는 middleware로 보호되지만, 서버 컴포넌트 래퍼에서 `auth()`+`isAdmin` 재확인 후 폼 렌더(이중 — 비admin 직접 접근 시 빈 화면 대신 안내/리다이렉트).
  **Must NOT do**: 서버 전용 `lib/products`/`lib/supabase-storage`/`lib/admin`를 클라 폼에서 import 금지(API 경유). 디자인 시스템 무시한 새 색/폰트 금지(기존 폼 톤 유지). 다중 이미지 업로드 UI 금지(1장 — 결정표 #7). 상품 수정/삭제 UI 금지(범위 외).
  **QA Scenarios**:
  - Happy: admin이 필수 입력 + jpg 선택 → 제출 → 200 `{success,data:{id}}` → `/product/[id]` 이동, 신규 상품 상세 렌더.
  - Negative(검증): price 비숫자/음수, category 미선택, 이미지 미선택 → 클라/서버 에러 표시(제출 차단 또는 400 표시).
  - Negative(권한): 비admin이 URL 직접 접근 → middleware 리다이렉트 + 서버 컴포넌트 재확인.
  - 즉시 반영: 등록 후 `/shop`(또는 목록)에서 신규 상품 노출(revalidatePath 효과).

### PR3 Wave 2 (선택 — 목록)

- [x] 11. [PR3] (선택) `/admin/products` 등록 상품 목록 — **생략**(등록 폼으로 트랙 목표 충족, 추후 필요 시 별도) `category:visual-engineering`
  **Goal**(선택, 시간 여유 시): `app/admin/products/page.tsx` — `getAllProducts()` 서버 조회로 상품 목록 표시(등록 결과 확인 + "신규 등록" 링크). 관리 액션(수정/삭제)은 범위 외 — 읽기 목록만.
  **References**: `app/shop/page.tsx`(상품 그리드 서버 fetch 패턴)·`lib/products.ts:45-48`(getAllProducts).
  **Must NOT do**: 수정/삭제 액션 금지(범위 외). 새 데이터 패턴 금지(getAllProducts 재사용).
  **QA Scenarios**: admin 접근 → 전체 상품 목록(신규 포함) 렌더. 비admin → 게이트.

### PR3 Final Verification Wave

- [x] F4. [PR3] tsc·lint·test·build 그린(기계검증) + Tier2 통과. 풀 UI end-to-end(로그인→폼→등록→노출)는 사용자 수동 확인(머지/배포 후).
  **검증 단계**: `npx tsc --noEmit`(0) → `npm run lint`(0) → `npm run test`(전체 그린) → `npm run dev` → admin 로그인 → `/admin/products/new`에서 실제 상품 등록(이미지 업로드) → `/product/[id]` + `/shop`에서 즉시 노출 확인 → 비admin `/admin/...` 차단 확인. 기대결과: UI end-to-end 등록·노출·게이트 동작.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 (isAdmin) | None | 독립 — env 게이트 헬퍼 |
| 2 (createProduct) | None | 독립 — DB write 헬퍼 |
| 3 (타입) | None | 독립 — 순수 타입 |
| 4 (middleware) | 1 | isAdmin 사용 |
| 5 (ADR/문서) | None | 독립 — 문서 |
| 6 (PR1 테스트) | 1, 2 | 헬퍼 검증 |
| 7 (Storage 일반화) | PR1 머지 | 헬퍼 기반(독립이나 PR 경계) |
| 8 (API) | 7, (1·2 머지됨) | uploadProductImage + isAdmin + createProduct |
| 9 (PR2 테스트) | 8 | 라우트 검증 |
| 10 (UI 폼) | PR2 머지 | API 소비 |
| 11 (목록, 선택) | 10 | 동일 게이트 |

---

## Parallel Execution Graph

```
PR1 (feat/admin-product-upload):
Wave 1 (병렬): Task 1(isAdmin) · Task 2(createProduct) · Task 3(타입) · Task 5(문서)
              → Task 4(middleware, Task1 후)
Wave 2: Task 6(테스트, Task1·2 후)
→ F1
PR1 Critical Path: Task 1 → 4 → 6

PR2 (feat/admin-product-api, PR1 머지 후):
Wave 1: Task 7(Storage 일반화)
Wave 2: Task 8(API, Task7 후)
Wave 3: Task 9(테스트, Task8 후)
→ F2 → F3(사용자 사전작업 후)
PR2 Critical Path: Task 7 → 8 → 9

PR3 (feat/admin-product-ui, PR2 머지 후):
Wave 1: Task 10(폼)
Wave 2: Task 11(목록, 선택)
→ F4
PR3 Critical Path: Task 10 → F4
```

---

## Category + Skills

| Task | Category | 이유 |
|------|----------|------|
| 1 | ultrabrain | 보안 게이트(allowlist 정규화·edge·기본값 닫힘) |
| 2 | ultrabrain | DB write·id 생성·category 검증(SSoT 실행) |
| 3 | quick | 순수 타입 |
| 4 | ultrabrain | 인증 미들웨어·Zero Trust 경계 |
| 5 | writing | ADR/문서 정합 |
| 6 | ultrabrain | 보안 게이트·write 헬퍼 테스트 |
| 7 | ultrabrain | 공유 모듈 일반화(무회귀 보존) |
| 8 | ultrabrain | 업로드·보상·이중 게이트·검증(보안+비가역) |
| 9 | ultrabrain | 보상·게이트 테스트 |
| 10 | visual-engineering | 등록 폼 UI/UX |
| 11 | visual-engineering | 목록 UI(선택) |

---

## Test Strategy
- [ ] **단위(Prisma+Storage+auth mock)**: isAdmin(정규화/경계), createProduct(id·category·기본값), admin products 라우트(401/403/검증/업로드/보상). ADR-003 하이브리드.
- [ ] **회귀**: 기존 ootd/wishlist/orders/auth/try-on 테스트 그린(특히 Storage 일반화 후 OOTD 무회귀).
- [ ] **수동 통합**(사용자 사전작업 후): 실 업로드 → Supabase product-images 파일 + DB 행 + 상세/목록 노출 + 게이트.
- **OUT**: e2e Playwright, 커버리지 게이트.

## Success Criteria
- [ ] admin(allowlist)만 `/admin/...` + `POST /api/admin/products` 접근(비admin 403/리다이렉트) — Zero Trust 이중 게이트.
- [ ] 등록 시 `product-images`에 이미지 업로드 + `Product` DB 행(id=randomUUID) 생성, create 실패 시 이미지 보상 삭제.
- [ ] 등록 상품이 `/product/[id]`(ISR on-demand) + 목록(revalidatePath)에 즉시 노출.
- [ ] Storage 헬퍼 일반화 후 OOTD 무회귀(ootd 라우트 import 무수정, 테스트 그린).
- [ ] 스키마/next.config/의존성 변경 0(결정2·실측 근거). `tsc`/`lint`/`test` green + Tier 2 적대검증 통과.
- [ ] ADR-008 + 결정표로 선결 3결정 문서화, seed 비파괴 upsert 불변.

## Risks / Rollback
| Risk | 영향 | 완화/롤백 |
|------|------|-----------|
| `session.user.email` 미탑재 → 게이트 항상 닫힘/열림 | admin 접근 불가/우회 | NextAuth 기본 세션 email 탑재(F-검증 수동 확인). 미탑재 시 auth.ts session 콜백에 email 보강(Ask First — 별도 micro task) |
| middleware edge에서 env 미주입 | 게이트 오동작 | `ADMIN_EMAILS`는 서버 env(edge 가용). 빈 env 시 기본값 "닫힘"(안전). 수동 확인 |
| Storage 일반화가 OOTD 회귀 | OOTD 업로드 고장 | OOTD 래퍼 시그니처 불변 + ootd route.test 그린(F2). 회귀 시 래퍼만 롤백 |
| 등록 후 목록 미갱신 | "즉시 노출" 미충족 | `revalidatePath` 호출 + 상세 dynamicParams. 코딩 시 getAllProducts 소비 경로 grep 확인 |
| admin 상품 DB 리셋 소실 | 콘텐츠 손실 | ADR-008 명문화(DB가 백업). dev 리셋은 정상, 운영은 Supabase 백업 |
| 라우트 구조 Ask First 미승인 진행 | 정책 위반 | PR2 Wave 1에서 `app/api/admin/products` 구조 diff 승인 먼저 |

## Decisions
- 2026-06-24: 선결 3결정 인터뷰 확정 — ① 상품 SSoT = DB(런타임/admin), seed = 부트스트랩(ADR-008) ② admin 권한 = env `ADMIN_EMAILS` allowlist(스키마 무변경) ③ Storage = 신규 `product-images` 버킷 + 헬퍼 일반화.
- 2026-06-24: handoff "스키마/권한 → API+Storage → UI" 분할을 결정2(allowlist=스키마 무변경)에 맞춰 "권한+헬퍼+ADR → Storage+API → UI"로 조정. 스키마 PR 소거, next.config/의존성 변경 불필요(실측).
- 2026-06-24: admin 상품 id = `crypto.randomUUID()`(의존성 0, 스킬 숫자 네임스페이스와 분리). 이미지 1장 MVP(다중 갤러리 OUT). 등록만(수정/삭제 OUT).

## Implementation Log
_(Phase 시작 후 누적)_
