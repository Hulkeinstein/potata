# Work Plan: 상품 검색 기능 (SearchOverlay → /search 결과 페이지)

> **작업 루트**: `e:\kamwoo\6.Programing\Potata\potata` (**Potata\potata** — src/ 없음. 옆 `Potato\potato` 아님)
> **브랜치**: `feat/product-search` (최신 main 기반 — 리뷰·리뷰이미지·Q&A #41~#45 머지 완료)

---

## Overview
- **Objective**: 비작동 SearchOverlay(검색 UI 골격, 제출 핸들러 없음)를 카탈로그 DB(Product) 검색으로 연결한다. 로그인 불필요(공개). 검색어 입력 후 엔터(또는 브랜드칩) → `/search?q=검색어` 결과 페이지로 이동 → name/brand/category 부분일치(대소문자 무시) 상품을 ProductCard 그리드로 표시.
- **Scope**:
  - **IN**: `searchProducts` 헬퍼(lib/products.ts), `/search` 페이지(app/search/page.tsx), SearchOverlay 제출 연결(useRouter + form), 단위/통합 테스트.
  - **OUT**: 오버레이 라이브(debounce) 결과, API 라우트, use-debounce 등 신규 의존성, 풀텍스트(tsvector/GIN), name 인덱스 추가, description 검색, SearchOverlay a11y(포커스트랩/label) 개선, POPULAR_SEARCHES/RECENT_BRANDS 더미 실데이터화, 정렬/필터 고도화, 자동완성, 최근검색어 저장.
- **Approach**: server component 결과 페이지가 `searchProducts(q)`를 직접 호출(서버 직결 — API 라우트 우회). 검색은 Prisma `contains` + `mode:"insensitive"`를 name/brand/category에 OR 조합. 소규모 카탈로그(~8-10개)라 LIKE %q% 풀스캔으로 충분 — 풀텍스트/인덱스 과잉 회피. 기존 `toAppProduct` 재사용으로 Prisma→앱 타입 변환 중복 제거. 결과는 `Product[]`라 신규 타입 불필요.
  - **대안 검토**: (a) 오버레이 라이브 결과 — debounce 의존성·API 필요 → 카탈로그 소규모엔 과잉, OUT. (b) 풀텍스트 검색(tsvector/GIN) — 스키마 변경·운영 복잡 → 8-10개엔 무의미, OUT. (c) API 라우트 경유 — server component가 직접 조회 가능하므로 불필요한 홉, OUT. → contains insensitive OR 직결이 가장 단순(simplicity-first).

## Context

### Project Context (from docs/)
- **Product Goal**: potata = 한국→UAE 패션 커머스. 인증·커머스·카탈로그 DB·리뷰·Q&A 완료. 이번 작업 = 검색(카탈로그 가치 확장, UX 트랙). roadmap P2b "검색 기능(SearchOverlay → 실 필터/결과 페이지)".
- **ADR Constraints Applied**:
  - **ADR-005(불변)**: Product 모델 String @id, name/brand/category/description?, `@@index([category])`, `@@index([brand])`. → name 인덱스 **추가 안 함**(소규모 카탈로그라 불필요). category/brand는 인덱스 존재.
  - **ADR-008**: 상품 SSoT = DB. → 검색도 DB(Product) 대상.
- **Aligned with Existing Plans**: 독립 신규 기능(검색). 리뷰/Q&A 트랙과 분리. lib/products의 기존 헬퍼 패턴(toAppProduct, server-only) 차용.

### Interview Summary
**Key Discussions** (전부 사용자 사전 확정 — 재인터뷰 없음):
- 검색 UX: 결과 페이지 이동(`/search?q=`) — 오버레이 라이브 결과 방식 기각(과잉).
- 검색 대상: name/brand/category 3필드 OR — description 제외(노이즈).
- 인프라: 스키마·의존성 무변경 — name 인덱스/use-debounce/풀텍스트 전부 미도입.

### Research Findings (실측 라인 — plan 작성 직전 Read/Grep stale 재확인 완료)
- **SearchOverlay** `components/search/SearchOverlay.tsx:22-140`: props `{isOpen,onClose}`, `searchTerm` state(:24), `onChange`(:77). **제출 핸들러 없음** → 추가 대상. `useRouter` import 부재 → 추가 필요. 브랜드칩이 이미 `<Link href={`/search?q=${brand}`}>`(:126) — `/search?q=` 패턴 확정. `<input>`(:73-82)은 `<form>` 미감쌈. ESC(:39-45)/close 버튼(:58-64) 닫힘 존재.
- **lib/products.ts:50-110**: `toAppProduct(p, hotIds?)`(:50, hotIds 미전달 시 isHot:false — 검색 결과엔 HOT 배지 불필요하므로 미전달 적합). `getProductById`(:106)가 **unstable_cache 미사용 plain findUnique** 선례 — 검색 헬퍼도 동일하게 캐시 미사용(쿼리별 동적). `prisma` import(:13). **검색 헬퍼 부재** → `searchProducts(q)` 추가.
- **Product 스키마** `prisma/schema.prisma:69-100`: `name`(:71)/`brand`(:72)/`category`(:78 String)/`description?`(:79). `viewCount`(:84). name 인덱스 없음(무변경 확정).
- **ProductCard** `components/ui/ProductCard.tsx:13-109`: 무상태(props `product:Product`), `"use client"`(:1) + useRouter(:7). 검색 그리드 그대로 재사용.
- **app/shop/page.tsx**: server component(`getAllProducts()` → `Suspense` → `ShopContent`), `revalidate=1800`(HOT 캐시용). /search는 동적 쿼리라 revalidate 불필요.
- **app/shop/ShopContent.tsx:96**: 그리드 마크업 `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10` + 빈상태(:115-121 "No products found"). **통째 재사용 금지** — category 필터바(:44-85)·Load More·useSearchParams가 딸려옴. 그리드 마크업만 복제.
- **lib/products.test.ts**: `vi.hoisted({productFindMany})` + `vi.mock("@/lib/prisma")` + `vi.mock("next/cache")` pass-through 패턴 확립. `makePrismaRow` fixture 헬퍼 존재 — 검색 테스트도 동일 패턴 복제.
- **types/index.ts:6-25** Product / :27-34 ProductCategory. 검색 결과 = `Product[]` → **신규 타입 불필요**.

### Metis Review
**Identified Gaps** (plan에 반영):
- **Next 16 `searchParams` 비동기**: server component에서 `const sp = await searchParams` 필수 → Task 2에 명시.
- **ShopContent 통째 재사용 함정**: category 필터 UI·useSearchParams 딸림 → Must NOT do로 명시(그리드 마크업만 복제).
- **searchProducts 캐시 금지**: 쿼리별 동적이라 unstable_cache 부적합(getProductById 선례) → Task 1 Must NOT do.
- **빈/과대 쿼리 가드**: q.trim() 길이 < 2 → `[]` 즉시 반환(DB 쿼리 차단). 공개 입력이라 q는 검색 텍스트로만 사용(SQL injection은 Prisma 파라미터화로 무관하나 trim·길이·encodeURIComponent로 위생 처리).
- **Prisma `mode:"insensitive"` Supabase Postgres 동작**: citext 아님 — `mode:"insensitive"`로 ILIKE 변환됨. 정상.

## Prerequisites
- [ ] `feat/product-search` 브랜치 체크아웃 확인(생성됨, 최신 main 기반).
- [ ] `npx prisma generate` 최신 클라이언트(스키마 무변경이라 재생성 불필요하나 타입 정합 확인용).

---

## TODOs

### Wave 1 (병렬 — 검색 헬퍼 + 페이지 그리드, 서로 독립)
- [x] 1. `searchProducts` 헬퍼 추가 (lib/products.ts) `category:ultrabrain`
- [x] 2. `/search` 결과 페이지 server component 생성 (app/search/page.tsx) `category:visual-engineering`

### Wave 2 (Wave 1 완료 후 — 오버레이를 페이지로 연결)
- [x] 3. SearchOverlay 제출 핸들러 연결 (components/search/SearchOverlay.tsx) `category:visual-engineering`

### Wave 3 (Wave 1~2 완료 후 — 테스트, 헬퍼/페이지/오버레이 의존)
- [x] 4. `searchProducts` 단위 테스트 (lib/products.test.ts) `category:ultrabrain`
- [x] 5. SearchOverlay 제출 + /search 페이지 테스트 (가능 범위) `category:writing`

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | lib/products에 헬퍼 추가 — 독립 |
| 2 | None* | 페이지 스캐폴드는 독립 작성 가능. 단 import는 Task 1 헬퍼 필요 → Task 1 먼저 머지/존재 권장(같은 wave면 1 우선 착수) |
| 3 | 2 | 오버레이가 `/search?q=`로 push — 페이지 존재 전제 |
| 4 | 1 | searchProducts 동작 검증 |
| 5 | 2, 3 | 페이지/오버레이 동작 검증 |

> *Task 2는 Task 1의 `searchProducts` import에 의존. Wave 1 병렬 착수 시 Task 1을 먼저 완료한 뒤 Task 2의 import를 연결한다(같은 wave지만 1 → 2 순서 권장).

---

## Parallel Execution Graph

```
Wave 1 (즉시 시작):
├── Task 1: searchProducts 헬퍼 (lib/products.ts)  ← 먼저 완료 권장
└── Task 2: /search 페이지 (app/search/page.tsx)    ← Task 1 헬퍼 import

Wave 2 (Wave 1 완료 후):
└── Task 3: SearchOverlay 제출 연결

Wave 3 (Wave 1~2 완료 후, 병렬):
├── Task 4: searchProducts 단위 테스트
└── Task 5: 오버레이/페이지 테스트

Critical Path: Task 1 → Task 2 → Task 3 → Task 5
```

---

## Category + Skills

| Task | Category | Category Reason | Skills Omitted (Why) |
|------|----------|----------------|----------------------|
| 1 | ultrabrain | DB 쿼리 헬퍼 — OR 조합·캐시 결정·가드 로직, 정합 중요 | visual: no UI |
| 2 | visual-engineering | server component + 다크/brand-neon 톤 그리드 UI | ultrabrain: 로직은 헬퍼에 위임 |
| 3 | visual-engineering | 오버레이 form/제출 UX, 기존 글래스 톤 유지 | - |
| 4 | ultrabrain | 쿼리 인자·가드·매핑 검증 — 정확성 중요 | - |
| 5 | writing | 테스트 시나리오 기술 중심(가능 범위) | - |

---

## Final Verification Wave

- [x] F1. `npx tsc --noEmit` → ✅ exit 0
- [x] F2. `npm run lint` → ✅ 0 errors, 신규 경고 0(SearchOverlay.test stripMotion 정리 후 — 잔존 3 warning 전부 기존)
- [x] F3. `npm run test` → ✅ 221 passed/6 skipped (searchProducts 5 + SearchOverlay 6 신규)
- [x] F4. `npm run build` → ✅ exit 0, `/search` 동적 라우트(ƒ) 빌드 성공
- [ ] F5. 기능: `npm run dev` → 검색 오버레이 열고 "denim" 입력 후 엔터 → `/search?q=denim` 이동 확인
- [ ] F6. 기능: name/brand/category 부분일치 상품이 ProductCard 그리드로 표시됨(매칭 1건 이상 케이스)
- [ ] F7. 기능: 대소문자 무시 — "DENIM"·"Denim"·"denim" 동일 결과
- [ ] F8. 기능: 매칭 없는 쿼리(예: "zzzznomatch") → 빈 결과 안내("'zzzznomatch'에 대한 검색 결과가 없습니다") 표시, 크래시 없음
- [ ] F9. 기능: q 없음(`/search` 직접 접근) → "검색어를 입력하세요" 안내, 크래시 없음
- [ ] F10. 가드: 오버레이에서 1자 입력 후 엔터 → 이동 안 함(또는 무시) — 최소 2자 가드 동작
- [ ] F11. 기능: 브랜드칩(SearchOverlay:126) 클릭 → `/search?q={brand}` 이동, 결과 표시, 오버레이 닫힘
- [x] F12. Tier2 validator → ✅ PASS/APPROVED(100/100, INTENT_PASS) — 7개 적대 지점 정합(스키마/의존성 무변경·ShopContent 미재사용·description 미검색·캐시 미사용·async searchParams·2자 가드 3중·Navbar 미변경).
- [x] F13. Tier2 oracle → ✅ 차단 이슈 없음(injection/XSS/정보노출 구조적 차단). M1(q 길이 상한 100자) 반영 + L1(브랜드칩 encode) 반영.
- [ ] F5~F11. 기능 수동검증(dev 서버 /search?q=) — by-construction(tsc/lint/test/build + searchProducts/SearchOverlay 단위테스트로 로직 검증). 실 UI 확인은 사용자 dev 실행 시.

---

## Test Strategy
- [ ] **tests-after** (Vitest + @testing-library/react + jsdom). 기존 `lib/products.test.ts` 패턴(`vi.hoisted` + `vi.mock("@/lib/prisma")` + `vi.mock("next/cache")` pass-through) 복제.
- [ ] Task 4: `searchProducts` 단위 — contains OR 쿼리 인자 구조·최소 2자 빈배열·toAppProduct 매핑·대소문자 무시 의도(mode:"insensitive" 인자 확인).
- [ ] Task 5: SearchOverlay 제출(엔터 → router.push 호출, 2자 미만 무시) + `/search` 페이지(검색어 유/무, 빈 결과) — 가능 범위. 페이지가 async server component라 직접 렌더 어려우면 searchProducts 호출 경로/안내 문구 로직 위주.

## Success Criteria
- [ ] SearchOverlay에서 2자+ 입력 후 엔터 또는 브랜드칩 클릭 → `/search?q=` 이동(검증: F5, F11).
- [ ] name/brand/category 부분일치(대소문자 무시) 상품이 ProductCard 그리드로 표시(검증: F6, F7).
- [ ] 빈 결과/쿼리 없음에 안내 표시, 크래시 없음(검증: F8, F9).
- [ ] 최소 2자 가드 동작(검증: F10).
- [ ] tsc/lint/test/build green(검증: F1~F4) + Tier2 적대검증 통과(검증: F12, F13).
- [ ] 스키마/의존성 무변경 — `git diff prisma/schema.prisma package.json` 빈 출력.

---

## Per-TODO 상세

### Task 1. `searchProducts` 헬퍼 추가 (lib/products.ts) `category:ultrabrain`
**Goal**: `lib/products.ts`에 `export async function searchProducts(q: string): Promise<Product[]>` 추가. `q.trim()` 길이 < 2면 DB 접근 없이 `[]` 반환. 그 외 `prisma.product.findMany`로 name/brand/category에 `contains` + `mode:"insensitive"` OR 조합 조회 후 `toAppProduct` 매핑. unstable_cache 미사용.
**References** (WHY):
- `lib/products.ts:106-110` (`getProductById`) — **unstable_cache 미사용 plain 헬퍼 선례**. searchProducts도 이 패턴(캐시 X)을 정확히 따른다.
- `lib/products.ts:50-71` (`toAppProduct`) — Prisma→앱 Product 변환 재사용. `hotIds` 인자 **미전달**(검색 결과엔 HOT 배지 불필요, isHot:false).
- `lib/products.ts:77-78` (`getCachedProductRows`) — `orderBy: { createdAt: "asc" }` 정렬 관례 차용(시드 순서).
- `lib/products.ts:13` — `prisma` import 방식.
- `prisma/schema.prisma:71-78` — name/brand/category 필드명 정확 확인(검색 대상 3필드).
**Must NOT do**:
- unstable_cache로 감싸기 금지(쿼리별 동적 — getProductById 선례 위반 금지).
- `description` 필드를 OR에 포함 금지(노이즈, 사용자 확정 제외).
- `toAppProduct`에 hotIds 전달 금지(검색 결과 HOT 배지 불필요).
- 2자 미만일 때 DB 쿼리 실행 금지(`[]` 즉시 반환 — 과대/공백 쿼리 풀스캔 방지).
- name 인덱스 추가/스키마 변경 금지.
**QA Scenarios** (agent-executable):
- Happy path: `searchProducts("denim")` → `where.OR`에 `[{name:{contains:"denim",mode:"insensitive"}},{brand:{contains:"denim",mode:"insensitive"}},{category:{contains:"denim",mode:"insensitive"}}]` 인자로 `findMany` 호출, 반환은 `toAppProduct` 매핑된 `Product[]`.
- Edge (최소 글자수): `searchProducts("a")` 및 `searchProducts(" ")` → `findMany` **미호출**, `[]` 반환.
- Edge (trim): `searchProducts("  denim  ")` → contains 값이 `"denim"`(trim 적용).
- Negative: `searchProducts("")` → `[]` 반환, 크래시 없음.

### Task 2. `/search` 결과 페이지 server component 생성 (app/search/page.tsx) `category:visual-engineering`
**Goal**: 신규 파일 `app/search/page.tsx` — async server component. `searchParams`를 **await**(Next 16)해 `q` 추출 → `searchProducts(q)` 호출 → ProductCard 그리드 렌더. q 없음/빈 결과 각각 안내. 다크 배경 + brand-neon 톤.
**References** (WHY):
- `app/shop/page.tsx:8-15` — server component 구조 참고(단, getAllProducts 아닌 searchProducts, revalidate 불필요 — 동적 쿼리).
- `app/shop/ShopContent.tsx:96` — 그리드 마크업 `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10` **복제**(통째 재사용 금지).
- `app/shop/ShopContent.tsx:88-100, 115-121` — 컨테이너(`max-w-7xl mx-auto px-4 py-8`)·제목·빈상태 마크업 톤 참고.
- `components/ui/ProductCard.tsx:13-109` — `<ProductCard product={p} />` 그대로 사용.
- Next 16: `export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> })` → `const { q } = await searchParams`.
**Must NOT do**:
- `ShopContent`를 import해 재사용 금지(category 필터바·Load More·useSearchParams 딸림 — 그리드 마크업만 복제).
- `searchParams`를 await 없이 동기 접근 금지(Next 16 런타임 에러).
- API 라우트/fetch 경유 금지(searchProducts 직접 호출).
- `"use client"` 추가 금지(server component 유지 — searchProducts는 server-only).
- `revalidate` export 금지(동적 쿼리 — 캐시 부적합).
**QA Scenarios** (agent-executable):
- Happy path: `/search?q=denim` → `searchProducts("denim")` 결과를 `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10` 그리드에 ProductCard로 렌더, 검색어/건수 제목 표시.
- Edge (q 없음): `/search`(쿼리 없음) → searchProducts 호출 없이 "검색어를 입력하세요" 안내, 빈 그리드, 크래시 없음.
- Edge (빈 결과): `/search?q=zzzznomatch` → "'zzzznomatch'에 대한 검색 결과가 없습니다" 안내.
- Negative: q에 공백/특수문자 → 크래시 없이 searchProducts 가드로 빈 결과 처리.

### Task 3. SearchOverlay 제출 핸들러 연결 (components/search/SearchOverlay.tsx) `category:visual-engineering`
**Goal**: SearchOverlay의 `<input>`(:73-82)을 `<form>`으로 감싸 엔터/제출 시 `router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)` + `onClose()`. `searchTerm.trim()` 길이 < 2면 제출 무시(이동 안 함). `useRouter` import 추가. 기존 글래스 톤·레이아웃 유지.
**References** (WHY):
- `components/search/SearchOverlay.tsx:22-84` — `searchTerm` state(:24)·input(:73-82) 위치. input을 `<form onSubmit>`으로 감싼다.
- `components/search/SearchOverlay.tsx:7` — `import Link from "next/link"` 인접에 `import { useRouter } from "next/navigation"` 추가.
- `components/search/SearchOverlay.tsx:124-131` — 브랜드칩 `<Link href={`/search?q=${brand}`} onClick={onClose}>` 패턴과 **일관**(같은 /search?q= 목적지·닫힘 동작). 단 칩은 brand가 영문 고정이라 encodeURIComponent 없이도 동작 — input 제출은 한글/공백 가능성 있어 encodeURIComponent 적용.
- `components/ui/Navbar.tsx` (isSearchOpen state) — 변경 불필요(검색 완결은 오버레이 내부).
**Must NOT do**:
- Navbar 변경 금지(검색 제출은 오버레이 내부에서 완결).
- 라이브 결과/debounce 추가 금지(엔터 제출만).
- `searchTerm` state 시그니처 변경 금지(기존 onChange:77 유지).
- 브랜드칩 Link(:124-131) 동작 변경 금지(이미 정상).
- 2자 미만 입력 시 빈 `/search?q=` 이동 금지(무시).
**QA Scenarios** (agent-executable):
- Happy path: input에 "denim" 입력 후 엔터 → `router.push("/search?q=denim")` 호출 + `onClose()` 호출.
- Edge (한글/공백): "  와이드 데님  " 입력 후 엔터 → `router.push("/search?q=" + encodeURIComponent("와이드 데님"))`(trim 후 encode).
- Edge (최소 글자수): "a" 입력 후 엔터 → push 미호출(이동 안 함).
- Negative: 빈 input 엔터 → push 미호출, 크래시 없음.

### Task 4. `searchProducts` 단위 테스트 (lib/products.test.ts) `category:ultrabrain`
**Goal**: `lib/products.test.ts`에 `describe("searchProducts")` 블록 추가. 기존 mock 인프라(`productFindMany`, `makePrismaRow`) 재사용. 쿼리 인자 구조·최소 글자수 가드·매핑·대소문자 의도 검증.
**References** (WHY):
- `lib/products.test.ts:1-23` — `vi.hoisted({productFindMany})` + `vi.mock("@/lib/prisma")` + `vi.mock("next/cache")` 인프라 재사용(추가 mock 불필요).
- `lib/products.test.ts:184-213` (`makePrismaRow`) — Prisma row fixture 헬퍼 재사용.
- `lib/products.test.ts:25` — import에 `searchProducts` 추가.
- `lib/products.test.ts:252-276` — findMany 인자 구조 검증 패턴(`productFindMany.mock.calls[0][0]`) 복제.
**Must NOT do**:
- 실 DB 접근 금지(prisma mock 필수).
- 새 mock 인프라 작성 금지(기존 vi.hoisted/vi.mock 재사용).
- searchProducts 구현을 테스트에 맞춰 변형 금지(테스트가 동작 검증, 역 금지).
**QA Scenarios** (agent-executable):
- Happy path: `searchProducts("denim")` → `productFindMany.mock.calls[0][0].where.OR`이 name/brand/category 3개 contains(`mode:"insensitive"`) 항목 포함, 길이 3.
- Edge (최소 글자수): `searchProducts("a")` → `productFindMany` **not.toHaveBeenCalled()**, 결과 `[]`.
- Edge (trim): `searchProducts("  denim ")` → contains 값 `"denim"`.
- 매핑: mock이 1개 row 반환 → 결과가 `toAppProduct` 형태(id/name/brand/category 채워짐, isHot:false).
- 실행: `npm run test lib/products.test.ts` → green.

### Task 5. SearchOverlay 제출 + /search 페이지 테스트 (가능 범위) `category:writing`
**Goal**: SearchOverlay 제출 동작 테스트(엔터 → push 호출, 2자 미만 무시). `/search` 페이지는 async server component라 직접 렌더가 까다로우면 searchProducts 호출 경로/안내 문구 분기 로직 위주로 가능 범위 검증.
**References** (WHY):
- `lib/products.test.ts` — Vitest 컨벤션(describe/it/expect, vi.mock) 참고.
- `components/search/SearchOverlay.tsx:22-140` — 테스트 대상 컴포넌트. `useRouter` mock 필요(`vi.mock("next/navigation")`).
- 기존 컴포넌트 테스트 선례 — `npx glob "**/*.test.tsx"` 또는 리뷰/Q&A 트랙 테스트 패턴 확인 후 일관 적용.
**Must NOT do**:
- 무리한 server component 렌더 강행 금지(불가하면 로직/안내 문구 단위로 분리 검증, 또는 F5~F11 수동검증으로 대체 명시).
- 실 라우팅/실 DB 금지(router·prisma mock).
**QA Scenarios** (agent-executable):
- Happy path: SearchOverlay 렌더(isOpen=true) → input에 "denim" 입력 → form submit → mock router.push가 `/search?q=denim`로 호출됨.
- Edge: "a" 입력 후 submit → router.push 미호출.
- 페이지(가능 시): `q=""` 분기 → 안내 문구 "검색어를 입력하세요" 렌더; `q`로 빈 결과 → "검색 결과가 없습니다" 렌더.
- 실행: `npm run test` → green(불가 항목은 skip 사유 주석 + F-wave 수동검증 위임).
