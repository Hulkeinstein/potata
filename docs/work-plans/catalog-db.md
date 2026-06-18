# Work Plan: P3 카탈로그 DB화 (Product 모델 전환)

> 초보 친화 plan — 각 task에 **무엇을 / 왜 / 어떻게 검증** 을 명확히 적었습니다. 위에서 아래로 순서대로 따라가면 됩니다.

## Overview

- **Objective**: 정적 `data/dummy.ts`의 상품 8개를 Prisma `Product` 모델로 옮기고, 사이트와 주문 가격 재검증이 DB에서 읽도록 전환한다. 실서비스 런칭 토대 마련(상품 추가가 코드 수정 없이 가능해짐).
- **Scope**:
  - **IN**:
    - Prisma `Product` 모델 추가 (`prisma/schema.prisma`)
    - 시드 스크립트 (`prisma/seed.ts` + `package.json` `prisma.seed`)
    - 주문 가격 재검증 소스를 `PRODUCTS.find` → `prisma.product.findUnique` 전환 (`app/api/orders/route.ts:57`)
    - orders 테스트 2개를 DB fixture 기반으로 전환 (`route.test.ts`, `route.integration.test.ts`)
    - 8개 화면 + 상세페이지를 client→server 분리로 전환해 DB에서 상품을 읽게 함
    - 상품 상세페이지 ISR (`revalidate=3600`, `dynamicParams=true`)
    - `data/dummy.ts`에서 `PRODUCTS` export 제거 (TRENDS만 잔존)
    - ADR-005 작성 (Product 모델 설계 결정 기록)
  - **OUT (이번에 절대 하지 않음)**:
    - TRENDS(9개) DB화 — `data/dummy.ts`에 그대로 남긴다 (별도 나중)
    - 관리자 상품 등록/편집 페이지
    - 이미지 업로드 기능 (이미지는 외부 URL 문자열 유지)
    - 검색 고도화, 리뷰 기능, CSV import, 재고 차감 로직
    - `Product.id`를 Int autoincrement로 바꾸는 것 (**절대 금지** — 사유는 아래 확정 결정 참조)
    - sizes/colors/images의 정규화(별도 테이블 분리) — `String[]`로 충분 (YAGNI)
- **Approach**: 2-PR 분할로 위험을 격리한다. PR1은 DB 토대 + 보안(주문 가격 재검증)만 작고 검증 가능하게 변경 — 화면은 건드리지 않으므로 회귀 위험이 격리된다. PR2는 리드(읽기) 경로 8개 화면 + 상세 ISR을 전환하고 마지막에 `PRODUCTS` export를 제거한다. 이 순서는 "주문 보안(돈 관련)을 먼저 안전하게 확보 → UI를 나중에" 라는 원칙을 따른다.
- **Stack**: Next.js (App Router) + React 19, Prisma 6 + Supabase Postgres, NextAuth v5(JWT), Vitest. (datasource는 `url=env(DATABASE_URL)`, `directUrl=env(DIRECT_URL)` 이미 설정됨 — schema.prisma:5-9 확인 완료.)

---

## 확정 결정 요약 (DO NOT RE-DECIDE)

> 아래는 이미 결정된 사항이다. 실행 중 다시 묻거나 바꾸지 않는다.

1. **범위 = Product만**. TRENDS는 dummy.ts에 잔존.
2. **상세페이지 = ISR**: `app/product/[id]/page.tsx`에 `export const revalidate = 3600; export const dynamicParams = true;` + `generateStaticParams`는 DB 조회(또는 빈 배열). 상품 추가가 재배포 없이 반영됨.
3. **2-PR 분할**: PR1(DB 토대+보안) → PR2(리드 경로 전환).
4. **Product.id = String 유지**, 기존 문자열 id `"1"`~`"8"`로 시드. **autoincrement Int 절대 금지** — cart-store / wishlist-store / `Order.items` JSON 스냅샷이 모두 문자열 id를 참조하므로 Int로 바꾸면 깨진다.
5. **이미지 = 외부 URL** (`imageUrl String`, `images String[] @default([])`). 가격 = AED **Int** (`originalPrice Int?`, `discountRate Int?`). `sizes`/`colors` = `String[] @default([])` — 정규화 금지.
6. **seed/migration은 `DIRECT_URL` 사용** — `DATABASE_URL`의 `?pgbouncer=true`는 seed 실패 가능. Prisma datasource는 이미 `directUrl = env("DIRECT_URL")` 설정됨(schema.prisma:8).
7. **ADR-004 불변**: `Order.items`=JSON 스냅샷 유지. 가격 재검증 *소스만* dummy.ts→DB로 교체. 스냅샷 구조/응답 형식(`{success,error?,data?}`)/`$transaction`/Int 재계산/`formatPrice` 모두 유지.

---

## Context

### Project Context (from docs/)
- **Product Goal**: potata = 한국→UAE 패션 커머스. 인증·검증·커머스 MVP 완료. 다음 = 배포·실유저 가동 + 실서비스 토대. 본 plan은 "실서비스 토대(카탈로그 DB화)"에 직접 기여한다.
- **ADR Constraints Applied**:
  - ADR-004: `Order.items`=JSON 스냅샷 불변. 가격 재검증 소스만 DB로 교체 (이 plan이 ADR-004가 예고한 "P3 카탈로그 DB화" 후속).
  - ADR-003: hybrid 테스트 전략(단위=Prisma mock, 통합=실 Postgres). orders 테스트 2종을 이 전략에 맞춰 DB fixture로 전환.
  - Prisma-direct + `$transaction` 패턴, 서버 컴포넌트에서 prisma 직접 조회 → 클라이언트 자식에 props 전달.
- **Aligned with Existing Plans**: `docs/work-plans/archive/commerce-checkout-mvp.md`(완료)가 ADR-004에서 본 작업을 예고함. 본 plan은 그 후속이며 독립적이다.

### 실측 (Explore — 검증 완료)
- `data/dummy.ts`: `PRODUCTS` 8개 (id `"1"`~`"8"` 문자열, `price` Int, `imageUrl` 외부 URL, `sizes`/`colors`/`images` String[], `category`/`rating?`/`reviewCount?`/`isNew?`/`isBest?`/`isHot?`/`description?`/`originalPrice?`/`discountRate?`). `TRENDS` 9개(범위 외).
- `types/index.ts:6` `Product` 인터페이스: `category?: ProductCategory`(enum, 옵셔널), `stock?: number`(미사용) 포함. Prisma 모델은 `category String`으로 두되 타입 매핑 시 주의(Task 7 참조).
- `PRODUCTS`를 실제로 import해 쓰는 파일 (확인 완료):
  - **PR1 대상**: `app/api/orders/route.ts:5,57`, `app/api/orders/route.test.ts:30,33`, `app/api/orders/route.integration.test.ts:16,65`
  - **PR2 대상(화면 8 + 상세 1)**: `app/shop/page.tsx`(category 필터+페이지네이션+searchParams, "use client"), `app/ranking/page.tsx`(price 내림차순 정렬), `app/for-you/page.tsx`(전체), `app/liked/page.tsx`(Zustand wishlist id ∩ PRODUCTS — **까다로움**), `app/brands/page.tsx:143`(PRODUCTS.map), `app/try-on/page.tsx`(category 필터+선택+searchParams), `components/ui/ProductGrid.tsx`(전체, 홈에서 사용, `-copy` 데모 복제 포함), `app/product/[id]/page.tsx`(generateStaticParams + find → ISR).
  - `app/page.tsx`(홈)은 `ProductGrid`를 props 없이 렌더 → ProductGrid 전환 시 함께 처리.
  - `components/ui/K_TrendSection.tsx`는 TRENDS 사용 → **건드리지 않음**.
- `app/api/orders/route.ts:57` `PRODUCTS.find((p) => p.id === item.productId)` → `prisma.product.findUnique({ where: { id } })`로 교체. 스냅샷에 `product.{id,name,brand,price,imageUrl}` 사용, 없으면 400, `$transaction`/Int 재계산/JSON 스냅샷 유지.
- 테스트: `route.test.ts:33` `const p = PRODUCTS[0]`(id="1", price=719) — 케이스 6개(미인증 401 / 정상 재계산 / price 조작 무시 / 없는 productId 400 / quantity 0 400 등). `route.integration.test.ts:65` 동일 fixture로 실 DB 생성 검증.
- `prisma/schema.prisma`: User/Order/VerificationCode 존재 (cuid·`@@index` 스타일). datasource에 `directUrl = env("DIRECT_URL")` 이미 있음. seed 스크립트 없음. `lib/prisma.ts` 싱글톤 존재.

### Metis Review (gaps — 본 plan에 반영됨)
- **Hidden Complexity #1**: `generateStaticParams`가 빌드타임 PRODUCTS.map → DB 전환 시 빌드타임 정적생성이 깨질 수 있음. → ISR(`dynamicParams=true`)로 해결. `generateStaticParams`는 DB 조회 또는 빈 배열 반환(둘 다 허용, 빈 배열이면 첫 요청 시 on-demand 생성).
- **Hidden Complexity #2**: client→server 분리. 특히 `liked`는 Zustand wishlist id(클라 상태) ∩ DB 상품 매칭이라 까다로움 → 서버에서 전체 Product `findMany` 후 클라 자식에 props로 넘기고, 클라에서 wishlist id로 필터(기존 로직 유지).
- **Hidden Complexity #3**: id String 유지 — 확정 결정 #4.
- **Hidden Complexity #4**: seed는 `DIRECT_URL` 경유 — 확정 결정 #6.
- **WARNINGS**: Scope Creep(2-PR로 완화), Over-engineering(정규화 금지·String[] 충분).
- **MISSING_ACCEPTANCE_CRITERIA 보강**: 각 task에 검증 명령 명시(`npx prisma db push`, `npm run test`, `npx tsc --noEmit`, `npm run build`).

---

## Prerequisites
- [ ] feature 브랜치 생성: `git checkout -b feat/catalog-db` (main 직접 commit 금지 — hook 차단됨)
- [ ] `.env.local`에 `DATABASE_URL`(pgbouncer)과 `DIRECT_URL`(direct) 둘 다 설정되어 있는지 확인 (seed/db push가 DIRECT_URL 사용)
- [ ] 작업 전 현재 상태가 green인지 확인: `npm run test` → 통과, `npx tsc --noEmit` → 에러 없음
- [ ] 본 plan 승인 = `prisma/schema.prisma` 변경 Ask-First 승인 갈음 (CLAUDE.md Boundaries)
- [ ] (정리) 임시 파일 `docs/work-plans/catalog-db-details-pr1.md` 는 사용하지 않으니 삭제 가능

---

## 권장 Prisma 스키마 (Task 1에서 추가)

```prisma
model Product {
  id            String   @id            // 기존 "1"~"8" 시드값, @default 없음 (수동 지정)
  name          String
  brand         String
  price         Int                      // AED, Int
  originalPrice Int?
  discountRate  Int?
  imageUrl      String                   // 외부 URL
  images        String[] @default([])
  category      String                   // enum 정규화 안 함 (YAGNI)
  description   String?
  sizes         String[] @default([])
  colors        String[] @default([])
  rating        Float?
  reviewCount   Int?
  isNew         Boolean  @default(false)
  isBest        Boolean  @default(false)
  isHot         Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([category])
  @@index([brand])
}
```

---

## TODOs

### PR1 — DB 토대 + 보안 (작고 검증 가능, 회귀 격리)

- [x] 1. Prisma `Product` 모델 추가 + `db push` `category:ultrabrain`
  **무엇을**: `prisma/schema.prisma`에 위 "권장 Prisma 스키마"의 `Product` 모델을 추가하고, `npx prisma generate` → `npx prisma db push`로 DB에 테이블을 만든다.
  **왜**: 상품을 DB에서 관리하기 위한 토대. 모든 후속 task가 이 테이블에 의존한다.
  **References** (각 항목이 왜 중요한지):
  - `prisma/schema.prisma:5-9` — datasource에 `directUrl = env("DIRECT_URL")` 이미 있음. db push가 자동으로 DIRECT_URL 사용 → 그대로 둔다.
  - `prisma/schema.prisma:11-59` — 기존 User/Order/VerificationCode 스타일(cuid·`@@index`) 참고. **단 Product.id는 cuid가 아니라 `@id`만**(문자열 수동 지정).
  - `types/index.ts:6-25` — `Product` 인터페이스 필드와 1:1 매칭되게 컬럼 구성(stock은 미사용이라 컬럼 생략).
  **Must NOT do**:
  - `id String @id @default(cuid())` 또는 `Int @default(autoincrement())` 절대 금지 → `id String @id` (default 없음).
  - User/Order/VerificationCode 모델 수정 금지(외과적 변경).
  - category를 enum으로 만들지 말 것(`String` 유지).
  **QA Scenarios** (검증 명령):
  - Happy path: `npx prisma generate` → exit 0, 그 다음 `npx prisma db push` → "Your database is now in sync" 출력.
  - 검증: `npx tsc --noEmit` → `@prisma/client`에 `Product` 타입이 생성되어 에러 0.
  - Negative: schema에 `@default(cuid())`가 Product.id에 있으면 안 됨 — `grep "id .*@id" prisma/schema.prisma`로 Product.id가 `id String @id`(default 없음)인지 눈으로 확인.

- [x] 2. `prisma/seed.ts` 시드 스크립트 + `package.json` `prisma.seed` 설정 `category:ultrabrain`
  **무엇을**: `prisma/seed.ts`를 새로 만들어 `data/dummy.ts`의 PRODUCTS 8개를 DB에 넣는다(멱등). `package.json`에 `"prisma": { "seed": "tsx prisma/seed.ts" }` 추가. `npx prisma db seed` 실행.
  **왜**: DB에 실제 상품 데이터를 채워야 화면/주문이 동작한다. 기존 id `"1"`~`"8"`를 그대로 보존해야 cart/wishlist/Order 스냅샷이 안 깨진다.
  **References**:
  - `data/dummy.ts:3` `PRODUCTS` — 시드 소스. **PR1 시점에는 아직 export 살아 있음**(제거는 PR2 Task 15). seed.ts에서 `import { PRODUCTS } from "../data/dummy"` 사용.
  - `lib/prisma.ts` — 싱글톤 패턴 참고(단 seed는 `new PrismaClient()` 별도 인스턴스 + `$disconnect()` 권장).
  - `prisma/schema.prisma:8` — `directUrl` 사용 확인. tsx로 실행 시 Prisma가 migration/seed 컨텍스트에서 DIRECT_URL 사용.
  **Must NOT do**:
  - id를 새로 생성하지 말 것 — `PRODUCTS`의 기존 문자열 id(`"1"`~`"8"`)를 그대로 `id`에 넣는다.
  - 비멱등 `create` 단독 사용 금지(재실행 시 충돌) → `upsert` 또는 `createMany({ skipDuplicates: true })` 사용.
  - `tsx`가 devDependency에 없으면 추가(package.json 의존성 추가는 Ask-First지만 seed 실행 도구로 필수 → plan 승인에 포함). 이미 있으면 추가 금지.
  **QA Scenarios**:
  - Happy path: `npx prisma db seed` → exit 0. `npx prisma studio` 또는 노드 스크립트로 `product.count()` == 8.
  - 멱등성: `npx prisma db seed` 2회 연속 실행 → 두 번째도 에러 없이 통과, count 여전히 8(중복 생성 안 됨).
  - id 보존: `prisma.product.findUnique({ where: { id: "1" } })` → name === "Kalix T Jacket Black - 26SS", price === 719.
  - Negative: pgbouncer URL로 실행돼 "prepared statement" 에러가 나면 안 됨 — 나면 DIRECT_URL 설정 확인.

- [x] 3. 주문 가격 재검증 소스를 DB로 전환 (`route.ts:57`) `category:ultrabrain`
  **무엇을**: `app/api/orders/route.ts`에서 `PRODUCTS.find(...)`(line 57)를 `await prisma.product.findUnique({ where: { id: item.productId } })`로 교체. PRODUCTS import(line 5) 제거.
  **왜**: 클라이언트가 보낸 가격을 믿지 않고 DB의 진짜 가격으로 재검증(Zero Trust, 돈 관련 보안 핵심). dummy.ts 의존을 주문 경로에서 끊는다.
  **References**:
  - `app/api/orders/route.ts:55-75` — 스냅샷 생성 루프. `product.{id,name,brand,price,imageUrl}`를 그대로 사용. 없으면 400 `존재하지 않는 상품: ${item.productId}` 유지.
  - `app/api/orders/route.ts:77-83` — Int 재계산(subtotal/shipping/total) 그대로 유지.
  - `app/api/orders/route.ts:98-111` — `$transaction` + JSON 스냅샷 그대로 유지(ADR-004 불변).
  - `lib/prisma.ts` — 이미 import됨(line 3), 재사용.
  **Must NOT do**:
  - 스냅샷 구조/필드 변경 금지(ADR-004). 응답 형식 `{success,error?,data?}` 변경 금지.
  - 가격 재계산 로직(FREE_SHIPPING_THRESHOLD/SHIPPING_FEE) 변경 금지.
  - 루프 안에서 N+1 쿼리가 부담되면 `findMany({ where: { id: { in: ids } } })`로 한 번에 조회해 Map으로 매칭해도 됨(선택). 단 동작/검증값 동일해야 함.
  - try-catch를 핸들러 최상위 외 중첩 금지.
  **QA Scenarios**:
  - Happy path: id="1", quantity=2 주문 → subtotal=1438, shipping=3000, total=4438 (DB price 719 기준). (Task 4/5 테스트로 자동 검증)
  - 가격 조작: 클라가 `price:1` 보내도 스냅샷 price는 DB값 719. (route.test.ts 케이스 유지)
  - Negative: 존재하지 않는 productId → 400 + `존재하지 않는 상품:` 메시지, `txOrderCreate` 미호출.
  - 검증: `npx tsc --noEmit` → 에러 0 (PRODUCTS import 제거 후 미사용 없음).

- [x] 4. orders 단위 테스트(`route.test.ts`) DB mock 전환 `category:ultrabrain`
  **무엇을**: `route.test.ts`의 `vi.mock("@/lib/prisma", ...)`에 `product: { findUnique: productFindUnique }` mock 추가. `const p = PRODUCTS[0]` fixture를 mock 반환값으로 대체(또는 PRODUCTS import는 fixture 값 출처로만 유지하되 route는 mock을 거치게).
  **왜**: route가 이제 `prisma.product.findUnique`를 호출하므로 mock이 없으면 테스트가 실 DB를 때리거나 undefined로 깨진다.
  **References**:
  - `app/api/orders/route.test.ts:4-26` — `vi.hoisted` + `vi.mock("@/lib/prisma")` 블록. 여기에 `productFindUnique` mock 추가.
  - `app/api/orders/route.test.ts:30,33` — `import { PRODUCTS }` / `const p = PRODUCTS[0]`. fixture 값(id="1", price=719)을 mock이 반환하도록 `productFindUnique.mockResolvedValue(p)` 설정.
  - `app/api/orders/route.test.ts:64-148` — 케이스 6종(정상 재계산/price 조작 무시/없는 productId 400/quantity 0 등). "없는 productId" 케이스는 `productFindUnique.mockResolvedValue(null)`로 표현.
  **Must NOT do**:
  - 검증 기대값(719, 1438, 4438 등) 변경 금지 — 동일 fixture 값 유지.
  - 테스트 케이스 삭제 금지(보안 케이스 보존).
  - 실 DB 연결 금지(단위 테스트는 mock 전용).
  **QA Scenarios**:
  - Happy path: `npm run test app/api/orders/route.test.ts` → 모든 케이스 통과, exit 0.
  - 없는 상품: `productFindUnique.mockResolvedValue(null)` 케이스 → 400 + `txOrderCreate` 미호출 확인.
  - Negative: PRODUCTS를 직접 find하는 잔존 코드가 route에 있으면 mock이 안 먹혀 실패 — 이때 Task 3 누락 의심.

- [x] 5. orders 통합 테스트(`route.integration.test.ts`) DB fixture 전환 `category:ultrabrain`
  **무엇을**: `beforeAll`에서 테스트용 Product를 실 DB에 `upsert`(id="1" 등 시드와 동일 또는 전용 id), `afterAll`에서 정리. `const p = PRODUCTS[0]` 대신 시드/업서트된 실 DB 상품 기준으로 검증.
  **왜**: route가 실 `prisma.product.findUnique`를 호출하므로, 통합 테스트 DB에 해당 상품이 있어야 200이 난다(ADR-003 실 Postgres).
  **References**:
  - `app/api/orders/route.integration.test.ts:32-61` — `beforeAll`/`afterAll` lifecycle. 여기에 Product upsert/cleanup 추가(User 정리 패턴과 동일하게).
  - `app/api/orders/route.integration.test.ts:65-89` — 생성 검증(719*2=1438 등). 시드된 상품 price와 일치해야 함.
  - ADR-003 — `DATABASE_URL`/`DIRECT_URL` 없으면 실패가 맞음(silent skip 금지).
  **Must NOT do**:
  - 실 DB에 영구 잔존 데이터 남기지 말 것 — `afterAll`에서 생성한 Product 정리(또는 시드 데이터 재사용 시 삭제하지 말 것 — 둘 중 택1, 명확히).
  - 시드(Task 2)와 충돌하는 id 사용 시 주의 — 시드 상품을 재사용하면 afterAll에서 삭제 금지, 전용 테스트 상품이면 삭제.
  - 가격 재계산 기대값 변경 금지.
  **QA Scenarios**:
  - Happy path: `DATABASE_URL`/`DIRECT_URL` 설정 후 `npm run test app/api/orders/route.integration.test.ts` → 통과.
  - 생성 검증: 주문 생성 후 `prisma.order.findFirst` → total===4438(719*2+3000), items[0].price===719.
  - Negative: 환경변수 없이 실행 시 명확한 실패(skip 아님).

- [x] 6. ADR-005 작성 (Product 모델 설계 결정) `category:writing`
  **무엇을**: `docs/adr/adr-005-product-model.md` 작성. 결정 기록: ① id String 유지(autoincrement 금지) 사유 ② 이미지 외부 URL ③ 상세 ISR ④ sizes/colors/images 정규화 회피(YAGNI).
  **왜**: 미래의 자신/팀이 "왜 id가 String인가", "왜 정규화 안 했나"를 다시 논쟁하지 않도록 결정 근거를 남긴다.
  **References**:
  - `docs/adr/adr-004-order-json-snapshot.md` — 형식/톤 템플릿(Status/Date/Context/Options Considered/Decision/Consequences). ADR-004가 "P3 카탈로그 DB화" 예고했음을 링크로 연결.
  - `docs/adr/adr-003-test-db-strategy.md` — hybrid 테스트 참조(통합 테스트가 Product 시드 의존).
  **Must NOT do**:
  - 코드 변경 금지(문서만).
  - ADR-004 내용 재서술/수정 금지 — 링크만.
  **QA Scenarios**:
  - Happy path: 파일 존재 + 4개 결정(id String / 외부 URL / ISR / 정규화 회피)이 각각 "Options Considered" + "Decision"으로 기록됨.
  - 검증: `docs/adr/` 목록에 adr-005가 추가되고 번호 충돌 없음.

### PR2 — 리드(읽기) 경로 전환

- [ ] 7. 공유 데이터 접근 헬퍼 + Product 타입 정합 (`lib/products.ts`) `category:ultrabrain`
  **무엇을**: `lib/products.ts`에 서버 전용 헬퍼 추가: `getAllProducts()`(전체 findMany), `getProductById(id)`(findUnique). Prisma `Product`(category String) → 앱 `Product` 타입(`category?: ProductCategory`) 매핑 어댑터 포함.
  **왜**: 8개 화면이 각자 prisma를 직접 부르면 중복·불일치. 단일 헬퍼로 통일하고, Prisma category(String)와 앱 타입(enum) 차이를 한 곳에서 흡수한다.
  **References**:
  - `types/index.ts:6-34` — 앱 `Product` 인터페이스 + `ProductCategory` enum. Prisma는 `category: string`이므로 캐스팅/매핑 필요(`as ProductCategory` 또는 런타임 검증).
  - `lib/prisma.ts` — prisma 싱글톤 사용.
  - `app/api/orders/route.ts` (Task 3 결과) — findUnique 패턴 일관 참고.
  **Must NOT do**:
  - 이 파일에 `"use client"` 금지(서버 전용). 클라이언트에서 import 금지.
  - 새 추상화 과도화 금지(findMany/findById 두 개면 충분, YAGNI).
  - 정규화/조인 추가 금지.
  **QA Scenarios**:
  - Happy path: `getAllProducts()` → 8개 배열, 각 항목 `category`가 `ProductCategory` 타입에 호환.
  - 타입: `npx tsc --noEmit` → 매핑 후 에러 0(category string→enum 처리 확인).
  - Negative: 클라 컴포넌트에서 `lib/products.ts` import 시 빌드 에러(서버 전용 의도 확인) — prisma import가 클라 번들에 안 들어가야 함.

- [ ] 8. `ProductGrid` + 홈(`app/page.tsx`) server 분리 `category:ultrabrain`
  **무엇을**: `components/ui/ProductGrid.tsx`를 server에서 데이터를 받도록 분리. `app/page.tsx`(server)에서 `getAllProducts()` 호출 → `<ProductGrid products={...} />`. 기존 `-copy` 데모 복제 로직은 클라 표시 로직이므로 props 받은 배열에 대해 유지.
  **왜**: 홈 첫 화면이 DB에서 상품을 읽게 함.
  **References**:
  - `components/ui/ProductGrid.tsx:1-25` — 현재 `"use client"` + `PRODUCTS` import + `-copy` 복제(line 18-21). props 받는 형태로 변경.
  - `app/page.tsx:1-13` — `<ProductGrid />`(props 없음). server에서 `getAllProducts()` 후 props 전달.
  **Must NOT do**:
  - UI/레이아웃/스타일 변경 금지 — 데이터 소스만 교체.
  - `-copy` 데모 복제가 주문/장바구니로 흘러가지 않으므로 그대로 둠(단 id가 `${id}-copy`라 상세 링크 깨질 수 있으면 기존 동작 유지 — 본 task 범위 밖, 회귀만 없으면 OK).
  **QA Scenarios**:
  - Happy path: `npm run dev` 후 `/` 접속 → New Arrivals 그리드에 8개(+copy) 카드 렌더.
  - 검증: `npx tsc --noEmit` 에러 0, `npm run build` 성공.
  - Negative: PRODUCTS import가 남아 있으면 안 됨(Task 15에서 export 제거되면 빌드 깨짐 → 미리 끊는다).

- [ ] 9. `app/for-you` + `app/brands` server 분리 `category:ultrabrain`
  **무엇을**: 두 화면을 server wrapper(데이터 fetch) + client child(인터랙션) 패턴으로 분리. `getAllProducts()` → props.
  **왜**: 두 화면 모두 전체 상품을 단순 표시(for-you 전체, brands는 line 143에서 PRODUCTS.map). 묶어서 처리하면 효율적.
  **References**:
  - `app/for-you/page.tsx:1-` — `"use client"` + PRODUCTS. ProductCard 그리드. 인터랙션 최소 → server page에서 직접 fetch 후 client child(or 그대로 server component화 가능하면 그게 더 단순).
  - `app/brands/page.tsx:6,143` — PRODUCTS import + `PRODUCTS.map`(carousel/캐러셀 인터랙션은 useRef/useState 사용 → client child 유지, products만 props).
  **Must NOT do**:
  - `BRAND_FOCUS_ITEMS`(brands 자체 mock 배열) 건드리지 말 것 — 범위 밖.
  - UI 변경 금지.
  **QA Scenarios**:
  - Happy path: `/for-you`, `/brands` 접속 → 상품 카드 정상 렌더.
  - 검증: 두 파일에서 `import { PRODUCTS } from "@/data/dummy"` 제거됨.
  - `npx tsc --noEmit` 에러 0.

- [ ] 10. `app/ranking` server 분리 (price 정렬) `category:ultrabrain`
  **무엇을**: server에서 `getAllProducts()` 후 price 내림차순 정렬한 배열을 client child에 props. 또는 `prisma.product.findMany({ orderBy: { price: "desc" } })`로 DB 정렬.
  **왜**: 랭킹은 price 내림차순 정렬 표시. DB 정렬이 더 정확/효율적.
  **References**:
  - `app/ranking/page.tsx:16` — `[...PRODUCTS].sort((a,b)=>b.price-a.price)`. 이 정렬을 server/DB로 이전.
  - `app/ranking/page.tsx:11-` — `activeCategory`/`selectedType` useState 인터랙션 → client child 유지.
  **Must NOT do**:
  - 정렬 기준 변경 금지(price desc 유지).
  - ranking 파일 내부 `CATEGORIES` mock(line 9) 건드리지 말 것.
  **QA Scenarios**:
  - Happy path: `/ranking` 접속 → 가격 높은 순으로 상품 표시(맨 위가 최고가 719).
  - 검증: PRODUCTS import 제거, `npx tsc --noEmit` 에러 0.

- [ ] 11. `app/shop` server 분리 (category 필터+페이지네이션+searchParams) `category:ultrabrain`
  **무엇을**: server page에서 `getAllProducts()` → client child(`ShopContent`)에 props. 기존 category 필터 / `PAGE_SIZE=8` 페이지네이션 / `useSearchParams` 인터랙션은 client child에서 props 받은 배열로 유지.
  **왜**: shop은 인터랙션(필터/Load More/searchParams)이 많아 client 유지가 필요. 데이터만 server fetch로 교체.
  **References**:
  - `app/shop/page.tsx:14-20` — `<Suspense>` + `<ShopContent>` 구조. server page가 fetch → `<ShopContent products={...} />`.
  - `app/shop/page.tsx:29-47` — `useSearchParams`/`useState`/필터/슬라이스 로직. props 배열 기준으로 동작하게 변경(로직 유지).
  - `lib/constants` `CATEGORIES`, `types` `ProductCategory` — 그대로 사용.
  **Must NOT do**:
  - 필터/페이지네이션/Suspense 동작 변경 금지.
  - `useSearchParams` 제거 금지(딥링크 `?category=` 유지).
  **QA Scenarios**:
  - Happy path: `/shop` → 전체 8개. `/shop?category=Outer` → Outer 카테고리만(id 1,2). Load More 동작.
  - 빈 결과: 없는 카테고리 → "No products found" empty state.
  - 검증: PRODUCTS import 제거, `npx tsc --noEmit` 에러 0.

- [ ] 12. `app/try-on` server 분리 (category 필터+선택) `category:ultrabrain`
  **무엇을**: server page에서 상품 목록 fetch → client child에 props. category 필터/상품 선택/탭(wardrobe/gallery/recents)/`useStudioStore` 인터랙션은 client 유지.
  **왜**: try-on은 상품 선택 후 AI 가상 피팅. 상품 목록 데이터만 DB로 교체.
  **References**:
  - `app/try-on/page.tsx:3` — PRODUCTS import. `app/try-on/page.tsx:8,11` — CATEGORIES/ProductCategory 사용.
  - `app/try-on/page.tsx:15-` — `useSearchParams`/`Suspense`/`useStudioStore` 인터랙션 → client child 유지.
  - 주의: try-on은 `/api/try-on`(인증 필요, #15)과 별개 — 상품 목록만 다룸.
  **Must NOT do**:
  - try-on AI 호출 로직/스토어 건드리지 말 것 — 상품 목록 데이터 소스만 교체.
  - 상품 선택 시 넘기는 id는 문자열 그대로 유지(서버 가격 재검증과 정합).
  **QA Scenarios**:
  - Happy path: `/try-on` → wardrobe 탭에 상품 목록 렌더, 카테고리 필터 동작, 상품 선택 가능.
  - 검증: PRODUCTS import 제거, `npx tsc --noEmit` 에러 0.

- [ ] 13. `app/liked` server 분리 (Zustand wishlist ∩ DB — 까다로움) `category:ultrabrain`
  **무엇을**: server page에서 `getAllProducts()` → client child(`LikedClient`)에 전체 상품 props. client에서 `useWishlistStore`의 `items`(문자열 id 배열) ∩ props 상품으로 필터(`products.filter(p => likedIds.includes(p.id))`). `hasHydrated` 가드 유지.
  **왜**: wishlist는 클라 전용 상태(localStorage)라 server에서 알 수 없음. server는 전체 상품만 주고, 교집합은 client에서. **이 부분이 가장 까다로움** — server/client 경계 분리 주의.
  **References**:
  - `app/liked/page.tsx:1-14` — `"use client"` + `useWishlistStore` + `PRODUCTS.filter(p => likedIds.includes(p.id))`. 이 필터 로직을 client child로 옮기되 `PRODUCTS` 대신 props `products` 사용.
  - `app/liked/page.tsx:16` — `if (!hasHydrated) return ...` 가드 유지(hydration mismatch 방지).
  - `store/wishlist-store` — `items`(string[]), `hasHydrated`. 변경 금지.
  **Must NOT do**:
  - wishlist store 수정 금지 — id는 문자열 그대로(DB id와 매칭되어야 함).
  - server에서 wishlist를 읽으려 하지 말 것(불가능 — localStorage).
  - empty state UI 변경 금지.
  **QA Scenarios**:
  - Happy path: 상품 몇 개 wishlist 추가 후 `/liked` → 추가한 상품만 렌더, 카운트 일치.
  - 교집합: wishlist에 없는/삭제된 id가 있으면 필터에서 제외(에러 없음).
  - Hydration: 새로고침 직후 깜빡임/mismatch 없음(`hasHydrated` 가드 동작).
  - 검증: PRODUCTS import 제거, `npx tsc --noEmit` 에러 0.

- [ ] 14. `app/product/[id]` ISR 전환 (`generateStaticParams` DB + `revalidate`/`dynamicParams`) `category:ultrabrain`
  **무엇을**: `app/product/[id]/page.tsx`를 server component로 두고 `export const revalidate = 3600; export const dynamicParams = true;` 추가. `generateStaticParams`는 `getAllProducts()` 기반 id 목록(또는 빈 배열) 반환. 상품 조회는 `getProductById(id)` → 없으면 `notFound()`. `<ProductDetailClient product={...} />` 유지.
  **왜**: 상품 추가가 재배포 없이 반영되게(ISR). 빌드타임 정적생성이 DB로 깨지는 문제를 `dynamicParams=true`로 해결.
  **References**:
  - `app/product/[id]/page.tsx:1-21` — 현재 `PRODUCTS.map` generateStaticParams(line 6-10) + `PRODUCTS.find`(line 14) + `use(params)`(line 13). DB 버전으로 교체.
  - `components/product/ProductDetailClient` — props `product` 그대로 받음(인터페이스 변경 없게).
  - 확정 결정 #2 — `revalidate=3600`, `dynamicParams=true`.
  **Must NOT do**:
  - `ProductDetailClient` props 인터페이스 변경 금지.
  - `generateStaticParams`가 빌드 시 DB 접근 실패로 빌드를 깨면 안 됨 → 실패 시 빈 배열 반환 허용(dynamicParams로 on-demand 생성).
  - id를 number로 캐스팅 금지(문자열 유지).
  **QA Scenarios**:
  - Happy path: `/product/1` → "Kalix T Jacket" 상세 렌더. 없는 id `/product/999` → 404(notFound).
  - ISR 빌드: `npm run build` → 상세 라우트가 ISR로 표시(빌드 로그에 정적생성 에러 없음).
  - 추가 반영: (개념 검증) 새 상품을 DB에 넣으면 `dynamicParams=true`로 `/product/<newid>` 접근 시 on-demand 생성.
  - 검증: PRODUCTS import 제거, `npx tsc --noEmit` 에러 0.

- [ ] 15. `data/dummy.ts`에서 `PRODUCTS` export 제거 (TRENDS만 잔존) `category:quick`
  **무엇을**: `data/dummy.ts`에서 `PRODUCTS` 배열 정의/export를 삭제. `TRENDS`만 남긴다. `import { Product }` 등 PRODUCTS 전용 미사용 import 정리.
  **왜**: dummy 카탈로그 의존을 영구 제거(CLAUDE.md Forbidden: dummy.ts PRODUCTS 신규 의존 금지의 최종 완수). 잔존 시 두 소스(DB/dummy) 불일치 위험.
  **References**:
  - `data/dummy.ts:1-` — `PRODUCTS` 정의 + `TRENDS`. PRODUCTS만 제거.
  - Task 8~14 완료가 선행 조건 — 모든 화면이 더 이상 PRODUCTS를 import하지 않아야 안전.
  - `components/ui/K_TrendSection.tsx` — TRENDS 사용 → 영향 없음(유지).
  **Must NOT do**:
  - TRENDS 삭제 금지.
  - `types` import 중 TRENDS가 쓰는 것(`Trend`) 삭제 금지.
  **QA Scenarios**:
  - Happy path: `grep -rn "PRODUCTS" data/dummy.ts` → 정의 0건. `npm run build` 성공.
  - 회귀: `grep -rn "from \"@/data/dummy\"" app components` 결과에 PRODUCTS import 0건(TRENDS import만 허용).
  - 검증: `npm run test` 통과, `npx tsc --noEmit` 에러 0, `npm run build` 성공.

---

## Final Verification Wave

- [x] F1. PR1 빌드 검증 체인
  **검증**: `npx prisma generate` (exit 0) → `npm run test app/api/orders` (단위+통합 통과) → `npx tsc --noEmit` (에러 0). DB에 Product 8개 시드 확인(id "1" → price 719). 주문 생성이 DB 가격으로 재검증되는지 통합 테스트로 확인.
  **기대결과**: PR1 머지 가능 상태(화면은 아직 dummy.ts 사용 중이어도 OK — PRODUCTS export는 PR2 Task 15까지 살아 있음).

- [ ] F2. PR2 빌드 검증 체인 (ISR 동작 포함)
  **검증**: `npx tsc --noEmit` (에러 0) → `npm run build` 성공. 빌드 로그에서 `/product/[id]`가 ISR(revalidate)로 처리되고 정적생성 실패 없음. `npm run dev`로 8개 화면(`/`, `/shop`, `/ranking`, `/for-you`, `/liked`, `/brands`, `/try-on`, `/product/1`) 수동 클릭 확인.
  **기대결과**: 모든 화면이 DB 상품을 렌더, 빈 화면/에러 없음.

- [ ] F3. 전체 회귀 — dummy.ts PRODUCTS 참조 잔존 0건 확인
  **검증**: `grep -rn "PRODUCTS" app components data` → `data/dummy.ts`에 정의 0건, 어떤 파일도 PRODUCTS import 안 함(TRENDS만 허용). `npm run test` 전체 통과 + `npm run build` 성공.
  **기대결과**: Success Criteria 전부 충족.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | 스키마 먼저 (모든 DB 작업의 토대) |
| 2 | 1 | Product 테이블이 있어야 시드 가능 |
| 3 | 1, 2 | DB에 상품이 있어야 findUnique 동작 |
| 4 | 3 | route 변경 후 단위 테스트 갱신 |
| 5 | 2, 3 | 시드된 실 DB + route 변경 후 통합 테스트 |
| 6 | 1 | 스키마 확정 후 ADR 기록 |
| 7 | 1, 2 | 공유 헬퍼는 모델/시드 완료 후 (PR2 시작점) |
| 8 | 7 | 헬퍼 사용 |
| 9 | 7 | 헬퍼 사용 |
| 10 | 7 | 헬퍼 사용 |
| 11 | 7 | 헬퍼 사용 |
| 12 | 7 | 헬퍼 사용 |
| 13 | 7 | 헬퍼 사용 |
| 14 | 7 | 헬퍼 사용 + ISR |
| 15 | 8,9,10,11,12,13,14 | 모든 화면 전환 후 마지막에 export 제거 |

---

## Parallel Execution Graph

```
PR1 (순차 성격 강함 — DB 토대):
  Wave 1: Task 1 (스키마+db push)
  Wave 2: Task 2 (시드)   ── Task 6 (ADR)는 Task 1 이후 언제든 병렬 가능
  Wave 3: Task 3 (route)
  Wave 4: Task 4, Task 5 (테스트 2개 병렬)

PR2 (헬퍼 후 화면 병렬 — 핵심 병렬 구간):
  Wave 5: Task 7 (공유 헬퍼 lib/products.ts)
  Wave 6 (병렬, 7 완료 후): Task 8, 9, 10, 11, 12, 13, 14   ← 7개 동시 (목표 5~8 충족)
  Wave 7: Task 15 (export 제거 — 모든 화면 전환 후)

Critical Path: 1 → 2 → 3 → 5 → 7 → 13 → 15 → F2 → F3
```

> PR2 Wave 6은 7개 화면이 서로 독립적이라 병렬 실행 가능. 단 각 화면이 Task 7의 헬퍼에 의존하므로 Task 7을 먼저 완료해야 한다.

---

## Category + Skills

| Task | Category | Category Reason | Skills Omitted (Why) |
|------|----------|----------------|----------------------|
| 1 | ultrabrain | DB 스키마 설계, id String 결정의 파급 | frontend-ui-ux: UI 없음 |
| 2 | ultrabrain | 멱등 시드 + DIRECT_URL 경유 정확성 | - |
| 3 | ultrabrain | 결제 보안 경로(가격 재검증) | - |
| 4 | ultrabrain | mock 정합성(Prisma mock 추가) | - |
| 5 | ultrabrain | 실 DB fixture lifecycle 관리 | - |
| 6 | writing | ADR 문서 작성 | code-review: 코드 변경 없음 |
| 7 | ultrabrain | 타입 매핑(Prisma category String ↔ ProductCategory enum) | - |
| 8–14 | ultrabrain | client→server 분리 패턴 일관 적용, liked 매칭 로직 | visual-engineering: UI 변경 없음(데이터 소스만 교체) |
| 15 | quick | export 한 줄 제거 + import 정리 | - |

---

## Test Strategy (hybrid — ADR-003)
- [ ] **단위 (mock)**: `route.test.ts` — `prisma.product.findUnique` mock 추가(Task 4). 기존 `PRODUCTS[0]`(id="1", price=719) fixture 값을 mock 반환값으로 대체. 미인증 401 / 빈 항목 400 / 없는 상품 400 / 정상 재계산 / price 조작 무시 / quantity 0 케이스 유지.
- [ ] **통합 (실 Postgres)**: `route.integration.test.ts` — `beforeAll`에서 테스트 Product upsert, `afterAll`에서 정리(Task 5). `DATABASE_URL`/`DIRECT_URL` 필요(없으면 실패가 맞음 — silent skip 금지).
- [ ] **검증 명령**: `npx prisma generate` → `npm run test` → `npx tsc --noEmit` → `npm run build`.

## Success Criteria
- [ ] `prisma db push` 후 Product 테이블 존재, 8개 상품이 기존 id `"1"`~`"8"`로 시드됨 (`prisma.product.findUnique({where:{id:"1"}})` → "Kalix T Jacket", price 719)
- [ ] `npm run test` 전체 통과 (단위+통합)
- [ ] `npx tsc --noEmit` 에러 0
- [ ] `npm run build` 성공 — 상세페이지가 ISR(`revalidate`/`dynamicParams`)로 빌드되고 정적생성 실패 없음
- [ ] 주문 생성 시 가격이 `prisma.product.findUnique` 값으로 재검증됨 (클라 입력 price 무시 유지)
- [ ] `data/dummy.ts`에 `PRODUCTS` export 없음, `TRENDS`만 남음. `grep "PRODUCTS" data/dummy.ts` → 정의 0건
- [ ] 8개 화면이 DB에서 상품을 읽어 정상 렌더 (빈 화면/에러 없음)

## Risks / Rollback
- **Risk: seed가 pgbouncer로 실행돼 실패** → 시드는 반드시 `DIRECT_URL` 경유. Prisma datasource `directUrl`이 migration/seed에 자동 사용됨. 실패 시 `.env.local`의 `DIRECT_URL`(pgbouncer 없는 direct connection) 확인.
- **Risk: id를 Int로 바꿔 cart/wishlist/Order 스냅샷 깨짐** → **금지**. id String 유지(확정 #4). PR2 각 task QA에서 문자열 id 사용 확인.
- **Risk: ISR 전환으로 빌드타임 정적생성 깨짐** → `dynamicParams=true`로 on-demand 생성 허용. `generateStaticParams`가 빈 배열이어도 동작.
- **Risk: PR2 화면 전환 중 회귀** → PR1과 분리되어 격리됨. PR2 각 화면은 독립 task라 문제 화면만 롤백 가능.
- **Risk: PRODUCTS export 조기 제거(Task 15를 PR1에서 실행)** → PR1 시점엔 화면이 아직 PRODUCTS 사용 중이므로 빌드 깨짐. **반드시 PR2 마지막**.
- **Rollback PR1**: `git revert` + `prisma db push`로 Product 모델 제거(시드 재생성 가능). route.ts를 `PRODUCTS.find`로 되돌림(PR1 시점 PRODUCTS export 살아 있어 안전).
- **Rollback PR2**: 화면 단위 `git revert`. Task 15(export 제거)가 PR2 마지막이므로, 문제 시 export 복원이 가장 빠른 롤백.
