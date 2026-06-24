# Work Plan: HOT 배지 자동화 (조회수 상위)

> 상태: 설계·결정 확정(인터뷰 2026-06-24). admin 상품 등록 트랙(#35~39) 후속 마무리. 단일 PR(`feat/hot-auto-views`).
> 작업 디렉터리: `e:\kamwoo\6.Programing\Potata\potata` (`src/` 없음). 옆 `Potato\potato`와 혼동 금지.
> 검증 기준 시점: `prisma/schema.prisma`(Product 66-93) · `lib/products.ts`(toAppProduct 31-51 isHot=p.isHot, getAllProducts unstable_cache, getProductById) · `components/ui/ProductCard.tsx`(배지 51-62 NEW/BEST만, HOT 미구현) · `components/product/ProductDetailClient.tsx`(클라 — 조회 트래킹 지점) · `app/product/[id]/page.tsx`(ISR) · `app/api/admin/products/route.ts`(isHot 파싱 85·203, createProduct 호출) · `components/admin/AdminProductForm.tsx`(HOT 체크박스 62·373-393) · `app/api/ootd/[id]/route.ts`(dynamic param 라우트 패턴).

## Overview
- **Objective**: 운영자 수동 지정이던 HOT 배지를 **조회수 상위로 자동화**. 상품 상세 조회 시 조회수를 누적하고, 상위 N개를 HOT으로 표시한다. NEW/BEST 자동화(#39)에 이어 마지막 수동 배지 제거.
- **확정 결정(인터뷰)**: HOT = **조회수 상위 4개 + 최소 1회 이상**. HOT 랭킹/배지 = **주기 ~30분 갱신**(조회수 자체는 실시간 누적). 중복 = **경량(useRef + sessionStorage 세션당 1회)**.
- **핵심 아키텍처(librarian 권장 — ISR 함정 회피)**: 조회수 증가는 **카탈로그 캐시를 깨지 않는다**(조회마다 `revalidateTag('products')` ❌). 조회수는 DB에서 실시간 누적, HOT 랭킹은 **별도 캐시**(`tags:['hot-products']`, `revalidate: 1800`)로 분리해 주기 갱신.
- **Branch / PR**: 단일 PR `feat/hot-auto-views`.
- **Scope**:
  - **IN**: `Product.viewCount Int @default(0)` + `@@index([viewCount])`(스키마); `POST /api/products/[id]/view`(public, atomic increment, 카탈로그 캐시 무영향); 상세 조회 시 클라 fire-and-forget 트래킹(useRef + sessionStorage 세션당 1회); `lib/products.ts` `getHotProductIds()`(별도 캐시, top-4 viewCount≥1) + getAllProducts/getProductById에서 `isHot` 랭킹 파생; `ProductCard`에 HOT 배지 렌더 추가; admin 폼 HOT 체크박스 제거 + 라우트 isHot 파싱 제거; 단위테스트.
  - **OUT**: 정식 CTR(노출수 추적), 서버 dedup(쿠키/IP), Vercel Cron 강제 갱신(주기 revalidate로 충분), 조회수 UI 노출(배지만 — 숫자 미표시), HOT 실시간.
- **Approach**: 조회수 증가/HOT 랭킹/카탈로그 캐시 3개를 분리. 조회수 라우트는 wishlist/ootd 게이트 패턴 차용하되 **public**(인증 불요 — 누구의 조회든 카운트). 랭킹은 `unstable_cache`로 30분 캐시. `isHot`은 getAllProducts/getProductById가 hotIds(Set) 멤버십으로 파생(현재 `p.isHot` 저장값 대체 — NEW/BEST 파생과 동일 철학).

## Context
### ADR / 기존 결정 (재논의 금지)
- ADR-005: Product.id String, 상세 ISR(revalidate=3600, dynamicParams). ADR-008: DB=SSoT.
- #39: `toAppProduct`가 isNew(createdAt)/isBest(rating·review) 파생, isHot은 `p.isHot` 유지(주석에 "추후 조회수 트랙 이관" 명시). `getAllProducts`=`unstable_cache(tags:['products'])`, admin create 시 `revalidateTag('products')`.
- 응답 `{success,data|error}` + `extractErrorMessage`, try-catch 핸들러 최상위만.

### Research Findings (explore + librarian, 실측)
- `components/ui/ProductCard.tsx:51-62` — NEW/BEST 배지만 렌더, **HOT 미구현** → HOT 배지 추가 필요.
- `lib/products.ts:31-51` toAppProduct(isHot=p.isHot), getAllProducts(unstable_cache), getProductById(무캐시). 8개 페이지가 getAllProducts→ProductCard 소비.
- `components/product/ProductDetailClient.tsx` — "use client", 조회 트래킹 fire-and-forget 지점(마운트 useEffect).
- `app/api/admin/products/route.ts:85,203` isHot 파싱·createProduct 전달 → 제거. `components/admin/AdminProductForm.tsx:62,373-393` HOT 체크박스 → 제거.
- 조회수 라우트: `app/api/ootd/[id]/route.ts` dynamic param(`await params`) 패턴 차용.
- **librarian 핵심**: ① 조회 증가는 클라 fire-and-forget(ISR 캐시된 서버 컴포넌트에선 누락) + Prisma `{increment:1}` atomic. ② 조회마다 `revalidateTag('products')` 금지(캐시 thrash) — HOT 랭킹을 별도 `unstable_cache(revalidate:1800)`로 분리해 주기 갱신. ③ dev StrictMode useEffect 2회 → useRef 가드.

### Ask First (실행 전 승인)
1. **`prisma/schema.prisma` 변경**: `Product`에 `viewCount Int @default(0)` + `@@index([viewCount])`. 승인 후 `npx prisma db push` + `npx prisma generate`.
2. **신규 라우트 `app/api/products/[id]/view/route.ts`**: app/api 구조 추가.

### 갈림길 결정표
| # | 갈림길 | 채택 | 대안(기각) |
|---|--------|------|-----------|
| 1 | HOT 기준 | **조회수 상위 4개 + viewCount≥1** | 절대 임계값(카탈로그 크기 무관 부적절) / 비율(작을 때 0개) |
| 2 | HOT 신선도 | **별도 캐시 30분 주기 revalidate** | 조회마다 revalidate(캐시 thrash) / 실시간 동적 렌더(성능↓) |
| 3 | 조회 증가 위치 | **클라 fire-and-forget POST → atomic increment** | 서버 컴포넌트 증가(ISR 캐시로 누락) |
| 4 | 조회 라우트 인증 | **public(인증 불요)** | auth 게이트(비로그인 조회 누락 — HOT은 전체 인기 반영이 맞음) |
| 5 | isHot 적용 위치 | **getAllProducts/getProductById가 hotIds(별도 캐시) 멤버십으로 파생** | toAppProduct 내부에서 전체 로드(캐시 계층 꼬임) |
| 6 | 중복 조회 | **useRef(dev) + sessionStorage(세션당 1회)** | 서버 dedup(MVP 과함) / 무처리(부풀림) |
| 7 | 카탈로그 캐시 갱신 | **조회 시 미갱신**(products 캐시 유지), HOT만 별도 캐시 갱신 | 조회마다 products revalidate(thrash) |

### Hidden Complexity
1. **별도 캐시 분리 필수**(Task 2·3): `getHotProductIds`를 getAllProducts의 unstable_cache **안에서** 호출하면 hotIds가 products 캐시(1h)에 묶여 30분 갱신이 무력화 → **반드시 분리**(getAllProducts가 raw 캐시 + hotIds 캐시를 각각 await 후 merge). → verify: getHotProductIds 독립 unstable_cache(tags:['hot-products'], revalidate 1800).
2. **조회 라우트가 카탈로그 캐시 무영향**(Task 4): `revalidateTag('products')` 호출 금지(조회마다 전 카탈로그 캐시 깨짐). → verify: 라우트에 revalidateTag 없음(grep).
3. **dev 이중 카운트**(Task 5): StrictMode useEffect 2회 → useRef 가드 + sessionStorage. → verify: 동일 상세 재방문(같은 세션) 시 추가 카운트 없음.
4. **없는 상품 id 조회**(Task 4): atomic update가 P2025(record not found) → 404 또는 무해 처리(조회 트래킹은 실패해도 조용히). → verify: 없는 id POST 시 비크래시.
5. **isHot 파생 전환**(Task 3): toAppProduct가 더 이상 p.isHot 안 씀 → 저장 isHot 무시(NEW/BEST와 동일). createProduct는 isHot 무관. → verify: 상위 4개만 isHot true.

---

## TODOs

### Wave 1 (백엔드 — 스키마·랭킹·조회 API)
- [x] 1. 스키마 `Product.viewCount` 추가 + Ask First 승인 + db push `category:ultrabrain`
  **Goal**: `prisma/schema.prisma` Product에 `viewCount Int @default(0)` + `@@index([viewCount])`. 사용자 승인 후 `npx prisma db push` + `npx prisma generate`.
  **References**: `prisma/schema.prisma:66-93`(Product, 인덱스 컨벤션 91-92).
  **Must NOT do**: 다른 모델/필드 변경 금지. 승인 없이 db push 금지(Ask First). 기존 데이터 영향 없음(default 0).
  **QA**: `prisma generate` 후 `npx tsc --noEmit` 통과, `prisma.product` 타입에 viewCount 노출.

- [x] 2. `lib/products.ts` `getHotProductIds()` 별도 캐시 (top-4 viewCount≥1) `category:ultrabrain`
  **Goal**: `getHotProductIds(): Promise<Set<string>>` 추가 — `unstable_cache(async()=>prisma.product.findMany({where:{viewCount:{gte:1}},orderBy:{viewCount:'desc'},take:4,select:{id:true}}), ['hot-product-ids'], {revalidate:1800, tags:['hot-products']})` 결과를 Set으로. **products 캐시와 독립**.
  **References**: `lib/products.ts`(unstable_cache import·getAllProducts 패턴), librarian best-practice(별도 캐시 분리·Hidden Complexity #1).
  **Must NOT do**: getAllProducts의 캐시 안에서 호출 금지(독립 캐시). revalidate 누락 금지(30분=1800s).
  **QA**: 단위테스트 — viewCount 상위 4개 id 반환, viewCount 0 제외.

- [x] 3. `lib/products.ts` toAppProduct/getAllProducts/getProductById isHot 랭킹 파생 `category:ultrabrain`
  **Goal**: `toAppProduct(p, hotIds?: Set<string>)` — `isHot: hotIds ? hotIds.has(p.id) : false`. getAllProducts = `Promise.all([<raw cached rows>, getHotProductIds()])` 후 `rows.map(r=>toAppProduct(r, hotIds))`. getProductById = product + hotIds 조회 후 파생. (현재 getAllProducts unstable_cache는 raw rows 캐시로 유지하고 merge는 캐시 밖에서.)
  **References**: `lib/products.ts:31-51`(toAppProduct), getAllProducts(현 unstable_cache), Hidden Complexity #1·#5.
  **Must NOT do**: hotIds를 products 캐시 안에서 fetch 금지(30분 갱신 무력화). createProduct 로직 변경 금지(toAppProduct 시그니처에 옵셔널 추가라 호환). isNew/isBest 파생 변경 금지.
  **QA**: 단위테스트 — 상위 4개만 isHot:true, 나머지 false. getProductById도 동일.

- [x] 4. `POST /api/products/[id]/view` — 조회수 atomic increment (public) `category:ultrabrain`
  **Goal**: `app/api/products/[id]/view/route.ts` 신규. `await params`로 id → `prisma.product.update({where:{id},data:{viewCount:{increment:1}}})`. 없는 id(P2025)는 조용히 204/200. **public(인증 불요)**. `revalidateTag('products') 호출 안 함**. 응답 최소(`{success:true}`).
  **References**: `app/api/ootd/[id]/route.ts`(dynamic param `await params` + try-catch + extractErrorMessage), Hidden Complexity #2·#4.
  **Must NOT do**: `revalidateTag('products')` 호출 금지(캐시 thrash). auth 게이트 금지(public). 요청 body 신뢰 금지(id는 path param). try-catch 최상위만.
  **QA**: 단위테스트 — 유효 id → product.update increment 호출 200 / 없는 id → 비크래시(200 or 404, update reject 처리).

### Wave 2 (프론트 — 트래킹·배지·폼 정리)
- [x] 5. ProductDetailClient 조회 트래킹 (fire-and-forget, useRef + sessionStorage) `category:visual-engineering`
  **Goal**: `components/product/ProductDetailClient.tsx`에 마운트 시 조회 트래킹. `useEffect`(productId 의존) + `useRef` 가드(dev 이중) + `sessionStorage` 키(`viewed:${id}`) 세션당 1회 → `fetch('/api/products/'+id+'/view',{method:'POST'}).catch(()=>{})` fire-and-forget(렌더 블록 X).
  **References**: `components/ootd/WhatToWearClient.tsx`(fire-and-forget fetch 패턴), librarian(useRef StrictMode 가드), Hidden Complexity #3.
  **Must NOT do**: await로 렌더 블록 금지. 서버 전용 모듈 import 금지. 중복 카운트 가드(useRef+sessionStorage) 누락 금지.
  **QA**: 상세 1회 방문 시 1회만 POST(같은 세션 재방문 미증가), 네트워크 실패 시 조용히.

- [x] 6. ProductCard HOT 배지 렌더 + admin 폼 HOT 제거 + 라우트 isHot 제거 `category:visual-engineering`
  **Goal**: (a) `components/ui/ProductCard.tsx:51-62`에 HOT 배지 추가(`product.isHot &&` — NEW/BEST 톤과 일관). (b) `components/admin/AdminProductForm.tsx`에서 HOT 체크박스·isHot state·append 제거(배지 섹션 정리 — "배지는 자동" 안내). (c) `app/api/admin/products/route.ts`에서 isHot 파싱·createProduct 전달 제거.
  **References**: `ProductCard.tsx:51-62`(NEW/BEST 배지 마크업), `AdminProductForm.tsx:62,373-393`, `route.ts:85,203`.
  **Must NOT do**: NEW/BEST 배지 변경 금지. 디자인 톤 변경 금지(기존 배지 스타일 차용). createProduct/스키마 외 변경 금지.
  **QA**: HOT 상품에 배지 표시, admin 폼에 HOT 입력 없음, 라우트 isHot 미파싱(grep).

### Wave 3 (테스트)
- [x] 7. 단위테스트 — getHotProductIds/랭킹 파생 + view 라우트 `category:ultrabrain`
  **Goal**: `lib/products.test.ts`(또는 신규)에 getHotProductIds(상위4·0제외)·getAllProducts isHot 파생 테스트(prisma mock). `app/api/products/[id]/view/route.test.ts` — increment 호출·없는 id 처리.
  **References**: `lib/products.test.ts`(기존 mock 골격), `app/api/admin/products/route.test.ts`(라우트 테스트 골격).
  **Must NOT do**: 실 DB 접근 금지. 기존 테스트 수정 금지. unstable_cache mock 필요 시 처리.
  **QA**: `npm run test` 그린.

### Final Verification
- [x] F1. tsc·lint·test·build 그린 + 캐시 분리 확인 — Tier2(validator APPROVED, oracle: list ISR 30m 확인). 목록 5개 명시 revalidate=1800 + Date 직렬화 가드 + 주석/문구 정정.
  **검증**: `npx tsc --noEmit`(0) → `npm run lint`(0 errors) → `npm run test`(그린) → `npm run build`(성공) → grep: view 라우트에 `revalidateTag('products')` 0건, getHotProductIds 독립 캐시(tags:['hot-products']). Tier2 적대검증.
- [ ] F2. 실 동작 수동 검증(선택, 사용자): 상세 방문 → viewCount 증가(DB) → ~30분 후(또는 캐시 강제) 상위 4개 HOT 배지 표시.

## Test Strategy
- 단위(mock): getHotProductIds 랭킹, isHot 파생, view increment 라우트. 회귀: 기존 admin/products/ootd 그린.
- 수동: 실 조회 → DB viewCount 증가 → HOT 반영(주기 갱신).
- OUT: e2e, 부하 테스트.

## Success Criteria
- [ ] 상세 조회 시 viewCount 증가(atomic), 같은 세션 중복 미증가.
- [ ] 조회수 상위 4개(≥1회)가 HOT 배지 자동 표시, 30분 주기 갱신.
- [ ] 조회 시 카탈로그(products) 캐시 미갱신(thrash 없음), HOT만 별도 캐시.
- [ ] admin 폼에서 HOT 수동 입력 제거, 라우트 isHot 미파싱.
- [ ] tsc/lint/test/build green + Tier2 통과. 의존성 변경 0.

## Decisions
- 2026-06-24: HOT = 조회수 상위 4개(≥1회), 30분 주기 갱신, 경량 dedup(useRef+sessionStorage). 조회 증가는 클라 fire-and-forget + atomic increment, 카탈로그 캐시 무영향(HOT 별도 캐시 분리).

## Implementation Log
_(Phase 시작 후 누적)_
