# Work Plan: 좋아요(wishlist) + 장바구니(cart) 계정(DB) 영구 저장

> 상태: 설계 확정(metis 기본값으로 인계, 인터뷰 생략). 실행 전 각 PR의 Wave 1 "스키마 결정 + Ask First 승인" TODO를 반드시 먼저 처리.
> 검증 기준 시점: 신규 브랜치(아래) · `prisma/schema.prisma`(User 11-23, Product 61-84) · `store/wishlist-store.ts` · `store/cart-store.ts` · `app/api/orders/route.ts`(패턴 모델).
> 경로 규칙: 본 리포는 `src/` 없는 루트 기준(`store/`, `app/`, `components/`, `lib/`, `prisma/`). 옆 프로젝트(`Potato\potato`, `src/` 기반)와 혼동 금지.

## Overview

- **Objective**: 로그인 사용자의 좋아요(wishlist)와 장바구니(cart)를 브라우저 로컬(Zustand+localStorage)에서 **계정 DB**로 옮겨, 로그아웃·재로그인·다른 기기에서도 유지되게 한다. 비로그인 사용자는 기존 로컬 동작을 그대로 유지(로그인 필수 패턴).
- **Branch / PR 분할** (2개 PR — 순차):
  - **PR1 (wishlist, 단순)**: `feat/persist-wishlist` — 동기화 패턴을 먼저 정립.
  - **PR2 (cart, 복잡)**: `feat/persist-cart` (PR1 머지 후 분기) — PR1 패턴 재사용 + cart 고유 복잡도(product 재조회·size/color 정규화·가격변동/품절·skipHydration race).
- **Scope**:
  - **IN**: 평면 조인 테이블 2개(`WishlistItem`, `CartItem`) + User 관계, `/api/wishlist` · `/api/cart` Route Handler(auth() 게이트·서버 재검증), 두 store의 서버 동기화(낙관적 업데이트+롤백), 로그인 시 DB→store 초기 로드 1회 가드, 로그아웃 시 store+localStorage 클리어(보안), 단위 테스트(Prisma mock) + 통합 테스트 1개(ADR-003).
  - **OUT**: 결제(Out), 비회원 영속화(로그인 필수 패턴 유지), 게스트→유저 병합(후속 별도 트랙 — 기각 사유 아래), React Query 도입(Zustand+fetch로 충분), Product FK가 아닌 이상 카탈로그 변경, 배포/env 변경(새 테이블은 동일 `DATABASE_URL` — env 영향 없음).
- **Approach**: orders 라우트(`app/api/orders/route.ts`)가 이미 확립한 패턴(auth() 401 게이트 → `session.user.id` 사용·요청 userId 불신 → `prisma.product` 재조회 서버 재검증 → try-catch 핸들러 최상위 → `{success, data|error}` 응답)을 **그대로 재사용**한다. store는 기존 Zustand persist + `hasHydrated` 가드 패턴을 유지한 채, 로그인 상태에서만 fetch로 DB와 동기화하는 얇은 레이어를 추가한다(낙관적 업데이트 후 실패 시 조용히 롤백). 새 컴포넌트/추상화는 최소화(Karpathy: surgical changes, YAGNI).

## Context

### Project Context (from docs/)

- **Product Goal** (`.claude/rules/session.md` 북극성): potata = 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·상품상세 skill·Google OAuth 완료. 본 작업은 roadmap **P2b(나머지 UX)** 일부로, "실유저 가동" 전 체류 경험 개선.
- **ADR Constraints Applied (DO NOT RE-DECIDE)**:
  - **ADR-004** (주문): 서버 가격 재검증(Zero Trust, `productId`로 `prisma.product` 재조회), 로그인 필수 `auth()` 게이트, AED Int. → cart GET이 동일 재조회 패턴으로 현재가/품절을 채운다.
  - **ADR-005** (Product.id=String "1"~"8" 시드, 수동 관리): wishlist/cart의 `productId`는 String. Product는 실제 DB 모델이라 FK 가능하나, 시드 id 특성상 FK 정책은 Wave 1 결정 TODO에서 택1.
  - **ADR-003** (하이브리드 테스트): 단위 = Prisma mock(`vi.mock("@/lib/prisma")`, `vi.hoisted` 패턴 — `app/api/orders/route.test.ts` 참고), 통합 1개 = 실 Postgres(CI `postgres:16`). 로컬 통합은 Supabase pgbouncer(42P05)로 실패하나 CI에서 통과.
  - **ADR-006** (NextAuth v5 JWT, no adapter): `session.user.id` = DB `User.id`. 모든 라우트가 이 값에 의존.
- **Aligned with Existing Plans**: `auth-google-oauth.md`·`supabase-prisma-nextauth-setup.md`가 인증/DB 인프라를 세웠고, 카탈로그 DB화(PR #21/#22)가 Product를 DB 모델로 만들었다. 본 plan은 그 위에 사용자별 조인 테이블 2개를 더하는 **독립 증분**(기존 plan을 뒤집지 않음).
- **Out-of-Scope Items** (재확인): 가짜 user 객체(`user-${Date.now()}`) 금지(CLAUDE.md Forbidden), `data/dummy.ts` 신규 의존 금지, main 직접 commit 금지(feat 브랜치+PR), try-catch 핸들러 최상위만.

### 갈림길 결정표 (기본값 채택 + 대안 기각 사유 — plan 검토 시 변경 가능)

| # | 갈림길 | 기본값 (채택) | 대안 (기각 사유) |
|---|--------|--------------|------------------|
| 1 | 스키마 형태 | **평면 조인 테이블 2개**(`WishlistItem`, `CartItem`) | 4테이블 중첩(Wishlist→WishlistItem, Cart→CartItem 부모 테이블): YAGNI — 사용자당 단일 wishlist/cart라 부모 행이 무의미한 1:1, 조인만 늘어남 |
| 2 | productId 관계 | **Wave 1에서 택1** (기본 권장 = FK + `onDelete: Cascade`) | (a) FK 없이 String + 앱레벨 검증: 삭제 상품 자동 정리 안 됨(읽기 시 필터 필요). (b) `onDelete: Restrict`: 상품 삭제가 차단됨(카탈로그 운영 불편) |
| 3 | size/color unique | **NOT NULL + 빈문자열("") 기본값 정규화** | nullable 유지: Postgres `@@unique`에서 NULL끼리 충돌 안 나 중복 행 발생 → unique 무력화 |
| 4 | API 형태 | **Route Handler(`/api/...`)** | Server Actions: 프로젝트가 orders/auth/try-on 전부 Route Handler + `{success,error}` + `auth()` 게이트 + try-catch 최상위로 일관 → 비일관 도입은 변경 표면만 키움 |
| 5 | 동기화 방식 | **Zustand + fetch(낙관적+롤백)** | React Query 도입: 단일 store 동기화엔 과함(Out), 의존성 추가(package.json Ask First) |
| 6 | 초기 로드 위치 | **전역 동기화 컴포넌트 1개**(AuthProvider 인근, layout) | 페이지별 useEffect: cart-store `skipHydration:true`라 페이지마다 rehydrate/load race·중복 → 전역 1곳으로 단일화 |
| 7 | 게스트→유저 병합 | **이번 범위 제외**(로그인 후 담은 것만 저장→복원) | 병합 구현: 로그인 필수 패턴 + HeartButton 비로그인 차단으로 게스트 wishlist 사실상 없음. cart 병합은 무한루프/중복수량 버그 위험 큼 → 후속 별도 트랙 |
| 8 | PR 분할 | **PR1 wishlist → PR2 cart** | 한 PR: cart가 product 재조회·정규화·race로 훨씬 복잡 → 단순한 wishlist로 패턴 먼저 검증 후 재사용 |
| 9 | toggle API 형태 | **wishlist POST = toggle 멱등**(있으면 delete, 없으면 create) | POST/DELETE 분리: 멀티탭/연타 시 클라 상태와 서버 상태 불일치 가능 — 멱등 단일 엔드포인트가 경쟁에 강함 |

### Research Findings (verified in codebase)

- `store/wishlist-store.ts:4-39` — `items: string[]`(productId), `add/remove/has/toggle`, `hasHydrated`, persist `name:'wishlist-storage'` + `onRehydrateStorage`. **skipHydration 없음**(자동 rehydrate).
- `store/cart-store.ts:14-67` — `items: CartItem[]`(=`{product:Product, quantity, size?, color?}`), `isSameCartItem`(product.id+size+color), `add/remove/updateQuantity/clearCart`, `totalPrice`가 **`item.product.price`로 합계**(product 전체 객체 보유), persist `name:'cart-storage'`, **`skipHydration:true`** + `onRehydrateStorage`.
- `app/checkout/page.tsx:17-22` — skipHydration 대응으로 **수동 `useCartStore.persist.rehydrate()`** 호출 중. 본 작업의 전역 동기화 컴포넌트가 이 rehydrate를 일원화해야 race 회피.
- `app/api/orders/route.ts:12-122` — POST: auth() 401 게이트(13-21) → body 검증 → `productId`별 `prisma.product.findUnique` 재조회 가격 재검증(53-76) → `{success,data}`. GET(124-149): `session.user.id`로 본인만 조회. **cart GET·재검증의 모델 패턴.**
- `lib/products.ts:51-54` — `getProductById(id)`(서버 전용, Prisma→앱 Product 변환, 없으면 null). cart GET이 productId→product 채울 때 사용.
- `components/common/HeartButton.tsx:16-37` — `toggleItem(productId)` + `useSession` 비로그인 confirm→`/login` 게이트. 낙관적 토글 + fire-and-forget fetch 추가 지점.
- `components/liked/LikedClient.tsx:14-21` — `items`(productId[]) + `hasHydrated` 가드(`!hasHydrated`면 빈 화면). 서버 로드 후에도 동일 가드로 깜빡임 방지.
- `app/checkout/page.tsx:14-15,77` — cart `items`/`clearCart` 사용, 주문 성공 후 `clearCart()`. **주문 성공 시 서버 cart도 비워야** 재로그인 시 잔존 안 됨(PR2 반영).
- `components/providers/AuthProvider.tsx:9-11` + `app/layout.tsx:37-43` — `SessionProvider`가 최상위. 전역 동기화 컴포넌트는 이 안(AuthProvider children)에 둬야 `useSession` 사용 가능.
- `types/index.ts:126-141` — `CartItem`/`CartState`. DB는 productId만 저장, 로드 시 product 재조립 필요(타입 보존).
- `prisma/schema.prisma:11-23` — `User`에 `orders Order[]`만 관계. `wishlistItems`/`cartItems` 관계 추가 필요. Product(61-84): id String 수동, sizes/colors String[].
- 테스트 패턴 `app/api/orders/route.test.ts:3-53` — `vi.hoisted`로 mock fn 선언 → `vi.mock("@/auth")`/`vi.mock("@/lib/prisma")` → 라우트 import → `makeReq` 헬퍼. 신규 라우트 테스트가 그대로 따를 골격.

### Metis Hidden Complexity (반드시 step으로 반영)

1. **cart-store `skipHydration:true` → 동기화 useEffect 위치 race** (PR2 Wave 1·2): 전역 컴포넌트 1곳에서 `rehydrate()` → 로그인 시 DB load 순서를 명시. checkout의 수동 rehydrate와 충돌 없게.
2. **cart-store가 product 전체 객체 보유 → DB엔 productId만** (PR2 Wave 2): 로드 시 `getProductById` N건 재조회 + 가격변동/품절 처리(orders 재검증 패턴 재사용). API는 서버에서 재조립해 반환.
3. **size/color nullable + `@@unique` NULL 유일성 깨짐** (PR2 Wave 1): NOT NULL + 빈문자열("") 정규화. cart-store의 `productSizes/colors` fallback과 정합.
4. **멀티탭/연타 토글 경쟁** (PR1·PR2 API): 서버 upsert/delete를 멱등 설계(이미 있으면 무시/덮어쓰기). wishlist는 toggle 멱등, cart는 `@@unique` upsert.
5. **`session.user.id` 정합(ADR-006) 의존**: 모든 라우트가 `session.user.id`만 신뢰(요청 body의 userId 절대 불신).

### librarian (외부 베스트프랙티스 — 참고)

- 동기화: Zustand+fetch로 충분(React Query 불필요). 낙관적 업데이트+롤백. 로그인 `useEffect` 트리거 + 무한루프 가드. 로그아웃 시 store/localStorage 클리어.
- hydration: `onRehydrateStorage`+`hasHydrated` 플래그로 mismatch 회피(기존 패턴 유지).
- 병합(범위 밖 참고): 중복 수량 ADD가 표준(Adobe/WooCommerce) — 후속 트랙에서 채택.
- librarian의 4테이블/Server Actions 제안은 metis가 이 프로젝트엔 과함/비일관으로 기각(결정표 #1, #4).

## Prerequisites

- [ ] PR1 작업 시작 전 `feat/persist-wishlist` 브랜치 생성(main 직접 commit 금지). PR2는 PR1 머지 후 `feat/persist-cart` 분기.
- [ ] DB 접근 확인: 로컬 `npx prisma db push` 가능한 `DATABASE_URL`/`DIRECT_URL`(`.env.local`). 새 테이블은 동일 DB — 추가 env 불필요.
- [ ] (실행자 인지) 스키마 변경 = **Ask First**(CLAUDE.md) → 각 PR Wave 1에 사용자 승인 step 포함. 승인 전 `db push` 금지.

---

## PR1 — wishlist 영속화 (`feat/persist-wishlist`)

### TODOs

### PR1 Wave 1 (병렬 — 공유 의존성·결정 먼저)

- [ ] 1. [PR1] WishlistItem 스키마 추가 + FK 정책 결정 + Ask First 승인 `category:ultrabrain`
  **Goal**: `prisma/schema.prisma`에 `WishlistItem` 모델 + `User.wishlistItems` 관계가 추가되고, 사용자 승인 후 `npx prisma db push` + `npx prisma generate`가 성공해 `@prisma/client`에 `WishlistItem` 타입이 노출된다.
  **References**:
  - `prisma/schema.prisma:11-23` — `User` 모델. `orders Order[]`(20행) 옆에 `wishlistItems WishlistItem[]` 관계 추가(패턴 동일).
  - `prisma/schema.prisma:31-45` — `Order` 모델: `userId String` + `user User @relation(...)` + `@@index` 작성 컨벤션 복제.
  - `prisma/schema.prisma:61-84` — `Product.id String @id`(수동 시드 id). FK 대상.
  - `CLAUDE.md` Ask First: "Prisma schema 변경" → 승인 step 필수.
  **스키마 (기본값)**:
  ```prisma
  model WishlistItem {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    productId String
    // FK 정책(결정표 #2 — 기본 권장): product Product @relation(fields:[productId], references:[id], onDelete: Cascade)
    // 대안: FK 생략 + app-level 검증(getProductById null이면 GET에서 필터). 택1 후 한쪽만 남길 것.
    createdAt DateTime @default(now())
    @@unique([userId, productId])
    @@index([userId])
  }
  ```
  Product FK 채택 시 `Product` 모델에도 `wishlistItems WishlistItem[]` 역관계 추가 필요(없으면 `prisma generate` 에러).
  **Must NOT do**: 4테이블 중첩 도입 금지(결정표 #1). 사용자 승인 없이 `db push` 금지. `migrations/` 폴더 신규 생성 금지(현 dev 패턴은 `db push`, migration 폴더 없음). User 모델 기존 필드/인덱스 수정 금지(관계 1줄만 추가 — surgical).
  **QA Scenarios**:
  - Happy path: `npx prisma generate` 후 `npx tsc --noEmit` 통과, `import type { WishlistItem } from "@prisma/client"`가 해석됨.
  - 승인 게이트: schema diff를 사용자에게 제시 → "승인" 응답 전에는 `db push` 실행 안 함.
  - 검증: `npx prisma db push` 출력에 `WishlistItem` 테이블 생성 로그 + `@@unique`/`@@index` 반영 확인. 동일 (userId, productId) 2회 insert 시 unique 위반 발생.

- [ ] 2. [PR1] wishlist 동기화 API 응답/요청 타입 정의 `category:quick`
  **Goal**: `types/index.ts`에 wishlist API 계약 타입을 추가해 라우트·store가 공유한다.
  **References**:
  - `types/index.ts:143-149` — `ApiResponse<T>` 기존 제네릭(`{success, data?, error?, message?}`). 그대로 재사용.
  - `app/api/orders/route.ts:114,117` — 응답 형태 `{success:true,data}` / `{success:false,error}` 선례.
  **추가 타입(예)**:
  ```ts
  export type WishlistGetData = { productIds: string[] };
  export interface WishlistToggleRequest { productId: string; }
  export type WishlistToggleData = { productId: string; liked: boolean };
  ```
  **Must NOT do**: 새 응답 래퍼 형태(예: `{ok,value}`) 도입 금지 — 프로젝트 표준 `{success,...}` 유지. 로직/함수 추가 금지(순수 타입 선언만).
  **QA Scenarios**:
  - Happy path: `npx tsc --noEmit` 통과.
  - Negative: store/라우트가 이 타입으로 import해도 순환 의존 없음(타입만).

### PR1 Wave 2 (Wave 1 완료 후)

- [ ] 3. [PR1] `/api/wishlist` Route Handler(GET/POST toggle 멱등) `category:ultrabrain`
  **Goal**: `app/api/wishlist/route.ts` 신규. GET = 본인 `productId[]` 반환, POST = toggle 멱등(있으면 delete, 없으면 create). 둘 다 `auth()` 401 게이트 + `session.user.id`만 신뢰.
  **References**:
  - `app/api/orders/route.ts:12-21` — `auth()` 게이트 + 401 `{success:false,error:"Unauthorized"}` (그대로 복제).
  - `app/api/orders/route.ts:124-141` — GET: `session.user.id`로 `findMany`, 쿼리 userId 불신(복제).
  - `app/api/orders/route.ts:115-121` — try-catch 핸들러 최상위 + `extractErrorMessage` (복제).
  - `lib/auth.ts` `extractErrorMessage` import 경로(`app/api/orders/route.ts:4` 참고).
  - Task 2 타입(`WishlistGetData`/`WishlistToggleRequest`/`WishlistToggleData`).
  **구현 메모**:
  - GET: `prisma.wishlistItem.findMany({ where:{userId}, select:{productId:true} })` → `productIds`.
  - POST: body `productId` 검증(string·비어있지 않음). `findUnique({where:{userId_productId:{userId,productId}}})` 존재 시 `delete`(liked:false), 없으면 `create`(liked:true). 경쟁 대비: create는 `try{create}catch(P2002){이미 존재}` 또는 멱등 처리.
  - productId 존재 검증(선택, FK 미채택 시): `prisma.product.findUnique`로 없는 상품 차단(400).
  **Must NOT do**: 요청 body의 userId 신뢰 금지(`session.user.id`만). try-catch를 핸들러 최상위 밖에 중첩 금지. 가짜 user/세션 우회 금지. `data/dummy.ts` import 금지.
  **QA Scenarios**:
  - Happy path: 로그인 상태 POST `{productId:"1"}` → 200 `{success:true,data:{productId:"1",liked:true}}`. 같은 body 재호출 → `liked:false`(toggle delete). GET → `data.productIds`에 토글 상태 반영.
  - Negative(401): `auth()`가 null → POST/GET 모두 401 `{success:false,error:"Unauthorized"}`, DB 미접근.
  - Negative(검증): POST `{}`(productId 없음) → 400 `{success:false,error:...}`.
  - Edge(멱등/경쟁): 동시 create 2건 중 1건 P2002 → 에러 노출 없이 `liked:true`로 수렴, 중복 행 없음.
  - 격리: userA가 만든 항목이 userB GET에 안 나옴(`session.user.id` 필터).

- [ ] 4. [PR1] `/api/wishlist` 단위 테스트(Prisma mock) `category:ultrabrain`
  **Goal**: `app/api/wishlist/route.test.ts` 신규. orders 테스트 골격 복제로 401/toggle create/delete/멱등/격리를 커버, `npm run test` 그린.
  **References**:
  - `app/api/orders/route.test.ts:3-53` — `vi.hoisted` mock fn 선언 → `vi.mock("@/auth",...)` + `vi.mock("@/lib/prisma",...)` → 라우트 import → `makeReq` 헬퍼(복제, URL만 `/api/wishlist`로).
  - `app/api/orders/route.test.ts:14-30` — prisma mock 객체 구조(필요 모델만: `wishlistItem.findMany/findUnique/delete/create` (+ FK 검증 시 `product.findUnique`)).
  **Must NOT do**: 실 DB 접근 금지(단위는 mock). orders 테스트 파일 수정 금지(신규 파일만). 테스트 통과를 위한 라우트 로직 약화 금지.
  **QA Scenarios**:
  - `authMock.mockResolvedValue(null)` → POST/GET 401 단언(prisma mock 미호출 단언).
  - `authMock.mockResolvedValue({user:{id:"u1"}})` + `findUnique→null` → create 호출 + `liked:true`.
  - 같은 케이스 `findUnique→{id}` → delete 호출 + `liked:false`.
  - GET: `findMany→[{productId:"1"},{productId:"3"}]` → `data.productIds = ["1","3"]`, where에 `userId:"u1"` 단언.
  - 실행: `npm run test app/api/wishlist/route.test.ts` exit 0.

### PR1 Wave 3 (Wave 2 완료 후)

- [ ] 5. [PR1] wishlist-store 서버 동기화 레이어(낙관적+롤백·초기 로드 액션) `category:ultrabrain`
  **Goal**: `store/wishlist-store.ts`에 서버 productId[]로 store를 채우는 `loadFromServer(ids)` 액션을 추가하고, toggle 시 낙관적 반영 후 fetch 실패 시 원복하는 경로를 정립. 기존 로컬 persist 동작 유지(비로그인 회귀 없음).
  **References**:
  - `store/wishlist-store.ts:14-39` — 기존 store 전체. `toggleItem`(23-30)·`items`·`hasHydrated` 유지하며 액션 추가.
  - Task 2 타입(`WishlistToggleRequest`/`Data`).
  - librarian: 낙관적 업데이트 + 실패 롤백 패턴.
  **구현 메모**:
  - `loadFromServer: (ids: string[]) => set({ items: ids })` (서버가 진실 — 로그인 시 덮어씀).
  - **권장 구조**: store는 순수 상태(`toggleItem` 유지) + fetch 책임은 컴포넌트(Task 7) 또는 얇은 헬퍼(`lib/wishlist-sync.ts`)로 분리(PR2 cart도 재사용 가능하게). 롤백 = 실패 시 `toggleItem(id)` 재호출로 원복.
  **Must NOT do**: 기존 비로그인 로컬 토글 동작 변경 금지. store에 `fetch` 직접 박아 SSR/테스트 깨뜨리지 말 것(클라이언트 경로에서만 호출). 무한 set 루프 유발 금지.
  **QA Scenarios**:
  - Happy: `loadFromServer(["1","2"])` 후 `items==["1","2"]`, `hasItem("1")===true`.
  - 낙관적: 토글 즉시 UI 반영 → fetch 성공이면 유지.
  - 롤백: fetch 실패(네트워크/500) → 원래 상태로 복귀, 조용히(콘솔 경고 OK, alert 금지).
  - 비로그인: 서버 호출 없이 기존 로컬 토글만(회귀 없음).

- [ ] 6. [PR1] 전역 동기화 컴포넌트(로그인 로드 1회 가드 + 로그아웃 클리어) `category:ultrabrain`
  **Goal**: 신규 클라 컴포넌트(예: `components/providers/StoreSync.tsx`)를 `AuthProvider` children에 마운트. 로그인 시 `/api/wishlist` GET → `loadFromServer`, 로그아웃 시 store + localStorage 클리어. 무한루프 가드(`useRef`).
  **References**:
  - `components/providers/AuthProvider.tsx:9-11` + `app/layout.tsx:37-43` — `SessionProvider` 내부. StoreSync는 `<AuthProvider>` 안, `{children}` 앞에 마운트(렌더 출력 없는 동기화 전용).
  - `store/wishlist-store.ts` `loadFromServer`(Task 5).
  - librarian: `useSession status==='authenticated'` useEffect + 1회 가드, 로그아웃 시 store/localStorage 클리어.
  **구현 메모**:
  - `const { status } = useSession(); const loadedRef = useRef(false);`
  - `useEffect`: `status==='authenticated' && !loadedRef.current` → GET 후 `loadFromServer(productIds)`, `loadedRef.current=true`.
  - `status==='unauthenticated'`(로그아웃 전이) → `useWishlistStore.setState({items:[]})` + `localStorage.removeItem('wishlist-storage')` + `loadedRef.current=false`(다음 로그인 재로드 허용).
  - PR2에서 cart 로드/클리어를 같은 컴포넌트에 통합(Task 13) — 재사용 가능하게 작성.
  **Must NOT do**: 페이지별 useEffect로 분산 금지(결정표 #6 race). 클리어 누락 금지(보안 — 다음 계정에 잔존). 매 렌더 GET 금지(1회 가드 필수). 렌더 마크업 추가 금지(null 반환).
  **QA Scenarios**:
  - Happy: 로그인 직후 GET 1회만 발생(네트워크 탭) → 좋아요 복원.
  - 무한루프 방지: status 변화 없을 때 추가 GET 없음.
  - 로그아웃 보안: 로그아웃 시 `localStorage['wishlist-storage']` 제거 + store 비움 → 다른 계정 로그인 시 이전 좋아요 안 보임.
  - 재로그인: 로그아웃 후 재로그인 → 다시 GET 1회 → 복원.

- [ ] 7. [PR1] HeartButton 낙관적 토글 + fire-and-forget 저장 연결 `category:visual-engineering`
  **Goal**: `components/common/HeartButton.tsx`의 로그인 토글 경로에서 로컬 즉시 토글(낙관적) + `/api/wishlist` POST(fire-and-forget, 실패 시 롤백). 비로그인 confirm→/login 게이트는 그대로.
  **References**:
  - `components/common/HeartButton.tsx:16-37` — `handleClick`(23-37): 비로그인 게이트(27-34) 유지, `toggleItem(productId)`(36) 뒤에 fetch 추가.
  - Task 5 store(`toggleItem` + 롤백 경로)·Task 2 타입.
  - `app/checkout/page.tsx:62-83` — fetch + `res.status===401`/`data.success` 처리 패턴(참고, 여기선 fire-and-forget이라 간소화).
  **구현 메모**:
  - `toggleItem(productId)` 즉시(낙관적) → `fetch('/api/wishlist',{method:'POST',body:JSON.stringify({productId})})` → 실패(`!res.ok`/throw)면 `toggleItem(productId)` 재호출로 롤백 + `console.warn`.
  - UI 피드백(하트 애니메이션 `HeartButton.tsx:57-64`)은 낙관적 반영이라 유지.
  **Must NOT do**: 저장 완료까지 UI 블로킹 금지(낙관적). 비로그인 게이트 제거 금지. alert로 실패 노출 금지(조용한 롤백). LikedClient(`components/liked/LikedClient.tsx`)는 store만 구독하므로 별도 수정 불필요 — 건드리지 말 것.
  **QA Scenarios**:
  - Happy: 로그인 후 하트 클릭 → 즉시 채워짐 + 백그라운드 POST 200 → `/liked`에 반영.
  - 롤백: POST 실패(오프라인) → 하트가 원상복귀, 콘솔 경고만.
  - 비로그인: 하트 클릭 → confirm("로그인이 필요...") → /login(서버 호출 없음).
  - 다른 기기: 기기 A에서 좋아요 → 기기 B 로그인 → `/liked`에 표시(Task 6 로드 경유).

### PR1 Final Verification Wave

- [ ] F1. [PR1] tsc·lint·전체 테스트 그린 + 라우트 가드 회귀
  **검증 단계**: `npx prisma generate` → `npx tsc --noEmit`(exit 0) → `npm run lint`(exit 0) → `npm run test`(orders/auth/try-on 기존 + 신규 wishlist 그린). 기대결과: 전부 통과, 신규 wishlist 라우트 401/멱등 단언 포함.

- [ ] F2. [PR1] wishlist end-to-end 수동 검증(재로그인/다른 기기 유지 + 로그아웃 클리어)
  **검증 단계**: `npm run dev` → 로그인 → 상품 2개 좋아요 → 로그아웃(브라우저 localStorage `wishlist-storage` 비었는지 확인) → 재로그인 → `/liked`에 2개 복원 → 시크릿창/다른 브라우저 로그인 시 동일 복원 → 로그아웃 후 다른 계정 로그인 시 이전 좋아요 미노출. 기대결과: 모든 항목 충족.

---

## PR2 — cart 영속화 (`feat/persist-cart`, PR1 머지 후)

### TODOs

### PR2 Wave 1 (병렬 — 공유 의존성·결정 먼저)

- [ ] 8. [PR2] CartItem 스키마 추가 + size/color NOT NULL("") 정규화 + Ask First 승인 `category:ultrabrain`
  **Goal**: `prisma/schema.prisma`에 `CartItem` 모델(size/color **NOT NULL, default ""**) + `User.cartItems` 관계 추가, 사용자 승인 후 `db push`+`generate` 성공. `@@unique([userId, productId, size, color])`가 실제로 동작(NULL 충돌 함정 회피).
  **References**:
  - `prisma/schema.prisma:11-23` — `User`에 `cartItems CartItem[]` 추가(Task 1과 동일 패턴).
  - `prisma/schema.prisma:61-84` — `Product` FK 대상(채택 시 역관계 추가).
  - `store/cart-store.ts:14-17` — `isSameCartItem`(product.id+size+color)가 cart의 "동일 항목" 기준 → DB `@@unique` 키와 정합.
  - Metis hidden complexity #3(NULL 유일성 함정).
  **스키마 (기본값)**:
  ```prisma
  model CartItem {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    productId String
    // FK 정책(결정표 #2): product Product @relation(fields:[productId], references:[id], onDelete: Cascade)
    size      String   @default("")  // NOT NULL — NULL이면 @@unique 무력화(결정표 #3)
    color     String   @default("")  // NOT NULL — 동일
    quantity  Int      @default(1)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    @@unique([userId, productId, size, color])
    @@index([userId])
  }
  ```
  **Must NOT do**: size/color를 `String?`(nullable)로 두지 말 것(결정표 #3 — unique 깨짐). 사용자 승인 없이 `db push` 금지. quantity ≤ 0 허용 금지(앱/DB에서 최소 1). 4테이블 중첩 금지.
  **QA Scenarios**:
  - Happy: `prisma generate` 후 `CartItem` 타입 노출, `tsc --noEmit` 통과.
  - unique 동작 검증: size 미지정 항목을 빈문자열("")로 2회 upsert → 1행만(quantity 갱신), 중복 행 없음.
  - 승인 게이트: schema diff 제시 → 승인 후에만 `db push`.

- [ ] 9. [PR2] cart 동기화 API 요청/응답 타입 정의(product 재조립 형태) `category:quick`
  **Goal**: `types/index.ts`에 cart API 계약 타입 추가. GET 응답은 store가 그대로 쓸 수 있는 `CartItem[]`(product 재조립) 형태, PUT 요청은 productId+size+color+quantity만(가벼운 동기화).
  **References**:
  - `types/index.ts:126-141` — 기존 `CartItem`(product 포함)·`CartState`. GET 응답 data = `CartItem[]` 재사용.
  - `types/index.ts:211-219` — `CreateOrderRequest.items`(productId/quantity/size?/color?) 형태 참고(PUT 요청 모양 유사).
  **추가 타입(예)**:
  ```ts
  // PUT /api/cart 요청 — 가벼운 라인 배열(서버가 재검증·재조립)
  export interface CartSyncLine { productId: string; size: string; color: string; quantity: number; }
  export interface CartSyncRequest { items: CartSyncLine[]; }
  // GET 응답 data = 기존 CartItem[](product 재조립). 별칭만:
  export type CartGetData = { items: CartItem[] };
  ```
  **Must NOT do**: GET 응답에 클라가 보낸 price를 신뢰해 넣지 말 것(서버 재조회값만 — Task 10). 응답 래퍼 표준(`{success,...}`) 변경 금지.
  **QA Scenarios**:
  - Happy: `tsc --noEmit` 통과, store가 `CartGetData.items`를 `setState({items})`에 그대로 사용 가능.

### PR2 Wave 2 (Wave 1 완료 후)

- [ ] 10. [PR2] `/api/cart` Route Handler(GET 재조회·재검증 / PUT 전체 동기화 upsert) `category:ultrabrain`
  **Goal**: `app/api/cart/route.ts` 신규. GET = 본인 `CartItem` 행을 `getProductById`로 product 재조립(현재가 반영·삭제 상품 제외) → `CartItem[]`. PUT = 클라 라인 배열로 본인 cart 전체 동기화(upsert, size/color "" 정규화). auth() 401 게이트 + `session.user.id`만 신뢰.
  **References**:
  - `app/api/orders/route.ts:53-76` — `productId`별 `prisma.product.findUnique` 재조회 + 서버값만 사용(가격 재검증) — GET 재조립에 동일 패턴.
  - `lib/products.ts:51-54` — `getProductById(id)`(없으면 null → 삭제 상품 필터).
  - `app/api/orders/route.ts:12-21,115-121,124-141` — auth 게이트·try-catch 최상위·`session.user.id` GET(복제).
  - Task 9 타입(`CartSyncRequest`/`CartGetData`)·`store/cart-store.ts:14-17`(동일 항목 기준).
  **구현 메모**:
  - GET: `prisma.cartItem.findMany({where:{userId}})` → 각 행 `getProductById(productId)`; null이면 스킵(품절/삭제) + 해당 DB 행 정리(선택). product 있으면 `{product, quantity, size: size||undefined, color: color||undefined}`로 재조립(빈문자열은 앱 타입에선 undefined로 환원해 기존 UI와 정합).
  - PUT: body `items` 검증(quantity ≥ 1 정수, productId string). 정규화 `size = size ?? ""`, `color = color ?? ""`. 전체 동기화 전략: `$transaction`으로 본인 행 `deleteMany({where:{userId}})` 후 `createMany`(정규화된 라인), 또는 라인별 upsert(`where:{userId_productId_size_color}`). productId 미존재 라인은 검증 후 무시/400 — 정책 명시.
  **Must NOT do**: 클라가 보낸 price/name 신뢰 금지(서버 재조회값만 — ADR-004). 요청 body userId 신뢰 금지. try-catch 중첩 금지. 가격변동/품절을 무시하고 클라 스냅샷 저장 금지.
  **QA Scenarios**:
  - Happy(GET): DB에 productId "1"(qty2,size"M") 존재 → 200 `data.items[0].product.id==="1"`, `product.price`=DB 현재가, `quantity===2`.
  - 가격변동: 시드 price 변경 후 GET → 응답 price가 변경된 현재가(클라 캐시값 아님).
  - 품절/삭제: 존재하지 않는 productId 행 → GET 응답에서 제외(items에 없음).
  - 정규화: PUT size 없이 보낸 라인 → DB에 size="" 저장, 동일 라인 재PUT 시 중복 없이 quantity 갱신.
  - Negative(401): `auth()` null → GET/PUT 401, DB 미접근.
  - Negative(검증): PUT quantity 0 → 400.

- [ ] 11. [PR2] `/api/cart` 단위 테스트(Prisma mock·품절/가격변동/정규화) `category:ultrabrain`
  **Goal**: `app/api/cart/route.test.ts` 신규. orders 골격 복제 + `lib/products` mock으로 GET 재조립/품절 제외/가격변동/PUT 정규화·멱등을 커버. `npm run test` 그린.
  **References**:
  - `app/api/orders/route.test.ts:3-53` — mock 골격(복제, URL `/api/cart`).
  - GET이 `getProductById`(lib/products)를 쓰면 `vi.mock("@/lib/products", ...)`로 mock(없으면 라우트가 prisma.product 직접 호출 — 그 경우 `product.findUnique` mock). 구현(Task 10)이 택한 경로에 맞춰 mock.
  **Must NOT do**: 실 DB 접근 금지(통합은 Task 15). orders/wishlist 테스트 수정 금지.
  **QA Scenarios**:
  - 401: `authMock→null` → GET/PUT 401.
  - GET 재조립: `cartItem.findMany→[{productId:"1",quantity:2,size:"M",color:""}]` + `getProductById("1")→{price:719,...}` → `items[0].quantity===2`, `product.price===719`.
  - 품절 제외: `getProductById→null` → `items` 비어있음.
  - PUT 정규화: 요청 `{productId:"1",size:"",color:"",quantity:1}` → transaction/upsert 호출, size/color "" 단언.
  - 실행: `npm run test app/api/cart/route.test.ts` exit 0.

### PR2 Wave 3 (Wave 2 완료 후)

- [ ] 12. [PR2] cart-store 서버 동기화 레이어(skipHydration race·product 재조립) `category:ultrabrain`
  **Goal**: `store/cart-store.ts`에 서버 `CartItem[]`로 store를 채우는 `loadFromServer(items)` 액션과, 변경(add/remove/updateQuantity) 시 백그라운드 PUT 동기화 경로를 추가. `skipHydration:true`·기존 로컬 동작 유지.
  **References**:
  - `store/cart-store.ts:19-67` — store 전체. `addItem`(26)/`removeItem`(40)/`updateQuantity`(43)/`clearCart`(55) 뒤에 동기화 트리거 연결(또는 컴포넌트/헬퍼에서 PUT). `skipHydration:true`(61).
  - Task 9 타입·Task 10 PUT 계약·PR1 Task 5의 분리된 sync 헬퍼 패턴 재사용.
  - Metis hidden complexity #1·#2.
  **구현 메모**:
  - `loadFromServer: (items: CartItem[]) => set({ items })` (서버 진실).
  - 변경 동기화: store 액션 직후 현재 `items`를 `CartSyncLine[]`(productId/size/color/quantity)로 매핑해 `/api/cart` PUT(디바운스/fire-and-forget). 실패 시 조용히(다음 변경 때 재동기화). product 객체는 PUT에 보내지 않음(서버 재조립).
  - **권장**: PUT 트리거를 store 내부 `fetch`가 아니라 PR1과 동일하게 얇은 헬퍼/구독으로 분리(SSR·테스트 안전).
  **Must NOT do**: 비로그인 시 PUT 호출 금지(로컬만). store에 product price 재계산 로직 추가 금지(서버가 진실, `totalPrice`는 로드된 product 기준 유지). 무한 set 루프 금지.
  **QA Scenarios**:
  - Happy: `loadFromServer([...])` 후 `items`·`totalPrice()` 정상.
  - 동기화: 로그인 상태에서 수량 변경 → 백그라운드 PUT 발생.
  - 비로그인: 변경해도 PUT 없음(로컬만).
  - race: 로그인 직후 rehydrate→load 순서에서 빈 cart로 덮어쓰지 않음(Task 13 가드와 함께).

- [ ] 13. [PR2] 전역 동기화 컴포넌트에 cart 로드/클리어 통합 + checkout rehydrate 정합 `category:ultrabrain`
  **Goal**: PR1의 `StoreSync` 컴포넌트에 cart 경로 통합. 로그인 시 cart-store `rehydrate()` → `/api/cart` GET → `loadFromServer`, 로그아웃 시 cart store+`cart-storage` localStorage 클리어. checkout의 수동 rehydrate(`app/checkout/page.tsx:19-21`)와 충돌 없게.
  **References**:
  - `components/providers/StoreSync.tsx`(PR1 Task 6) — 동일 컴포넌트 확장(wishlist 옆에 cart 블록 추가).
  - `app/checkout/page.tsx:17-22` — 기존 수동 `useCartStore.persist.rehydrate()`. 전역에서 이미 rehydrate되면 checkout은 그대로 둬도 무해(멱등)하나, 동작 정합 확인.
  - `store/cart-store.ts:61`(`skipHydration:true`)·Task 12 `loadFromServer`.
  - Metis hidden complexity #1.
  **구현 메모**:
  - cart 로드 순서: 로그인 감지 → `useCartStore.persist.rehydrate()`(로컬 먼저) → GET → 성공 시 `loadFromServer(items)`(서버로 덮어씀). GET 실패 시 로컬 유지.
  - 로그아웃: `useCartStore.setState({items:[]})` + `localStorage.removeItem('cart-storage')` + cart loadedRef 리셋.
  - 1회 가드는 wishlist와 별개 ref 또는 통합 ref(각 store별 권장).
  **Must NOT do**: cart를 빈 배열로 무조건 덮어써 로컬 미저장분 날리지 말 것(서버 GET 성공 시에만 덮어쓰기). checkout 수동 rehydrate 제거 금지(다른 진입 경로 안전망 — surgical). 페이지별 cart load 추가 금지.
  **QA Scenarios**:
  - Happy: 로그인 → cart GET 1회 → 담아둔 상품 복원, checkout 진입 시 동일.
  - 로그아웃 보안: `localStorage['cart-storage']` 제거 + store 비움 → 다른 계정에 잔존 안 됨.
  - race: 로그인 직후 빈 GET 응답이 와도 로컬에 있던 항목을 깜빡임 없이 처리(서버가 진실이면 비움이 맞음 — 정책 일관).
  - checkout 정합: 전역 로드 후 checkout에서 추가 rehydrate 호출돼도 항목 중복/소실 없음(멱등).

- [ ] 14. [PR2] 주문 성공 시 서버 cart 비우기 연결 `category:ultrabrain`
  **Goal**: 주문 성공 후 로컬 `clearCart()` 뿐 아니라 서버 cart도 비워, 재로그인/다른 기기에서 이미 주문한 cart가 되살아나지 않게 한다.
  **References**:
  - `app/checkout/page.tsx:76-79` — 주문 성공 시 `clearCart()` + `/mypage/orders` 이동. 여기서 서버 cart 비우기 추가.
  - `store/cart-store.ts:55` — `clearCart`(로컬). 서버는 빈 `items`로 PUT(Task 10) 또는 전용 비우기.
  - `app/api/orders/route.ts:99-112` — 주문 생성은 별도 트랜잭션(주문과 cart 비우기를 묶을지 정책: 기본 = 주문 성공 응답 후 클라에서 cart PUT 빈배열. 서버 한 트랜잭션 통합은 OUT — 단순성).
  **구현 메모**:
  - 주문 성공(`res.ok && data.success`) 직후: `clearCart()`(로컬) + `fetch('/api/cart',{method:'PUT',body:JSON.stringify({items:[]})})`(fire-and-forget). 실패해도 다음 cart 변경 시 재동기화되므로 치명 아님(단 로그 남김).
  **Must NOT do**: 주문 실패 시 cart 비우기 금지. cart 비우기 실패로 주문 완료 흐름(라우팅) 막지 말 것(fire-and-forget).
  **QA Scenarios**:
  - Happy: 주문 완료 → 로컬 cart 비고 → 서버 PUT [] → 재로그인 시 cart 비어있음.
  - 다른 기기: 기기A 주문 → 기기B 로그인 시 cart 비어있음.
  - Negative: cart 비우기 PUT 실패해도 주문 완료/이동은 정상.

### PR2 Wave 4 (통합 검증)

- [ ] 15. [PR2] cart 통합 테스트 1개(실 Postgres, ADR-003) `category:ultrabrain`
  **Goal**: `app/api/cart/route.integration.test.ts` 신규. 실 Postgres에 PUT→GET 왕복으로 영속·정규화·재조립을 검증. CI(`postgres:16`)에서 그린(로컬 pgbouncer 42P05 실패는 orders integration 선례대로 허용).
  **References**:
  - `app/api/orders/route.integration.test.ts` — 실 DB 픽스처(User/Product 시드)·세션 mock·정리(afterEach/All) 패턴 복제.
  - Task 10 라우트.
  **Must NOT do**: mock으로 대체 금지(통합은 실 DB). 픽스처 정리 누락 금지(다른 테스트 오염). CI 외 환경 강제 통과 가정 금지.
  **QA Scenarios**:
  - PUT `{items:[{productId:<seed>,size:"M",color:"",quantity:2}]}` → GET → `items[0].quantity===2`, product 재조립 확인.
  - 정규화: 동일 라인 재PUT(quantity 3) → GET 1행, quantity 3(중복 없음 — `@@unique` 동작).
  - 실행: CI에서 `npm run test` 그린.

### PR2 Final Verification Wave

- [ ] F3. [PR2] tsc·lint·전체 테스트(CI 통합 포함) 그린
  **검증 단계**: `npx prisma generate` → `npx tsc --noEmit`(exit 0) → `npm run lint`(exit 0) → `npm run test`(wishlist/cart/orders/auth/try-on 단위 + CI에서 cart 통합) 전부 통과.

- [ ] F4. [PR2] cart end-to-end 수동 검증(재로그인/다른 기기·가격변동·품절·멀티탭)
  **검증 단계**: `npm run dev` → 로그인 → 상품 담기(size/color 포함) → 로그아웃(`cart-storage` 비었는지 확인) → 재로그인 → cart 복원 → 다른 브라우저 로그인 시 동일 복원 → (시드 price 변경 후) 재로드 시 현재가 반영 → 삭제/품절 상품은 cart에서 제외 → 멀티탭 수량 변경 시 중복 행 없이 수렴 → 주문 완료 후 cart 비어있음. 기대결과: 모든 항목 충족.

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | 스키마 + 승인 먼저 (모든 API 전제) |
| 2 | None | 타입 정의 독립 |
| 3 | 1, 2 | 스키마 푸시 + 타입 필요 |
| 4 | 3 | 라우트 구현 후 테스트 |
| 5 | 2, 3 | API 계약 확정 후 store 연결 |
| 6 | 5 | store 액션 존재해야 전역 트리거 |
| 7 | 5 | store 동기화 액션 사용 |
| F1 | 3,4,5,6,7 | 전체 그린 확인 |
| F2 | F1 | 코드 그린 후 수동 검증 |
| 8 | None (PR1 머지 후) | cart 스키마 + 정규화 + 승인 |
| 9 | None | 타입 정의 독립 |
| 10 | 8, 9 | 스키마 + 타입 필요 |
| 11 | 10 | 라우트 후 테스트 |
| 12 | 9, 10 | API 계약 후 store(재조립) |
| 13 | 6, 12 | PR1 전역 컴포넌트 확장 + cart store |
| 14 | 10 | cart 비우기 API 필요 |
| 15 | 10 | 실 DB 라우트 통합 |
| F3 | 10-15 | 전체 그린 |
| F4 | F3 | 수동 검증 |

## Parallel Execution Graph

```
PR1:
Wave 1 (병렬): Task 1(스키마+승인) ∥ Task 2(타입)
Wave 2:        Task 3(라우트) → Task 4(테스트)
Wave 3 (병렬): Task 5(store) → Task 6(전역) ∥ Task 7(HeartButton)
Final:         F1 → F2

PR2 (PR1 머지 후):
Wave 1 (병렬): Task 8(스키마+정규화+승인) ∥ Task 9(타입)
Wave 2:        Task 10(라우트) → Task 11(테스트)
Wave 3 (병렬): Task 12(store) → Task 13(전역 통합) ∥ Task 14(주문 후 클리어)
Wave 4:        Task 15(통합 테스트)
Final:         F3 → F4

Critical Path: 1 → 3 → 5 → 6 → F1 → F2 →(머지)→ 8 → 10 → 12 → 13 → F3 → F4
```

## Category 배분

| Task | Category | Category Reason |
|------|----------|----------------|
| 1 | ultrabrain | 스키마 설계 + FK 정책 트레이드오프 결정 |
| 2 | quick | 타입 선언만(로직 없음) |
| 3 | ultrabrain | 멱등 toggle + auth 게이트 + Zero Trust |
| 4 | ultrabrain | mock 골격 + 경쟁/멱등 케이스 |
| 5 | ultrabrain | 낙관적+롤백 동기화 상태 로직 |
| 6 | ultrabrain | 로그인 1회 가드·로그아웃 보안 클리어 |
| 7 | visual-engineering | HeartButton(UI 인터랙션) 연결 |
| 8 | ultrabrain | unique NULL 함정 + 정규화 + FK |
| 9 | quick | 타입 선언만 |
| 10 | ultrabrain | product 재조회·재검증·품절/가격변동·upsert |
| 11 | ultrabrain | 정규화/품절/가격변동 mock 케이스 |
| 12 | ultrabrain | skipHydration race + product 재조립 |
| 13 | ultrabrain | 전역 동기화 + checkout rehydrate 정합 |
| 14 | ultrabrain | 주문 후 cart 비우기 멱등 |
| 15 | ultrabrain | 실 Postgres 통합 |

## Test Strategy (ADR-003)

- **단위(주력)**: `vi.hoisted` + `vi.mock("@/auth")` + `vi.mock("@/lib/prisma")` (`app/api/orders/route.test.ts:3-53` 골격 복제). 신규 파일: `app/api/wishlist/route.test.ts`, `app/api/cart/route.test.ts`.
  - wishlist: 401 게이트 / toggle create / toggle delete(멱등) / GET 본인만(`session.user.id`) / 요청 userId 불신.
  - cart: 401 게이트 / GET product 재조회 채움 / 삭제 상품 필터(품절) / 가격변동 반영 / size·color "" 정규화 upsert / PUT 전체 동기화 멱등.
- **통합 1개(ADR-003, PR2)**: `app/api/cart/route.integration.test.ts` — 실 Postgres(CI `postgres:16`). PUT→GET 왕복으로 영속 확인. 로컬 pgbouncer(42P05)로 실패해도 CI 그린이면 통과(orders integration 선례 따름).
- store 로직은 라우트 테스트로 계약을 검증하고, store 자체 단위 테스트는 신규 도입하지 않음(기존 store에 테스트 없음 — 패턴 일관).

## Success Criteria

- [ ] 로그인 후 좋아요/장바구니 변경 → 로그아웃 → 재로그인 시 동일하게 복원된다(다른 기기/브라우저 포함).
- [ ] 로그아웃 시 store + localStorage(`wishlist-storage`/`cart-storage`)가 비워져 다음 로그인 계정에 이전 데이터가 노출되지 않는다.
- [ ] 비로그인 사용자는 기존 로컬 동작 그대로(서버 호출 없음, 회귀 없음).
- [ ] cart GET이 DB의 productId로 현재 product/가격을 재조회하며, 삭제된 상품은 빠지고 가격 변동은 현재가로 반영된다.
- [ ] 멀티탭/연타 토글에도 서버 상태가 멱등하게 수렴한다(중복 행 없음 — `@@unique` 동작).
- [ ] 주문 완료 후 서버 cart가 비어 재로그인 시 되살아나지 않는다.
- [ ] `npx tsc --noEmit`·`npm run lint`·`npm run test` 그린. cart 통합 테스트 CI 그린.
- [ ] 스키마 변경(`db push`)은 사용자 승인 후에만 적용되었다.

## Risks / Rollback

| 리스크 | 영향 | 완화 / 롤백 |
|--------|------|------------|
| `db push`가 기존 데이터에 영향 | 낮음(테이블 신규 추가만, 기존 컬럼 불변) | 추가 전용. 문제 시 신규 테이블 drop으로 원복(기존 기능 무영향) |
| size/color nullable로 잘못 푸시 | unique 무력화·중복 행 | Wave 1에서 NOT NULL("") 강제(결정표 #3), 푸시 전 schema diff 확인 |
| 동기화 무한루프(load→set→load) | 런타임 폭주 | `useRef` 1회 가드 + 로그인 status 의존성만(Task 6/13) |
| 로그아웃 클리어 누락 | 계정 데이터 노출(보안) | Task 6/13 필수 step + F2/F4 수동 검증 항목 |
| skipHydration race(cart) | 빈/중복 cart 깜빡임 | 전역 1곳 rehydrate 일원화(Task 13) + checkout 수동 rehydrate와 정합 |
| FK + 시드 상품 삭제 | 조인 행 처리 | 결정표 #2에서 `onDelete` 정책 명시(기본 Cascade) 또는 앱레벨 필터(GET에서 null product 제외) |
| PR1 패턴이 cart에 안 맞음 | PR2 재작업 | PR1에서 동기화/전역/클리어를 cart 재사용 가능하게 설계(Task 5·6 주석) |
| 클라 가격 신뢰로 결제 불일치 | 금액 오류(ADR-004 위반) | cart GET·주문 모두 서버 재조회값만 사용(Task 10) |
