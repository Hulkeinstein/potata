# Work Plan: Commerce / Checkout MVP (potata P2 — 매출 경로)

## Overview

- **Objective**: 장바구니 → `/checkout` → `POST /api/orders`(로그인 필수 + 서버 가격 재검증) → 주문 DB 저장(`status=PENDING`) → `/mypage/orders` 조회까지, potata의 첫 매출 경로(end-to-end checkout)를 동작시킨다.
- **Scope**:
  - **IN**:
    - `Order` 모델 + `OrderStatus` enum(PENDING/PAID/CANCELLED) Prisma schema 추가, `User.orders` 역관계.
    - `POST /api/orders` Route Handler: `auth()` 게이트(미인증 401), 서버 가격 재검증(Zero Trust), `prisma.$transaction`으로 Order 생성, `idempotencyKey` 중복 방지.
    - `GET /api/orders` (또는 서버 컴포넌트 직접 조회) — 본인 주문 목록.
    - `/checkout` 페이지: cart-store 수동 hydration, 주문 요약, 주문 생성 호출, 성공 시 cart clear + `/mypage/orders` 리다이렉트.
    - `CartDrawer` Checkout 버튼 배선(`onClick` → `/checkout`).
    - `/mypage/orders` 페이지: 본인 주문 목록 표시(JSON 스냅샷 렌더).
    - `mypage/page.tsx` 깨진 링크 정정(`href:"/orders"` → `/mypage/orders`).
    - `types/index.ts`: `Order` / `OrderItemSnapshot` / 주문 API 요청·응답 타입 추가.
    - ADR 1건(Order 설계: JSON 스냅샷 + 로그인 필수 + 결제 분리 + status enum 선반영).
    - hybrid 테스트(단위 mock + 통합 실 Postgres).
  - **OUT** (right-sized — 이번 PR에서 명시적 제외):
    - 결제 게이트웨이 연동(Stripe 등) — `status=PENDING`까지만, 결제는 추후 PR.
    - 관계형 `OrderItem` 테이블 — JSON 스냅샷으로 대체(Product FK 불가, MVP 화면은 단순 목록).
    - 카탈로그 `Product` 모델 DB화 — P3. MVP는 `data/dummy.ts` 유지.
    - 쿠폰/포인트/프로모션, 재고관리(stock 차감), 환불/취소 플로우(enum 값만 선반영, 동작 미구현), 주소록/배송지 관리, 게스트(비회원) 주문.
- **Approach**: Order 항목을 관계형으로 정규화하지 않고 **`Json` 컬럼(items) 스냅샷**으로 저장한다. 이유: (1) 카탈로그가 아직 DB가 아니라 `data/dummy.ts`이므로 Product FK를 걸 수 없고, (2) 주문은 "구매 시점 가격/상품 정보의 불변 기록"이라 스냅샷이 의미론적으로 정확하며, (3) MVP 화면이 단순 목록이라 join/쿼리 복잡도가 불필요하다. 결제는 `status` enum을 선반영해 추후 재마이그레이션을 최소화한 채 분리한다. 가격은 **클라이언트 cart-store를 신뢰하지 않고 서버가 productId로 `data/dummy.ts`를 재조회해 재계산**한다(보안 필수).

---

## 확정 결정 요약 (DO NOT RE-DECIDE)

| # | 결정 | 내용 |
|---|------|------|
| 1 | **결제 분리** | Order를 `status=PENDING`으로 생성+DB 기록까지만. 결제 연동은 추후 PR. `OrderStatus` enum(PENDING/PAID/CANCELLED) **선반영**(추후 재마이그레이션 최소화). |
| 2 | **JSON 스냅샷** | 주문 항목을 `Order.items`(`Json`) 컬럼에 스냅샷. 관계형 `OrderItem` 테이블 만들지 않음. 스냅샷 필드: productId/name/brand/price/imageUrl/size/color/quantity. **price는 서버 재조회 값**. |
| 3 | **로그인 필수** | 체크아웃 `await auth()` 게이트(미인증 401). `Order.userId` NOT NULL. 비회원 주문 불허. |

### Project Context (코드 검증 완료 — 재결정 금지)

- Stack: Next.js 16.1.6 + React 19, Prisma 6 + Supabase(pgbouncer), NextAuth v5 JWT, Zustand, Tailwind 4, Framer Motion.
- 가격 = **AED 정수(Int)**. Decimal/currency 필드 금지. `data/dummy.ts` price 정수(719/685 등). `formatPrice(aed)` → `"AED 719"` (`lib/utils.ts`).
- API 컨벤션: Route Handler, try-catch 핸들러 최상위 1개, 응답 `{success,error?,message?,data?}`(`types/index.ts` `ApiResponse`), `extractErrorMessage(error)` 사용.
- 인증 게이트 패턴(try-on #15): `const session = await auth(); if(!session?.user) return NextResponse.json({success:false,error:"Unauthorized"},{status:401});`. librarian의 `auth(async req=>)` 래퍼는 채택 안 함(기존 일관성 유지).
- DB 다중쓰기 = `prisma.$transaction(async tx => {...})` (`verify/route.ts:82-103` 선례).
- 카탈로그 = `data/dummy.ts` PRODUCTS 8개(P3까지, Product 모델/FK 없음). 서버 가격 재검증 소스.
- 브랜치 정책: `main` 직접 commit 금지. 현 브랜치 `feat/commerce-checkout`. vitest + CI 구축됨.

---

## Prerequisites

- [ ] 현재 브랜치가 `feat/commerce-checkout`인지 확인(아니면 main에서 분기).
- [ ] `.env.local`에 `DATABASE_URL` / `DIRECT_URL` 존재(Prisma db push 및 통합테스트용 실 Postgres).
- [ ] `npm run test`, `npx tsc --noEmit`, `npm run lint` 베이스라인 green 확인(시작 전 회귀 기준선).
- [ ] **Ask First 경계**: `prisma/schema.prisma` 변경은 사용자 승인 필요 항목 — 본 plan으로 승인 갈음, 단 `npx prisma db push`는 dev/CI DB에만 실행(프로덕션 금지).

---

## ADR 필요 여부

**신규 ADR 1건 권장** — `docs/adr/NNNN-order-json-snapshot.md`:
- 제목 예: "Order는 관계형 OrderItem 대신 JSON 스냅샷으로 저장한다".
- 기록할 결정: (1) JSON 스냅샷 vs 관계형 OrderItem 트레이드오프, (2) 로그인 필수(userId NOT NULL), (3) 결제 분리 + status enum 선반영, (4) 서버 가격 재검증(Zero Trust) 원칙.
- 작성 시점: PR A 내에서 schema 변경과 함께 커밋(결정의 컨텍스트 보존).

---

## PR 분할

> 3개 PR로 분할(독립 머지 가능, 순서 의존). PR A 머지 후 B, B 머지 후 C.
> **PR A = 백엔드/계약(매출 로직의 핵심·보안)**, PR B = 체크아웃 UI 배선, PR C = 주문 조회 표시.

---

## PR A — schema + types + API + 테스트 `branch: feat/commerce-checkout`

> 매출 경로의 보안·계약 레이어. 서버 가격 재검증·스냅샷·auth 게이트·$transaction·멱등성이 모두 여기에 집약.

### Wave A1 (병렬 — 공유 의존성 먼저)

- [x] 1. `types/index.ts`에 Order 도메인 타입 추가 `category:quick`
  **Goal**: `OrderItemSnapshot`, `Order`, `CreateOrderRequest`, `OrderResponse` 타입이 `types/index.ts`에 추가되고 `npx tsc --noEmit` 통과.
  **References**:
  - `types/index.ts:126-149` — 기존 `CartItem`, `ApiResponse<T>` 정의 패턴(스타일·export 방식 그대로 따름).
  - `data/dummy.ts` PRODUCTS — 스냅샷 필드(productId/name/brand/price/imageUrl/size/color/quantity)가 실제 Product 형태와 일치하는지 확인.
  - `types/index.ts:6-25` — `Product` 인터페이스(스냅샷 필드 출처).
  **타입 설계**:
  - `OrderItemSnapshot { productId: string; name: string; brand: string; price: number; imageUrl: string; size?: string; color?: string; quantity: number; }` (price = 서버 재조회 AED Int).
  - `OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED'` (Prisma enum과 문자열 동기화).
  - `Order { id; userId; items: OrderItemSnapshot[]; subtotal; shipping; total; status: OrderStatus; idempotencyKey?: string|null; createdAt: string; }`.
  - `CreateOrderRequest { items: { productId: string; quantity: number; size?: string; color?: string }[]; idempotencyKey?: string; }` — **price/name 등 표시정보는 받지 않거나 받아도 무시**(서버가 재조회).
  **Must NOT do**: 가격(price)을 `CreateOrderRequest`의 신뢰 입력으로 설계하지 말 것(클라 가격 신뢰 금지). Decimal/string 가격 타입 금지(Int). 관계형 OrderItem 타입 만들지 말 것.
  **QA Scenarios**:
  - Happy path: `npx tsc --noEmit` → exit 0.
  - Negative: `CreateOrderRequest`에 `price` 필드가 없는지 grep으로 확인(서버 재검증 강제).

- [x] 2. `prisma/schema.prisma`에 Order 모델 + OrderStatus enum 추가 `category:ultrabrain`
  **Goal**: `OrderStatus` enum, `Order` model, `User.orders Order[]` 역관계가 추가되고 `npx prisma generate` + `npx prisma db push`(dev DB) 성공.
  **References**:
  - `prisma/schema.prisma:11-22` — 기존 `User` 모델(여기에 `orders Order[]` 추가).
  - `prisma/schema.prisma:24-36` — `VerificationCode` 모델(cuid id, `@@index`, `createdAt` 패턴 동일하게 따름).
  **스키마(확정)**:
  ```prisma
  enum OrderStatus { PENDING PAID CANCELLED }

  model Order {
    id             String      @id @default(cuid())
    userId         String
    user           User        @relation(fields: [userId], references: [id])
    items          Json        // OrderItemSnapshot[] 스냅샷
    subtotal       Int
    shipping       Int
    total          Int
    status         OrderStatus @default(PENDING)
    idempotencyKey String?     @unique
    createdAt      DateTime    @default(now())
    updatedAt      DateTime    @updatedAt

    @@index([userId, createdAt])
  }
  // User 모델에 추가: orders Order[]
  ```
  **Must NOT do**: `Decimal`/`Float` 가격 컬럼 금지(Int 유지). 관계형 `OrderItem` 테이블 생성 금지. `userId`를 nullable로 만들지 말 것(로그인 필수). `npx prisma db push`를 프로덕션 DB에 실행 금지(dev/CI 전용). 기존 User/VerificationCode 모델 필드 변경 금지(orders 역관계 추가만).
  **QA Scenarios**:
  - Happy path: `npx prisma generate` → exit 0; `npx prisma db push` → "Database is now in sync".
  - Edge case: `idempotencyKey`에 동일 값 2회 insert 시 unique 제약 위반(다음 task에서 검증).
  - Negative: User/VerificationCode 기존 컬럼 diff 없음(스키마 외과적 변경 확인).

### Wave A2 (Wave A1 완료 후 — 핵심 로직)

- [x] 3. `POST /api/orders` Route Handler 구현 (auth + 서버 가격 재검증 + $transaction) `category:ultrabrain`
  **Goal**: `app/api/orders/route.ts`의 `POST`가 미인증 401, 잘못된 입력 400, 정상 시 `Order` 생성 후 `{success:true,data:order}` 반환. `npx tsc --noEmit` + 단위 테스트 통과.
  **References**:
  - `app/api/try-on/route.ts:20-27` — `auth()` 게이트 패턴(정확히 복제; 단 응답은 `{success:false,error:"Unauthorized"}` 형태로 통일).
  - `app/api/auth/verify/route.ts:82-103` — `prisma.$transaction(async (tx)=>{...})` 콜백 패턴(복제).
  - `data/dummy.ts` PRODUCTS — 서버 가격 재검증 소스(productId로 재조회).
  - `lib/auth.ts:25` `extractErrorMessage` — catch 블록 에러 메시지 추출(verify/signup 라우트가 `@/lib/auth`에서 import; `lib/utils.ts` 아님).
  - `types/index.ts` (task 1) — `CreateOrderRequest` / `Order` 타입.
  **구현 요건(보안 필수)**:
  - 1단계 auth 게이트: `const session = await auth(); if(!session?.user) return 401`.
  - 2단계 입력 검증(Zero Trust): `items` 배열 비어있지 않음, 각 `quantity > 0`(정수), `productId` 문자열.
  - 3단계 **서버 가격 재검증**: 각 item의 `productId`로 `data/dummy.ts` PRODUCTS 재조회. **존재하지 않는 productId → 400 거부**. 스냅샷 price = 서버 PRODUCTS의 price(클라 입력 price 무시).
  - 4단계 서버 재계산: `subtotal = Σ(serverPrice × quantity)`, `shipping = subtotal > 50000 ? 0 : 3000`, `total = subtotal + shipping` (전부 Int).
  - 5단계 멱등성: `idempotencyKey` 존재 시 기존 Order 조회 → 있으면 그것을 반환(중복 생성 방지). `$transaction` 내에서 create.
  - 6단계 스냅샷 구성: `OrderItemSnapshot[]`(productId/name/brand/price=서버값/imageUrl/size/color/quantity) → `items` Json.
  - try-catch 1개(핸들러 최상위), catch에서 `extractErrorMessage(error)`.
  **Must NOT do**: 클라이언트가 보낸 price/subtotal/total 신뢰 금지(전부 서버 재계산). shipping 임계값(50000)·배송비(3000)를 클라 입력으로 받지 말 것. try-catch를 중첩하지 말 것(핸들러 최상위 1개). `auth()` 게이트를 다른 체크 뒤로 미루지 말 것(가장 먼저). userId 없이 Order 생성 금지.
  **QA Scenarios**:
  - Happy path: 인증 세션 + `items:[{productId:"<실제 dummy id>",quantity:2}]` → 200, `data.total === serverPrice*2 + shipping`, `data.status === "PENDING"`.
  - Edge case (무료배송 경계): subtotal이 50000 초과면 `shipping === 0`, 50000 이하면 `shipping === 3000`.
  - Negative (미인증): 세션 없이 호출 → 401 `{success:false,error:"Unauthorized"}`, DB에 Order 미생성.
  - Negative (가격 조작): 클라가 `price:1`을 보내도 서버 total은 dummy.ts 실제 가격 기준 — 클라 값 무시 확인.
  - Negative (없는 상품): `productId:"nonexistent"` → 400, Order 미생성.
  - Negative (잘못된 수량): `quantity:0` 또는 `-1` → 400.
  - Edge case (멱등성): 동일 `idempotencyKey`로 2회 호출 → Order 1건만 생성, 두 응답 동일 id.

- [x] 4. `GET /api/orders` 본인 주문 목록 조회 구현 `category:ultrabrain`
  **Goal**: `app/api/orders/route.ts`의 `GET`이 미인증 401, 정상 시 `session.user.id`의 Order 목록을 `createdAt desc`로 반환(`{success:true,data:Order[]}`). 단위 테스트 통과.
  **References**:
  - `app/api/try-on/route.ts:20-27` — `auth()` 게이트 패턴.
  - task 3과 동일 파일(`app/api/orders/route.ts`)에 `GET` export 추가.
  - `prisma/schema.prisma` `Order.@@index([userId, createdAt])` — 조회 인덱스 활용.
  **구현 요건**:
  - auth 게이트(미인증 401).
  - `prisma.order.findMany({ where:{ userId: session.user.id }, orderBy:{ createdAt:"desc" } })`.
  - **본인 주문만** 반환(다른 userId 주문 노출 금지 — IDOR 방지).
  **Must NOT do**: 전체 주문 반환 금지(반드시 userId 필터). 쿼리 파라미터로 받은 userId 신뢰 금지(세션 user.id만 사용).
  **QA Scenarios**:
  - Happy path: 세션 user A로 호출 → A의 주문만 `createdAt desc`.
  - Negative (미인증): 401.
  - Negative (IDOR): user A 세션에서 user B 주문이 응답에 포함되지 않음.

### Wave A3 (Wave A2 완료 후 — 테스트 + ADR)

- [x] 5. `/api/orders` 단위 테스트(mock Prisma + mock auth) `category:ultrabrain`
  **Goal**: `app/api/orders/route.test.ts`가 auth 게이트·서버 가격 재검증·재계산·멱등성·IDOR을 mock 기반으로 검증. `npm run test` 통과.
  **References**:
  - 기존 API 테스트 파일 패턴(있으면 그 mock 스타일 따름; vitest + `vi.mock`).
  - adr-003(hybrid 테스트) — 단위는 mock.
  - task 3·4 구현.
  **테스트 케이스**(task 3·4 QA Scenarios 전부 커버):
  - 미인증 401(POST/GET).
  - 클라 가격 조작 무시(서버 재계산 값으로 total).
  - 없는 productId → 400.
  - quantity ≤ 0 → 400.
  - 무료배송 경계(>50000 → shipping 0).
  - 멱등성(동일 key → 1건).
  - GET 본인 주문만(IDOR 차단).
  **Must NOT do**: 실 DB 연결하지 말 것(단위는 mock). 테스트에서 dummy.ts 가격을 하드코딩 복제하지 말 것(실제 import해서 기대값 산출).
  **QA Scenarios**:
  - Happy path: `npm run test app/api/orders/route.test.ts` → 전 케이스 green.

- [x] 6. 통합 테스트(실 Postgres) — 주문 생성→조회 + DB row 확인 `category:ultrabrain`
  **Goal**: 실 Postgres에 대해 `POST /api/orders` → `Order` row 생성 → `GET /api/orders`로 조회되는 플로우가 GREEN. DB에 row·status PENDING·서버 재계산 total 검증.
  **References**:
  - `app/api/auth/verify/route.ts` 통합 검증 선례(실 Postgres 연동 방식).
  - adr-003(hybrid) — 통합은 실 Postgres.
  - `.env.local` `DATABASE_URL`/`DIRECT_URL`.
  **요건**:
  - 테스트 전후 Order(및 생성한 테스트 User) cleanup.
  - 생성된 Order의 `items`(Json) 역직렬화 → 스냅샷 필드 검증.
  - `status === "PENDING"`, `total` = 서버 재계산 값.
  - 멱등성: 동일 idempotencyKey 2회 → DB Order count 1.
  **Must NOT do**: 프로덕션 DB 대상 실행 금지. 테스트 데이터 cleanup 누락 금지.
  **QA Scenarios**:
  - Happy path: 통합 테스트 실행 → Order row 1건, items 스냅샷 정확, status PENDING.
  - Edge case (멱등성): 동일 key 2회 → DB count 1.

- [x] 7. ADR 작성 — Order JSON 스냅샷 설계 `category:writing`
  **Goal**: `docs/adr/NNNN-order-json-snapshot.md` 생성. JSON 스냅샷·로그인 필수·결제 분리·status enum 선반영·서버 가격 재검증 결정과 트레이드오프 기록.
  **References**:
  - `docs/adr/` 기존 ADR 포맷(번호·Status·Context·Decision·Consequences 구조 따름).
  - 본 plan "확정 결정 요약" + "Approach".
  **Must NOT do**: 결정을 재논의/번복하지 말 것(기록만). 구현 코드 변경 금지(문서 only).
  **QA Scenarios**:
  - Happy path: ADR 파일 존재, 4개 결정(스냅샷/로그인/결제분리/재검증) 모두 명시.

---

## PR B — /checkout UI 배선 `branch: feat/commerce-checkout-ui` (PR A 머지 후)

### Wave B1

- [x] 8. `CartDrawer` Checkout 버튼 → `/checkout` 배선 `category:visual-engineering`
  **Goal**: `components/cart/CartDrawer.tsx:162` Checkout 버튼에 `onClick`(또는 `Link`)으로 `/checkout` 이동 + 드로어 닫기 추가. 빈 장바구니 시 비활성/숨김.
  **References**:
  - `components/cart/CartDrawer.tsx:162` — Checkout 버튼(현재 onClick 없음).
  - `store/cart-store.ts:48-50` — `closeCart` (이동 시 드로어 닫기).
  - `store/cart-store.ts:52-53` — `totalItems`/`totalPrice`(빈 카트 판단).
  **Must NOT do**: 가격 계산 로직을 여기서 새로 만들지 말 것(기존 subtotal/shipping/total 유지). 비즈니스 로직 추가 금지(네비게이션만).
  **QA Scenarios**:
  - Happy path: 항목 있는 카트에서 Checkout 클릭 → `/checkout` 이동 + 드로어 닫힘.
  - Edge case: 빈 카트에서 버튼 비활성(또는 클릭 무동작).

- [x] 9. `/checkout` 페이지 — cart 수동 hydration + 주문 요약 + 주문 생성 `category:visual-engineering`
  **Goal**: `app/checkout/page.tsx`(또는 `app/[locale]/checkout/page.tsx` 라우팅 컨벤션 준수)에서 cart-store 수동 hydration 후 주문 요약 표시, "주문하기" 클릭 시 `POST /api/orders` 호출, 성공 시 cart clear + `/mypage/orders` 리다이렉트.
  **References**:
  - `store/cart-store.ts:57` — `skipHydration:true` → `useCartStore.persist.rehydrate()` 수동 호출(`useEffect`)로 SSR/CSR 가격 불일치 방지.
  - `components/cart/CartDrawer.tsx` — subtotal/shipping/total 계산 로직(재사용 또는 동일 규칙 반영).
  - `lib/utils.ts` `formatPrice` — 가격 표시(`"AED 719"`).
  - `store/cart-store.ts:51` `clearCart`, `store/cart-store.ts` items — 주문 payload 구성.
  - PR A `CreateOrderRequest` 타입 — 요청 body(`items:[{productId,quantity,size,color}]` + 클라 생성 `idempotencyKey`(UUID)).
  - 라우팅: `src/app/[locale]/` 구조 확인 후 locale 세그먼트 준수.
  **구현 요건**:
  - `useEffect`에서 `rehydrate()` 호출, hydration 완료 전 스켈레톤/로딩.
  - payload에 **price/total 미포함**(서버 재검증). `idempotencyKey`는 페이지 진입 시 1회 생성(`crypto.randomUUID()`)해 더블클릭 중복 방지.
  - 미인증 사용자 접근 시 처리: API 401 응답 → 로그인 페이지 유도(또는 진입 시 세션 체크).
  - 성공 시 `clearCart()` + `/mypage/orders` 리다이렉트.
  **Must NOT do**: 클라에서 계산한 total을 서버로 보내 신뢰하게 만들지 말 것. `skipHydration` 무시하고 SSR에서 cart 값 직접 렌더 금지(hydration mismatch). 가격을 Decimal/소수로 표시 금지(`formatPrice` 사용). 새 인메모리 cart 만들지 말 것(기존 store 사용).
  **QA Scenarios**:
  - Happy path: 항목 2개 카트 → `/checkout` 요약 정확(`formatPrice`) → 주문하기 → 200 → cart 비워지고 `/mypage/orders` 이동.
  - Edge case (hydration): 새로고침 직후에도 SSR/CSR 가격 불일치(hydration warning) 없음.
  - Edge case (더블클릭): "주문하기" 빠르게 2회 → Order 1건(동일 idempotencyKey).
  - Negative (미인증): 비로그인 상태 진입 → 로그인 유도(주문 미생성).
  - Negative (빈 카트): items 없으면 주문하기 비활성.

---

## PR C — /mypage/orders 표시 `branch: feat/commerce-orders-view` (PR B 머지 후)

### Wave C1

- [x] 10. `mypage/page.tsx` 깨진 `/orders` 링크 정정 (2곳) `category:quick`
  **Goal**: `app/mypage/page.tsx`의 `/orders` 링크를 `/mypage/orders`로 정정 — `MY_STATS`(line 16)와 `MY_MENU` "Order History"(line 22) **둘 다**(현재 미존재 경로로 깨짐).
  **References**:
  - `app/mypage/page.tsx:16` — `MY_STATS` `href:"/orders"`(정정 대상 1). `useSession` 사용 컴포넌트.
  - `app/mypage/page.tsx:22` — `MY_MENU` "Order History" `href:"/orders"`(정정 대상 2).
  - `middleware.ts:24` — `matcher:["/mypage/:path*"]`가 `/mypage/orders` 자동 보호(미들웨어 수정 불필요).
  **Must NOT do**: middleware 수정 금지(자동 보호됨). `/orders` 외 다른 링크 변경 금지(외과적 — 깨진 링크 2곳만).
  **QA Scenarios**:
  - Happy path: 마이페이지에서 주문 stat 클릭 → `/mypage/orders` 이동(404 아님).

- [x] 11. `/mypage/orders` 페이지 — 본인 주문 목록 표시 `category:visual-engineering`
  **Goal**: `app/mypage/orders/page.tsx`에서 본인 주문 목록을 조회(`GET /api/orders` 또는 서버 컴포넌트 직접 Prisma 조회)해 JSON 스냅샷(items) 렌더. 주문번호/일시/항목/total/status 표시. 빈 상태 처리.
  **References**:
  - PR A `GET /api/orders` 또는 `Order` 모델 — 데이터 소스.
  - `middleware.ts:24` `matcher:["/mypage/:path*"]` — 인증 자동 보호.
  - `lib/utils.ts` `formatPrice` — 가격 표시.
  - `app/mypage/page.tsx` — 마이페이지 레이아웃/스타일 일관성 참고.
  - 스냅샷 타입 `OrderItemSnapshot[]`(PR A) — items 렌더.
  **구현 요건**:
  - 서버 컴포넌트 직접 조회 시 `auth()`로 session.user.id 확보 후 `prisma.order.findMany({where:{userId},orderBy:{createdAt:"desc"}})`.
  - 각 주문: createdAt(로케일 포맷), status 뱃지(PENDING 등), items 스냅샷 목록(name/brand/size/color/quantity/price), total(`formatPrice`).
  - 빈 상태: "주문 내역이 없습니다" + 쇼핑 유도.
  **Must NOT do**: 다른 user 주문 표시 금지(userId 필터 필수). 스냅샷 대신 dummy.ts 재조회로 현재 가격 표시 금지(주문 시점 스냅샷 가격 사용). 가격 소수 표시 금지(`formatPrice`).
  **QA Scenarios**:
  - Happy path: 주문 있는 사용자 → 목록에 스냅샷 항목·total·status 정확 표시.
  - Edge case (빈 상태): 주문 없는 신규 사용자 → 빈 상태 안내.
  - Negative (미인증): 비로그인 `/mypage/orders` 접근 → middleware 리다이렉트.
  - Negative (격리): user A는 user B 주문 안 보임.

---

## Final Verification Wave

- [x] F1. `npx tsc --noEmit` → exit 0 (전 PR 변경 타입 안전).
- [x] F2. `npm run lint` → exit 0 (errors 0; 기존 next-auth.d.ts warning 1).
- [x] F3. `npm run test` → 단위 + 통합(`/api/orders`) 전부 green (31 passed).
- [ ] F4. CI job green (PR별) — PR A(#17)·B(#18) green 확인. PR C는 push 후.
- [ ] F5. 수동 E2E: 로그인 → 상품 담기 → CartDrawer Checkout → `/checkout` 주문하기 → `/mypage/orders`에 주문(PENDING) 표시. (앱 실행 필요 — 코드 경로는 단위+통합으로 커버.)
- [x] F6. 보안 확인: (a) 미인증 `POST /api/orders` → 401, (b) 클라 가격 조작 시 서버 total 무시, (c) 없는 productId → 400, (d) user A가 user B 주문 조회 불가. — 단위+통합 테스트로 검증됨.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 (types) | None | 공유 타입 먼저 |
| 2 (schema) | None | 독립(타입과 병렬, 단 의미 동기화) |
| 3 (POST) | 1, 2 | 타입 + Order 모델 필요 |
| 4 (GET) | 1, 2 | 타입 + Order 모델 필요 |
| 5 (단위 테스트) | 3, 4 | 구현 대상 |
| 6 (통합 테스트) | 3, 4 | 구현 대상 + 실 DB |
| 7 (ADR) | 2 | 스키마 결정 확정 후 기록 |
| 8 (CartDrawer 배선) | PR A merge | API 계약 확정 후 |
| 9 (/checkout) | 8, PR A merge | `CreateOrderRequest` 타입 + API |
| 10 (링크 정정) | PR B merge | 독립(quick) |
| 11 (/mypage/orders) | PR A merge | `GET /api/orders` + Order 모델 |

---

## Parallel Execution Graph

```
PR A:
Wave A1 (즉시, 병렬):
├── Task 1: types (Order/snapshot/request)
└── Task 2: schema (Order model + enum + db push)

Wave A2 (A1 완료 후, 병렬):
├── Task 3: POST /api/orders (auth + 가격 재검증 + $transaction)
└── Task 4: GET /api/orders (본인 목록)

Wave A3 (A2 완료 후, 병렬):
├── Task 5: 단위 테스트 (mock)
├── Task 6: 통합 테스트 (실 Postgres)
└── Task 7: ADR

── PR A merge ──

PR B:
Wave B1:
├── Task 8: CartDrawer Checkout 배선
└── Task 9: /checkout 페이지 (8 의존)

── PR B merge ──

PR C:
Wave C1 (병렬):
├── Task 10: mypage 링크 정정
└── Task 11: /mypage/orders 표시

Critical Path: Task 1/2 → Task 3 → Task 5/6 → (PR A merge) → Task 9 → (PR B merge) → Task 11
```

---

## Category + Skills

| Task | Category | Category Reason |
|------|----------|----------------|
| 1 | quick | 타입 정의 추가, 로직 없음 |
| 2 | ultrabrain | DB 스키마 설계(Order 모델·인덱스·마이그레이션 영향) |
| 3 | ultrabrain | 보안 핵심(서버 가격 재검증·$transaction·멱등성·auth) |
| 4 | ultrabrain | IDOR 방지·세션 격리 |
| 5 | ultrabrain | 보안 경로 테스트 설계 |
| 6 | ultrabrain | 실 DB 통합 테스트 |
| 7 | writing | ADR 문서 |
| 8 | visual-engineering | UI 버튼 배선 |
| 9 | visual-engineering | 체크아웃 UI + hydration |
| 10 | quick | 링크 1줄 정정 |
| 11 | visual-engineering | 주문 목록 UI |

---

## Test Strategy (hybrid — adr-003)

- **단위(mock)**: `app/api/orders/route.test.ts` — vitest + `vi.mock`로 Prisma·auth mock. auth 게이트, 서버 가격 재검증(클라 조작 무시), 재계산(무료배송 경계), 멱등성, IDOR 격리 검증. dummy.ts는 실제 import해 기대값 산출(가격 하드코딩 금지).
- **통합(실 Postgres)**: 주문 생성→DB row 확인→조회 플로우. `items`(Json) 역직렬화 검증, status PENDING, total 서버 재계산값, 멱등성(동일 key → count 1). 테스트 전후 cleanup.
- **검증 명령**: 각 task 완료 시 `npm run test` + `npx tsc --noEmit` + `npm run lint`. PR마다 CI green 확인.

---

## Success Criteria

- [ ] 로그인 사용자가 장바구니 → `/checkout` → 주문 생성 → `/mypage/orders`에서 주문(PENDING) 확인하는 end-to-end 플로우 동작.
- [ ] `POST /api/orders`가 클라이언트 가격을 신뢰하지 않고 서버에서 `data/dummy.ts` 기준 재계산(subtotal/shipping/total Int).
- [ ] 미인증 주문 생성 401, 없는 productId/수량≤0 400.
- [ ] Order가 `status=PENDING`, `items` JSON 스냅샷(서버 가격), `userId` NOT NULL로 DB 저장.
- [ ] 동일 `idempotencyKey` 더블클릭 시 Order 1건만 생성.
- [ ] user A가 user B 주문을 조회/노출받지 못함(IDOR 차단).
- [ ] hybrid 테스트(단위 + 통합) green, 전 PR CI green, `tsc --noEmit`/`lint` exit 0.
- [ ] OrderStatus enum(PENDING/PAID/CANCELLED) 선반영으로 결제 PR 시 재마이그레이션 최소.

---

## Risks / Rollback

| Risk | 영향 | Mitigation / Rollback |
|------|------|----------------------|
| `npx prisma db push`로 dev DB만 변경, 프로덕션 미반영 | 배포 시 Order 테이블 부재 | 배포 파이프라인에서 마이그레이션 적용 확인(또는 `prisma migrate` 전환 검토). dev/prod DB 분리 확인. |
| `data/dummy.ts` 상품이 P3에서 DB로 이전되면 서버 재검증 소스 변경 필요 | 가격 재검증 코드 수정 | 가격 재조회 함수를 단일 지점(`getProductById`)으로 추상화해 P3 전환 시 교체 용이하게 설계. |
| JSON 스냅샷이라 추후 주문 항목 집계/분석 쿼리 어려움 | 분석 한계 | MVP 범위에서 수용. 분석 필요 시 별도 ADR로 OrderItem 정규화 재검토. |
| `skipHydration` 처리 누락 시 SSR/CSR 가격 mismatch | 체크아웃 화면 깨짐 | task 9에서 수동 `rehydrate()` + hydration 완료 전 로딩 강제. F5 수동 E2E로 검증. |
| 결제 미연동 상태로 PENDING 주문 누적 | 데이터 정합성 | status enum 선반영으로 추후 결제 PR에서 PAID 전이. 필요 시 PENDING TTL/정리 배치는 추후. |
| schema 변경(Ask First 경계) | 승인 필요 | 본 plan으로 승인 갈음. db push는 dev/CI 한정. 문제 시 Order 모델 제거 + `prisma db push`로 롤백(dev). |

---

## Rollback 절차 (요약)

1. PR 단위 revert(Squash merge → revert commit).
2. dev DB: Order 모델 제거 후 `npx prisma db push`로 동기화(데이터 손실 주의 — 주문 데이터 백업 후).
3. 프론트: `/checkout`·`/mypage/orders` 라우트 및 CartDrawer onClick 제거.
