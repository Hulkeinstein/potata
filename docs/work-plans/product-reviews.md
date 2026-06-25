# Work Plan: 상품 리뷰 작성 기능 (Product Reviews)

> 브랜치: `feat/product-reviews` (생성됨, 클린) · 작업 루트: `e:\kamwoo\6.Programing\Potata\potata`
> PR 분할: **PR1 (스키마+API)** → **PR2 (UI 연결)**. 각 PR은 독립 squash merge.

## Overview

- **Objective**: 로그인한 **구매자**가 상품에 별점(1~5)+코멘트 리뷰를 **작성·수정·삭제·조회**하고, 리뷰 변경 시 `Product.rating`(평균)·`reviewCount`를 `$transaction`으로 원자적 재집계해 기존 BEST 배지(별점≥4.8 & 리뷰≥100, `lib/products.ts:68`)를 **자동으로** 채운다.
- **Scope**:
  - **IN**: Review 모델(+Product 역관계) · `app/api/products/[id]/reviews` GET/POST(upsert)/DELETE · 구매자 권한 게이트 · `$transaction` aggregate 재집계 · 단위테스트 · 리뷰 목록 컴포넌트 · 별점 작성/수정 폼 · 본인 삭제 버튼 · ProductDetailClient Review 탭 client fetch 연동
  - **OUT** (명시적 제외):
    - **Q&A 탭** (`ProductDetailClient.tsx:305-322`) — 손대지 않는다. 동일 골격이 옆에 있어도 절대 건드리지 않음.
    - 결제 게이트웨이 연동 (현재 미연동 — 권한은 status 무관 처리)
    - 리뷰 신고/모더레이션/관리자 숨김
    - 이미지 첨부 리뷰
    - 정렬 옵션 UI · 무한스크롤/페이지네이션 고도화 (GET은 단순 최신순 전체 반환)
    - 리뷰 좋아요/도움돼요(helpful) 기능
- **Approach**: 기존 선례를 **차용**한다(신규 패턴 발명 금지). Review 모델 = `WishlistItem`(schema:97-107) 패턴. API = `wishlist/route.ts` auth 게이트 + `{success,data|error}` + `extractErrorMessage`. 재집계 = `orders/route.ts:99-112` `$transaction` 패턴. 구매자 게이트 = `orders GET:136` Order fetch + JS 필터(ADR-004 Json 컬럼 제약 우회). UI 데이터 흐름 = wishlist client fetch 선례(SSR prop 변경 최소화).

## Context

### Project Context (from docs/)
- **Product Goal (북극성)**: 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·OOTD·관리자 상품 등록·배지 자동화 완료. **다음 = 참여형 콘텐츠(리뷰)** — 이 plan이 직접 그 트랙이다.
- **ADR Constraints Applied** (DO NOT RE-DECIDE):
  - **ADR-004**: `Order.items` = Json 스냅샷(`OrderItemSnapshot[]`), 관계형 `OrderItem` 없음 → 구매자 게이트는 Prisma join 불가, **유저 Order fetch 후 JS `items.some(s => s.productId === id)` 필터가 유일 경로**.
  - **ADR-005**: `Product.id` = String @id(수동, @default 없음). `rating Float?`·`reviewCount Int?` 이미 존재(schema:79-80). 상세 ISR `revalidate=3600`, `dynamicParams=true`.
  - **ADR-008**: 상품 SSoT = DB(런타임/admin).
- **Aligned with Existing Plans**: 독립 트랙. `roadmap.md` 차기 항목. OOTD/admin/배지 자동화 위에 얹음.

### Interview Summary (선결 결정 — 전부 확정)
- **결정 ① Review 스키마**: `@@unique([userId, productId])` 채택(1인 1상품 1리뷰). 재작성 = upsert(신규 아님).
- **결정 ② 집계 방식**: 매번 `review.aggregate({_avg:{rating}, _count:true})` 재계산. 증분 running-average **금지**(부동소수 오차/레이스). 같은 `$transaction` 안에서 리뷰 변경 → aggregate → product.update 원자적.
- **결정 ③ 권한 = 구매자만**: 해당 상품을 주문한 유저만 작성. ADR-004 제약 → 유저 Order fetch 후 JS 필터. 결제 미연동 → status 무관(PENDING 포함)하게 "해당 상품 포함 주문 보유 = 구매".
- **결정 ④ 범위 = 작성+조회+수정+삭제**: 작성/수정 = upsert(같은 $transaction 재집계), 본인 삭제 = delete(같은 $transaction 재집계). 타인 리뷰 수정/삭제 불가(`session.user.id` 소유 검증).
- **추가 설계 결정**:
  - **rating 반올림**: 평균을 소수 1자리 저장(`Math.round(avg*10)/10`). 리뷰 0건 시 `rating=null`, `reviewCount=0`. BEST 경계는 반올림 후 평가됨을 DoD 명시.
  - **comment**: optional(`String?`). 빈 문자열은 null로 정규화. 별점만 남기는 리뷰 허용.
  - **API 위치**: `app/api/products/[id]/reviews/route.ts`. `[id]` = productId.
  - **목록 데이터 흐름**: GET API를 ProductDetailClient에서 client fetch(wishlist 선례). page.tsx SSR prop 변경 최소화.
  - **캐시**: 변경 성공 시 `revalidatePath(\`/product/${id}\`)` + `revalidateTag("products")`(목록 배지 갱신). `getProductById`는 **의도적 non-cached plain findUnique 유지 — 캐시 추가 절대 금지**(lib/products.ts:102-105 주석 근거).

### Research Findings (Explore — stale 재확인 완료 2026-06-24)
- `prisma/schema.prisma:66-95` — Product에 Review 역관계 **없음**. `rating Float?`(:79)·`reviewCount Int?`(:80) 존재. `WishlistItem:97-107` = clone 대상 패턴(`@id @default(cuid())` + userId/user(onDelete:Cascade) + productId/product(onDelete:Cascade) + `@@unique([userId,productId])` + `@@index([userId])`).
- `app/api/wishlist/route.ts:1-97` — auth() 401 게이트 + `{success,data|error}` + `extractErrorMessage` + FK 선차단(상품 존재 확인 :58-67). 그대로 차용.
- `app/api/orders/route.ts:99-112` — `prisma.$transaction(async (tx) => ...)`. GET:136-138 = `order.findMany({where:{userId}})` (구매자 게이트 Order fetch 원본).
- `lib/products.ts:68` — `isBest = rating != null && rating >= 4.8 && (reviewCount ?? 0) >= 100`. `getProductById:106-109` plain findUnique(non-cached, 의도적). `getCachedProductRows:77-81`만 `tags:["products"]`.
- `components/product/ProductDetailClient.tsx` — `productRating`(:42)·`productReviewCount`(:43) 파생, 탭 카운트(:258), Review 탭(:288-303, 완전 정적·하드코딩·"Write a Review" 2개 중복 :293·:299), Q&A 탭(:305-322 = OUT).
- `types/index.ts:245-278` — `OrderItemSnapshot.productId`(:246, JS 필터 타깃), Order 블록 끝(:278) — 신규 Review 타입 추가 위치.
- 테스트 mock: `app/api/admin/products/route.test.ts:1-26` = `vi.hoisted` + `vi.mock("@/auth")` + `vi.mock("next/cache", () => ({revalidateTag, unstable_cache: passthrough}))`. reviews test가 `revalidatePath`도 추가 mock.

### External References (Prisma / Next.js best practices)
- `$transaction` interactive: review.upsert/delete → `review.aggregate({_avg:{rating}, _count:true, where:{productId}})` → `product.update({rating, reviewCount})`. 원자성 보장. (prisma.io/docs transactions, aggregation)
- `@@unique` 복합 + upsert: `where: { userId_productId: { userId, productId } }`. (prisma.io/docs composite-constraints)
- 동시 요청 P2002(`Prisma.PrismaClientKnownRequestError` code `"P2002"`) → 라우트 최상위 catch에서 409 매핑. (prisma.io/docs error-reference)
- `revalidatePath(\`/product/${id}\`)` + `revalidateTag("products")` — 리뷰 후 신선화. (nextjs.org/docs)

### Metis Review
**Identified Gaps** (plan에 반영):
- **Scope Creep(Q&A 탭)**: Q&A 탭이 동일 골격으로 :305-322에 존재 → OUT 명시 + Must NOT do에 박음(TODO 10·11·12).
- **Hidden Complexity 1 (구매자 권한 Json 함정)**: Prisma 직접 필터 불가 → 헬퍼 `hasPurchasedProduct(userId, productId)`로 격리(TODO 4).
- **Hidden Complexity 2 (getProductById non-cached)**: 캐시 추가 절대 금지 → Must NOT do(TODO 8·10).
- **Hidden Complexity 3 (rating Float 반올림 경계)**: `Math.round(avg*10)/10`, 0건 시 null → DoD 명시(TODO 5·6, F4).
- **Schema 사각지대**: Product에 `reviews Review[]` 역관계 없음 → 추가 필수(TODO 1).
- **Missing Acceptance Criteria**: P2002 동시요청 409, 0건 삭제 후 rating=null, 비구매자 403, 타인 리뷰 삭제 403 — QA Scenarios·F-wave에 명시.

## Prerequisites
- [ ] `feat/product-reviews` 브랜치 체크아웃 확인 (최신 main 기반, 클린)
- [ ] `.env.local` DATABASE_URL/DIRECT_URL 유효 (`prisma db push` 대상)
- [ ] `npx prisma generate` 가능 상태

---

# PR1 — 스키마 + API

> Review 모델 + Product 역관계 + `prisma db push` + reviews API(GET/POST upsert/DELETE) + 구매자 게이트 + $transaction 재집계 + 단위테스트.

## TODOs

### Wave 1 (병렬 — 공유 의존성 먼저)

- [x] 1. Review 모델 + Product 역관계 추가 (schema) `category:ultrabrain`
  **Goal**: `prisma/schema.prisma`에 Review 모델 추가 + Product에 `reviews Review[]` 한 줄 추가. `npx prisma generate` 성공, `Prisma.ReviewCreateInput`·`review` 델리게이트 타입 생성됨.
  **References** (WHY):
  - `prisma/schema.prisma:97-107` — `WishlistItem` = clone 원본. `id String @id @default(cuid())` + userId/user(`onDelete: Cascade`) + productId/product(`onDelete: Cascade`) + `@@unique([userId, productId])` + `@@index([userId])` 구조를 그대로 따른다.
  - `prisma/schema.prisma:87-90` — Product 관계 목록 끝(`ootdTags OOTDPostProduct[]` 다음 줄)에 `reviews Review[]` 추가. **없으면 Review.product @relation이 컴파일 에러.**
  - `prisma/schema.prisma:11-28` — User 관계 목록에 `reviews Review[]` 추가(User.relation도 양방향 필요).
  - `prisma/schema.prisma:79-80` — `rating Float?`·`reviewCount Int?` **이미 존재** — 추가하지 말 것(중복 금지).
  **신규 필드**: `rating Int`(1~5, 정수 — 별점), `comment String?`(optional), `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`. `@@index([productId])`(목록 조회용) + `@@index([userId])` 추가.
  **Must NOT do**: Product의 기존 `rating Float?`/`reviewCount Int?` 변경/삭제 금지(이건 집계 저장용, Review.rating(Int)과 다름). Review.rating은 Int(개별 별점), Product.rating은 Float(평균) — 혼동 금지. OrderItem 관계형 모델 추가 금지(ADR-004).
  **QA Scenarios**:
  - Happy: `npx prisma generate` → exit 0, `node_modules/.prisma/client`에 Review 타입 생성.
  - Edge: `npx prisma format` → schema 문법 valid, 관계 양방향 매칭 확인(에러 없음).
  - Negative: Product에 `reviews Review[]` 누락 시 `prisma generate`가 "missing opposite relation field" 에러 → 반드시 추가됨을 확인.

- [x] 2. Review 타입 정의 추가 (types) `category:quick`
  **Goal**: `types/index.ts`에 `Review`·`CreateReviewRequest`·`ReviewListResponse` 타입 추가. API 응답/요청 계약 정의.
  **References** (WHY):
  - `types/index.ts:245-278` — Order/OrderItemSnapshot 블록. **이 블록 다음(:278 이후)** 에 "// 리뷰 관련 타입" 섹션으로 추가(파일 컨벤션 유지).
  - `types/index.ts:258-268` — `Order` 인터페이스 = 날짜를 `string`(ISO)로 두는 컨벤션 → Review.createdAt도 `string`.
  **타입 형태**: `Review { id, userId, userName, productId, rating: number, comment: string | null, createdAt: string, updatedAt: string }`. `CreateReviewRequest { rating: number; comment?: string }`(productId는 URL param, body 불신). `ReviewListResponse { reviews: Review[]; averageRating: number | null; reviewCount: number }`.
  **Must NOT do**: body에 userId 필드 추가 금지(session.user.id만 신뢰 — CLAUDE.md). productId를 CreateReviewRequest에 넣지 말 것(URL `[id]`에서 취득).
  **QA Scenarios**:
  - Happy: `npx tsc --noEmit` → exit 0, 신규 타입 import 가능.
  - Edge: `userName`은 리뷰 작성자 표시용(User.name) — Review에 비정규화 포함 또는 GET에서 join select. 타입에 명시.
  - Negative: CreateReviewRequest에 userId 없음을 확인(보안 불변식).

### Wave 2 (Wave 1 완료 후 — 병렬)

- [x] 3. 리뷰 집계 헬퍼 `recomputeProductRating(tx, productId)` (lib) `category:ultrabrain`
  **Goal**: `lib/reviews.ts` 신규. `$transaction` 콜백 내에서 호출할 순수 집계 함수 — 해당 productId의 리뷰를 aggregate해 `Product.rating`(Float, 소수1자리)·`reviewCount`(Int) update. 리뷰 0건이면 `rating=null, reviewCount=0`.
  **References** (WHY):
  - `app/api/orders/route.ts:100-112` — `$transaction(async (tx) => ...)` 시그니처. 헬퍼는 `tx: Prisma.TransactionClient`를 인자로 받아 같은 트랜잭션에 참여.
  - `lib/products.ts:18-21` — `BEST_MIN_RATING=4.8`/`BEST_MIN_REVIEWS=100` 상수(이 헬퍼가 채우는 값이 isBest를 결정). 변경 금지, 참조만.
  **구현 요점**: `const agg = await tx.review.aggregate({ where: { productId }, _avg: { rating }, _count: true })`. `const count = agg._count` (또는 `_count._all`). `const avg = agg._avg.rating`. `rating = count === 0 ? null : Math.round(avg * 10) / 10`. `tx.product.update({ where: { id: productId }, data: { rating, reviewCount: count } })`. **매번 전체 재계산**(증분 금지 — 결정②).
  **Must NOT do**: 증분 running-average 금지. 트랜잭션 밖에서 별도 aggregate+update 호출 금지(레이스). `Math.round(avg)` 정수 반올림 금지(소수1자리 유지). `lib/products.ts` isBest 로직 수정 금지(자동 파생이 핵심).
  **QA Scenarios**:
  - Happy: 별점 [5,4] 입력 → avg 4.5 → `rating=4.5, reviewCount=2`.
  - Edge: 별점 [5,4,5,5,5] avg=4.8 → `Math.round(4.8*10)/10=4.8` → BEST 경계 정확히 충족. [4.795 같은 경계]는 Int rating이라 발생 불가지만 평균이 4.75면 4.8로 반올림 안 됨(4.75) → BEST 미충족 확인.
  - Negative: 리뷰 전부 삭제 → count=0 → `rating=null, reviewCount=0`(0이 아닌 null — isBest false).

- [x] 4. 구매자 권한 헬퍼 `hasPurchasedProduct(userId, productId)` (lib) `category:ultrabrain`
  **Goal**: `lib/reviews.ts`(또는 동일 파일)에 구매 여부 판정 함수. 유저의 Order 목록을 fetch한 뒤 JS로 items에 productId 포함 여부 판정. ADR-004(Json 컬럼) 제약의 유일한 경로.
  **References** (WHY):
  - `app/api/orders/route.ts:136-138` — `prisma.order.findMany({ where: { userId } })` (구매자 게이트 fetch 원본).
  - `types/index.ts:245-254` — `OrderItemSnapshot.productId`(:246) = JS 필터 타깃 필드. `Order.items`는 Json이므로 `items as unknown as OrderItemSnapshot[]` 캐스팅 필요.
  - `prisma/schema.prisma:40` — `items Json`(ADR-004) — Prisma where 절로 직접 필터 불가임을 코드 주석에 근거 명시.
  **구현 요점**: `const orders = await prisma.order.findMany({ where: { userId }, select: { items: true } })`. `return orders.some(o => (o.items as unknown as OrderItemSnapshot[]).some(s => s.productId === productId))`. **status 무관**(PENDING 포함 — 결제 미연동, 결정③). 주석에 "ADR-004 Json 제약 + 결제 미연동 → status 무관 구매 간주" 명시.
  **Must NOT do**: Prisma `where: { items: { path:..., array_contains } }` 같은 JSON 필터 시도 금지(스키마가 구조 보장 안 함 — 불안정). status === "PAID" 필터 금지(결제 미연동이라 영구 false 됨). OrderItem 관계형 모델 신규 추가 금지.
  **QA Scenarios**:
  - Happy: userA가 productX 포함 Order 1건 보유 → `true`.
  - Edge: userA가 Order 0건 → `false`. userA의 Order에 productX 없음 → `false`.
  - Negative: PENDING status Order만 있어도 → `true`(status 무관 확인).

### Wave 3 (Wave 1·2 완료 후)

- [x] 5. reviews API GET + POST(upsert) 핸들러 `category:ultrabrain`
  **Goal**: `app/api/products/[id]/reviews/route.ts` 신규. **GET**: 해당 productId 리뷰 최신순 목록 + averageRating + reviewCount 반환(인증 불필요 — 공개 조회). **POST**: auth 게이트 → 상품 존재 확인 → 구매자 게이트(`hasPurchasedProduct`) → rating(1~5 정수) 검증 → `$transaction`{ review.upsert + recomputeProductRating } → revalidate.
  **References** (WHY):
  - `app/api/wishlist/route.ts:8-67` — auth() 401 게이트 + `{success,data|error}` + `extractErrorMessage` + 상품 존재 FK 선차단(:58-67) 패턴 그대로.
  - `app/api/orders/route.ts:100-112` — `$transaction` 패턴. POST는 `tx.review.upsert({ where: { userId_productId: {userId, productId} }, create: {...}, update: {...} })` → `recomputeProductRating(tx, productId)`.
  - `lib/reviews.ts` (TODO 3·4) — `recomputeProductRating`·`hasPurchasedProduct` 사용.
  - Next.js 15 App Router: `[id]` param은 `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params` (Next 15 async params).
  **구현 요점**: GET = `prisma.review.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, include/select user.name })` → ReviewListResponse. POST = rating 검증(`Number.isInteger && 1<=r<=5`, 위반 400), comment 빈문자열→null 정규화, 구매자 아니면 403, 성공 시 `revalidatePath(\`/product/${id}\`)` + `revalidateTag("products")`.
  **Must NOT do**: body의 userId/productId 신뢰 금지(session.user.id + URL param만). 별도 increment 집계 금지($transaction 안 recompute만). getProductById에 캐시 추가 금지(무관 파일).
  **QA Scenarios**:
  - Happy: 구매자가 POST `{rating:5, comment:"good"}` → 201, review 생성, Product.rating/reviewCount 갱신. 같은 유저 재POST `{rating:3}` → upsert 갱신(중복 행 없음), rating 재집계.
  - Edge: comment 없이 `{rating:4}` → 성공(comment=null). comment `""` → null 정규화.
  - Negative: 비구매자 POST → 403. 비로그인 POST → 401. rating=6 또는 0 또는 4.5 → 400. 존재하지 않는 productId → 400.

- [x] 6. reviews API DELETE 핸들러 + P2002 처리 `category:ultrabrain`
  **Goal**: TODO 5 같은 파일에 **DELETE** 추가: auth 게이트 → 본인 리뷰 소유 검증(`session.user.id`) → `$transaction`{ review.delete + recomputeProductRating } → revalidate. 라우트 최상위 catch에 P2002(409) 매핑 추가(동시 upsert 경쟁).
  **References** (WHY):
  - `app/api/wishlist/route.ts:73-78` — 본인 소유 행 delete 패턴(`where: { id: existing.id }`).
  - `app/api/orders/route.ts:115-120` — catch 최상위 + `extractErrorMessage`. 여기에 `if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return 409` 분기 추가.
  - `lib/reviews.ts` — `recomputeProductRating(tx, productId)` 삭제 후 재집계.
  **구현 요점**: DELETE = 본인 리뷰 존재 확인(`review.findUnique({ where: { userId_productId } })`, 없으면 404, userId 불일치는 애초 unique라 본인 것만 조회됨 — 타인 것 삭제 시도는 "없음"으로 404). `$transaction`{ delete → recompute }. 0건 되면 rating=null. P2002는 upsert 동시 경쟁 시 409.
  **Must NOT do**: 타인 리뷰 삭제 허용 금지(`userId_productId`로 본인 것만 타깃). cascade로 Product 삭제 금지. 트랜잭션 밖 재집계 금지.
  **QA Scenarios**:
  - Happy: 본인 리뷰 DELETE → 200, review 삭제, Product.rating 재집계(0건이면 null).
  - Edge: 마지막 리뷰 삭제 → `rating=null, reviewCount=0`, isBest false.
  - Negative: 타인 리뷰 삭제 시도 → 404(본인 것 아님). 비로그인 DELETE → 401. 동시 upsert P2002 → 409.

### Wave 4 (Wave 3 완료 후)

- [x] 7. reviews API 단위테스트 `category:ultrabrain`
  **Goal**: `app/api/products/[id]/reviews/route.test.ts` 신규. GET/POST/DELETE 핸들러를 mock(prisma/auth/next-cache)로 직접 호출해 권한·검증·집계 호출·에러코드 검증. CI 통합테스트 호환.
  **References** (WHY):
  - `app/api/admin/products/route.test.ts:1-60` — `vi.hoisted` mock 초기화 + `vi.mock("@/auth")` + `vi.mock("next/cache", () => ({revalidateTag, revalidatePath, unstable_cache: passthrough}))` + fake Request 헬퍼. **revalidatePath도 mock에 추가**(이 라우트가 사용).
  - `lib/products.test.ts` — `vi.mock("@/lib/prisma")` 패턴.
  **테스트 케이스 (최소)**: ① GET 빈 목록 → reviews:[], averageRating:null. ② POST 비로그인 → 401. ③ POST 비구매자(hasPurchasedProduct→false) → 403. ④ POST rating=6 → 400. ⑤ POST 구매자 정상 → upsert 호출 + recompute 호출(spy) + 200. ⑥ DELETE 타인 리뷰 → 404. ⑦ DELETE 본인 → delete + recompute 호출 + 200.
  **Must NOT do**: 실제 DB 연결 금지(전부 mock). 통합테스트 incrementalCache invariant 깨는 패턴 금지(next/cache passthrough mock 필수). getProductById import 금지(불필요).
  **QA Scenarios**:
  - Happy: `npm run test app/api/products` → 7케이스 green.
  - Edge: recompute가 트랜잭션 콜백 안에서 호출됨을 spy로 검증.
  - Negative: 403/401/400/404/409 각 분기가 정확한 status 반환 확인.

### Wave 5 (PR1 스키마 적용)

- [x] 8. `prisma db push` + generate (DB 반영) `category:quick`
  **Goal**: Review 테이블 + 인덱스를 dev DB에 반영. `npx prisma generate` 재실행으로 클라이언트 동기화.
  **References** (WHY):
  - `CLAUDE.md` Commands — `npx prisma db push`(dev/CI 전용), `npx prisma generate`.
  - `prisma/schema.prisma` (TODO 1 변경분) — push 대상.
  **Must NOT do**: 프로덕션 DB push 금지(dev만). migration 파일 생성 금지(이 프로젝트는 db push 컨벤션). getProductById/lib/products.ts 캐시 추가 금지(무관).
  **QA Scenarios**:
  - Happy: `npx prisma db push` → "Database is now in sync", Review 테이블 생성.
  - Edge: `npx prisma generate` → exit 0, review 델리게이트 사용 가능.
  - Negative: schema 오타로 push 실패 시 TODO 1 회귀.

---

# PR2 — UI 연결

> 리뷰 목록 컴포넌트 + 별점 작성/수정 폼 + 본인 삭제 버튼 + ProductDetailClient Review 탭 client fetch 연동. **Q&A 탭·Detail 탭 미변경.**

## TODOs

### Wave 6 (병렬 — UI 공유 컴포넌트 먼저)

- [x] 9. 별점 표시/선택 컴포넌트 `StarRating` `category:visual-engineering`
  **Goal**: `components/product/StarRating.tsx` 신규. 읽기모드(평점 표시) + 인터랙티브 모드(1~5 선택, hover preview) 겸용. 작성 폼·목록 양쪽 재사용.
  **References** (WHY):
  - `components/product/ProductDetailClient.tsx:6` — `import { Star } from "lucide-react"` 동일 아이콘 사용(일관성).
  - `components/product/ProductDetailClient.tsx:42` — 기존 `productRating` 표시 톤(brand-neon 컬러 :253).
  - `lib/utils.ts` — `cn` 유틸(조건부 className).
  **Props**: `{ value: number; onChange?: (v:number)=>void; readonly?: boolean; size?: "sm"|"md" }`. onChange 있으면 인터랙티브, 없으면 읽기 전용. brand-neon 채움.
  **Must NOT do**: 비즈니스 로직 혼합 금지(순수 표시 컴포넌트). API 호출 금지(상위에서). 새 아이콘 라이브러리 추가 금지(lucide Star).
  **QA Scenarios**:
  - Happy: `<StarRating value={4} />` → 별 4개 채움. 인터랙티브 모드 3번째 클릭 → onChange(3).
  - Edge: value=4.5 readonly → 반별 또는 4개 채움(정책 일관). value=0 → 빈 별 5개.
  - Negative: readonly 모드에서 클릭 → onChange 미호출.

### Wave 7 (Wave 6 완료 후)

- [x] 10. 리뷰 목록 + 작성/수정 폼 컴포넌트 `ReviewSection` `category:visual-engineering`
  **Goal**: `components/product/ReviewSection.tsx` 신규(client). productId prop으로 GET `/api/products/[id]/reviews` client fetch → 목록 렌더 + 평균/카운트 + (로그인 구매자면) 작성/수정 폼(StarRating + comment textarea) + 본인 리뷰 삭제 버튼. POST/DELETE 호출 후 목록 재fetch.
  **References** (WHY):
  - `components/product/ProductDetailClient.tsx:22-36` — wishlist/view client fetch 선례 패턴(`fetch(...).catch`). 같은 client fetch 흐름.
  - `app/api/products/[id]/reviews/route.ts` (PR1) — GET/POST/DELETE 계약 소비.
  - `components/product/StarRating.tsx` (TODO 9) — 별점 입력/표시.
  - `types/index.ts` Review/ReviewListResponse (TODO 2) — fetch 응답 타입.
  - `components/product/ProductDetailClient.tsx:295-300` — 기존 "No reviews yet" 빈 상태 UI 톤(zinc-900/20 카드) 재사용.
  **구현 요점**: useState로 reviews/loading/내 리뷰 추적. 작성 폼은 본인 기존 리뷰 있으면 수정모드(prefill). 비구매자/비로그인은 폼 숨김 + 안내(예: "구매한 상품만 리뷰 작성 가능"). 403/401 응답 graceful 처리.
  **Must NOT do**: **Q&A 탭 로직 복사/수정 금지**. SSR prop으로 리뷰 데이터 전달 금지(client fetch — page.tsx 변경 최소화). getProductById/page.tsx 캐시 변경 금지. 가짜 user 객체 생성 금지(session 기반).
  **QA Scenarios**:
  - Happy: 리뷰 3건 있는 상품 → 목록 3개 + 평균 별점 표시. 구매자 작성 폼 노출 → 제출 → 목록 갱신.
  - Edge: 리뷰 0건 → "Be the first to review" 빈 상태(기존 톤). 본인 리뷰 존재 → 폼 prefill 수정모드 + 삭제 버튼.
  - Negative: 비구매자 → 폼 미노출 + 안내문. 비로그인 → 로그인 유도. 삭제 버튼은 본인 리뷰에만.

### Wave 8 (Wave 7 완료 후)

- [x] 11. ProductDetailClient Review 탭 연동 `category:visual-engineering`
  **Goal**: `components/product/ProductDetailClient.tsx:288-303`의 정적 Review 탭을 `<ReviewSection productId={product.id} />`로 교체. 탭 카운트(:258)는 기존 `productReviewCount`(SSR prop) 유지 + ReviewSection가 동적 카운트 표시.
  **References** (WHY):
  - `components/product/ProductDetailClient.tsx:288-303` — 교체 대상(정적 Review 탭 블록 전체). 하드코딩 "No reviews yet"·중복 "Write a Review" 버튼(:293·:299) 제거.
  - `components/product/ProductDetailClient.tsx:258` — 탭 카운트 `({productReviewCount})` 유지(SSR 초기값).
  - `components/product/ReviewSection.tsx` (TODO 10) — 삽입 컴포넌트.
  **Must NOT do**: **Q&A 탭(:305-322) 한 글자도 변경 금지**. Detail 탭(:269-286) 변경 금지. page.tsx SSR prop 추가/변경 금지(client fetch 흐름 유지). activeTab 상태 로직(:19,:249) 변경 금지(탭 전환 그대로).
  **QA Scenarios**:
  - Happy: Review 탭 클릭 → ReviewSection 렌더(목록 fetch). Detail/Q&A 탭은 기존대로 동작.
  - Edge: 탭 카운트 SSR 초기값 표시 후 ReviewSection가 실제 데이터 fetch.
  - Negative: Q&A 탭 클릭 → 기존 정적 UI 그대로(미변경 확인).

- [x] 12. ReviewSection 컴포넌트 테스트 `category:writing`
  **Goal**: `components/product/ReviewSection.test.tsx` 신규(@testing-library/react + jsdom). fetch mock으로 목록 렌더·빈 상태·폼 노출 조건(구매자/비구매자) 검증.
  **References** (WHY):
  - 기존 컴포넌트 테스트 선례(있으면 `components/**/*.test.tsx` 패턴 차용) + `CLAUDE.md` — Vitest + @testing-library/react + jsdom.
  - `components/product/ReviewSection.tsx` (TODO 10) — 대상.
  **테스트 케이스**: ① 리뷰 목록 렌더(fetch mock 3건). ② 빈 상태 메시지. ③ 비로그인 → 폼 미노출. ④ 별점 선택 + 제출 → POST fetch 호출(mock).
  **Must NOT do**: 실제 API 호출 금지(fetch mock). Q&A 탭 테스트 금지(범위 외).
  **QA Scenarios**:
  - Happy: `npm run test components/product` → green.
  - Edge: fetch reject 시 graceful(에러 안 던짐).
  - Negative: 비로그인 폼 미노출 단언.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | schema — 공유 의존성(델리게이트 생성) |
| 2 | None | 타입 — 독립 |
| 3 | 1 | review 델리게이트 필요 |
| 4 | (none, but 2) | Order/OrderItemSnapshot 타입 — 기존 존재 |
| 5 | 1,2,3,4 | upsert+집계+권한+타입 |
| 6 | 1,3,5 | 같은 route 파일 + recompute |
| 7 | 5,6 | 핸들러 테스트 |
| 8 | 1 | schema 변경 DB 반영 |
| 9 | None (PR2) | 순수 UI 컴포넌트 |
| 10 | 5,6,9,2 | API 계약 + StarRating + 타입 |
| 11 | 10 | ReviewSection 삽입 |
| 12 | 10 | 컴포넌트 테스트 |

---

## Parallel Execution Graph

```
PR1:
Wave 1 (즉시, 병렬):
├── Task 1: Review 모델 + Product/User 역관계 (schema)
└── Task 2: Review 타입 (types)

Wave 2 (Wave 1 후, 병렬):
├── Task 3: recomputeProductRating 헬퍼
└── Task 4: hasPurchasedProduct 헬퍼

Wave 3 (Wave 1·2 후):
├── Task 5: GET + POST(upsert) 핸들러
└── Task 6: DELETE + P2002 (5와 같은 파일 → 순차)

Wave 4: Task 7 (API 테스트)
Wave 5: Task 8 (prisma db push)

PR2:
Wave 6: Task 9 (StarRating)
Wave 7: Task 10 (ReviewSection)
Wave 8 (병렬):
├── Task 11: ProductDetailClient 연동
└── Task 12: ReviewSection 테스트

Critical Path: Task 1 → Task 3 → Task 5 → Task 6 → Task 7 → (PR1 merge) → Task 10 → Task 11
```

---

## Category + Skills

| Task | Category | Category Reason | Skills Omitted (Why) |
|------|----------|----------------|----------------------|
| 1 | ultrabrain | 스키마 설계·관계 무결성·집계 영향 | frontend-ui-ux: no UI |
| 2 | quick | 타입 선언만 | - |
| 3 | ultrabrain | 집계 원자성·반올림 경계·BEST 트리거 | - |
| 4 | ultrabrain | ADR-004 Json 제약 우회 로직 | - |
| 5 | ultrabrain | 권한·검증·트랜잭션 조합 | - |
| 6 | ultrabrain | 소유 검증·P2002·0건 null 집계 | - |
| 7 | ultrabrain | 권한/에러코드 적대 케이스 | - |
| 8 | quick | DB push 명령 실행 | - |
| 9 | visual-engineering | 별점 UI·hover 인터랙션 | - |
| 10 | visual-engineering | 목록·폼·상태 UI + fetch | - |
| 11 | visual-engineering | 탭 통합·기존 톤 유지 | - |
| 12 | writing | 컴포넌트 테스트 작성 | - |

---

## Final Verification Wave

- [x] F1. **타입검사**: `npx tsc --noEmit` → exit 0(에러 0). ✅ PASS
- [x] F2. **린트**: `npm run lint` → exit 0(신규 파일 경고 0, REVIEW_ROW 제거 후). ✅ PASS
- [x] F3. **테스트**: `npm run test` → 137 passed / 6 skipped(CI guard). reviews 7케이스 포함, 회귀 없음. ✅ PASS
- [x] F4. **집계→BEST 자동화 검증**: lib/products.ts:68 isBest 미변경(F7) + recomputeProductRating가 rating/reviewCount 채움 + 단위테스트 ⑤ recompute 호출 확인 → by-construction. ✅ PASS
- [x] F5. **빌드**: `npm run build` → exit 0. `/api/products/[id]/reviews` 동적·`/product/[id]` SSG. ✅ PASS
- [x] F6. **Q&A 탭 미변경 회귀**: git diff ProductDetailClient.tsx 빈 diff(PR1 UI 미변경). ✅ PASS
- [x] F7. **getProductById 캐시 미추가 회귀**: git diff lib/products.ts 빈 diff(page.tsx도 미변경). ✅ PASS
- [x] F8. **Tier2 적대검증**: validator ✅ VALID/APPROVED(100/100, critical 0). oracle ✅ H1(session.user.id undefined 게이트 우회) 발견→수정→재확인 "H1 closed, no blocking issues" + M1/M2 동반 보완. 향후: M3(구매자게이트 풀스캔)·M4(CANCELLED 주문)·L3(User삭제 Cascade 재집계) → 로드맵 기록. ✅ PASS

## Test Strategy
- **방식**: tests-after (각 API/컴포넌트 구현 직후 단위테스트). framework = Vitest + @testing-library/react + jsdom.
- **mock 패턴**: `vi.hoisted` + `vi.mock("@/auth")` + `vi.mock("@/lib/prisma")` + `vi.mock("next/cache", () => ({revalidateTag, revalidatePath, unstable_cache: passthrough}))` (admin/products/route.test.ts:1-26 선례).
- **CI 호환**: next/cache passthrough mock으로 incrementalCache invariant 회피(통합테스트 호환).

## Success Criteria
- [ ] 로그인한 구매자가 상품에 별점(1~5)+코멘트 리뷰를 **작성·수정(upsert)·삭제·조회** 가능
- [ ] 리뷰 작성/수정/삭제 시 `Product.rating`(소수1자리 평균)·`reviewCount`가 **같은 `$transaction`** 으로 원자적 재집계
- [ ] 리뷰 0건 시 `rating=null, reviewCount=0`
- [ ] `Product.rating≥4.8 && reviewCount≥100` 충족 시 **BEST 배지 자동 표시**(lib/products.ts:68 무수정)
- [ ] 비구매자 403 · 비로그인 401 · 잘못된 rating 400 · 타인 리뷰 삭제 404 · 동시 upsert P2002 409
- [ ] `npx tsc --noEmit` · `npm run lint` · `npm run test` · `npm run build` 전부 green
- [ ] Q&A 탭·Detail 탭·getProductById 캐시 **미변경**(회귀 없음)
- [ ] Tier2 적대검증(validator + oracle) 통과
