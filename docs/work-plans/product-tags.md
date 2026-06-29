# Work Plan: 상품 태그(tags) — admin 칩 입력 + 검색 한글화 + 상세 표시

## Overview
- **Objective**: admin 상품 등록 폼에서 태그를 칩(chip)으로 추가/삭제 → DB `Product.tags String[]` 저장 → 검색 부분매칭(`$queryRaw` UNNEST+ILIKE)으로 한글 태그 검색 가능 → 상품 상세에 읽기전용 칩 표시. 단일 PR.
- **Scope**:
  - **IN**: schema `tags` 컬럼 + `prisma db push`/`generate`, `types`(Product+CreateProductInput), `lib/products`(toAppProduct tags + createProduct tags + searchProducts `$queryRaw` 전환), admin route(`getAll` 파싱+상한+배선), AdminProductForm 칩 UI + FormData 다중 append, ProductDetailClient 표시, 테스트 2개(lib/products.test, admin route.test).
  - **OUT**: sizes/colors 칩화(콤마 input 유지), ProductCard 목록 태그 표시, `has` 정확매칭, `@@index` 추가(MVP), ProductTagPicker 로직 복제(시각 스타일만 참조), `revalidateTag` 시그니처 변경, `data/dummy.ts` 신규 의존.
- **Approach**: ADR-005의 `String[]` 필드 패턴(sizes/colors)을 tags로 수평 확장. Prisma `String[]`은 `contains` 부분매칭 미지원이라 검색은 `$queryRaw`(UNNEST+ILIKE) 택일 — 파라미터 바인딩(prepared statement)으로 injection 안전, LIKE 와일드카드(`%`/`_`/`\`)는 값에서 이스케이프. 입력은 칩(엔터/쉼표 add·x/backspace remove), 전송은 `tags.forEach(t=>fd.append("tags",t))` → `form.getAll("tags")`(sizes/colors의 콤마 split과 다른 경로 — 비대칭 silent-bug 주의).

## Context

### Project Context (from docs/)
- **Product Goal**: potata = 한국→UAE 패션 커머스. 카탈로그 가치 확장. 이번 = 검색 한글화 + 상품 메타데이터.
- **ADR Constraints Applied**: ADR-005(`String[]` 필드 패턴 — tags 동일 적용), ADR-008(상품 SSoT=DB, `dummy.ts` 의존 금지).
- **Aligned with Existing Plans**: `product-search.md`의 `searchProducts`를 부분매칭 raw로 전환(중복 아님 — 검색 능력 확장).

### Interview Summary (전부 사용자 승인 — 재인터뷰 없음)
- **태그 입력 방식**: 칩(chip) — 엔터/쉼표 keydown으로 칩 추가·input clear, x 클릭 개별 제거, 빈 input backspace로 마지막 칩 제거, 중복 방지. (sizes/colors 콤마 input과 의도적으로 다른 UX.)
- **검색 연결**: 부분매칭(`$queryRaw` UNNEST+ILIKE). 사용자가 `has` 정확매칭 대신 명시적으로 부분매칭 선택('데' → '데님' 매칭 목적).
- **표시 위치**: ProductDetailClient 상세에만 읽기전용 칩. ProductCard(목록) 제외.
- **스키마**: `Product.tags String[] @default([])` 추가. 비파괴 → `prisma db push`(migration 불필요).
- **상한**: 태그 최대 10개, 태그당 최대 20자(서버+클라 양쪽 가드). 빈 문자열·중복 제거.

### Research Findings (실측 — 코드 직접 확인)
- `lib/products.ts:50-71` toAppProduct — 단일 변환 함수. getProductById/getAllProducts/searchProducts 전부 경유 → `tags: p.tags` 한 줄로 전체 반영(누락 시 silent: DB저장 O 노출 X).
- `lib/products.ts:116-132` searchProducts — 현재 `prisma.product.findMany` OR 3필드. → `$queryRaw`로 전환. 가드 `if (term.length < 2 || term.length > 100) return []`(L119) 유지.
- `prisma/schema.prisma:69-100` Product — 컬럼 camelCase, `@map` 없음 → 테이블 `"Product"`·컬럼 `"createdAt"` 등 **쌍따옴표 quoting 필수**.
- `app/api/admin/products/route.ts:70-78` sizes/colors는 `String(form.get()).split(",")`. tags는 **다른 경로**: `form.getAll("tags")`.
- `components/admin/AdminProductForm.tsx:341-353` 컬러 input 블록 다음에 칩 블록 삽입. FormData append L126-129.
- `components/product/ProductDetailClient.tsx:133-183` Options 블록. 삽입 = Sizes 블록(L182) 닫힘 다음, Options `</div>`(L183) 다음.
- `lib/products.test.ts:215-291` searchProducts 테스트는 `findMany` OR 구조를 직접 단언 → `$queryRaw` 전환 시 **전부 깨짐 → 재작성 필수**. `makePrismaRow`(L184-213)·`makeCreateMock`(L32-57)에 tags 추가.
- `app/api/admin/products/route.test.ts:48-63` `adminPostReq`는 `Record<string,string>` 단일값만 → tags 다중 append 검증 위해 헬퍼 확장 필요.

### Metis Review
**Identified Gaps** (plan에 검증항목으로 반영):
- (1) toAppProduct 매핑 누락 위험 → **T6 DoD에 상세 칩 렌더 + T3 DoD에 toAppProduct tags 단언**으로 차단.
- (2) FormData 비대칭(getAll vs split) → **T4 DoD에 route.test 다중 append 검증** + T5 forEach append 명시.
- (3) LIKE 와일드카드(`%`/`_`/`\`) 이스케이프 누락 → **T3 DoD에 이스케이프 헬퍼 단위 검증** + 파라미터 바인딩 명시.

## Prerequisites
- [ ] 브랜치 `feat/product-tags` 체크아웃(생성됨).
- [ ] `.env.local`에 DB 연결 가능(`prisma db push` 실행용 — dev DB).
- [ ] `git diff prisma/schema.prisma` 빈 출력(작업 시작 시점 — 스키마 외 변경 없음 확인).

---

## TODOs

### Wave 1 — 데이터 계층 (스키마 → 타입 → 헬퍼, 선형 의존)

- [x] 1. schema `tags` 컬럼 추가 + `db push` + `generate` `category:quick`
  **Goal**: `prisma/schema.prisma` Product 모델에 `tags String[] @default([])` 추가 후 `prisma db push`로 dev DB에 컬럼 생성, `prisma generate`로 Prisma Client 타입에 `tags: string[]` 반영. `@@index` 추가 없음.
  **References** (WHY):
  - `prisma/schema.prisma:80-81` — `sizes String[] @default([])` / `colors String[] @default([])` 정렬 패턴을 그대로 복제(`colors` 바로 아래 L82에 추가).
  - `prisma/schema.prisma:97-99` — `@@index([category])` 등 기존 인덱스 — tags는 인덱스 **추가 안 함**(raw ILIKE는 인덱스 미사용, MVP).
  - CLAUDE.md "🟡 Ask First: Prisma schema 변경" — 이번 tags 컬럼 추가는 PROJECT_CONTEXT에서 사용자 승인됨.
  **Must NOT do**: `@@index([tags])` 추가 금지(MVP). migration 파일 생성 금지(`db push`만 — 비파괴 컬럼이라 migration 불필요). 다른 컬럼 순서/타입 건드리지 말 것(surgical).
  **QA Scenarios** (agent-executable):
  - Happy: `npx prisma generate` → exit 0, `node -e "const{PrismaClient}=require('@prisma/client');console.log('ok')"` 무에러. `grep -n "tags String\[\]" prisma/schema.prisma` → 1건.
  - Verify: `npx prisma db push` → exit 0, 출력에 `Product` 테이블 동기화 메시지(에러 없음). 비파괴 → 데이터 손실 경고 없음.
  - Negative: `git diff prisma/schema.prisma` → **추가된 줄이 `tags String[] @default([])` 단 1줄**(sizes/colors/index 무변경).

- [x] 2. types에 `tags` 필드 추가(Product + CreateProductInput) `category:quick`
  **Goal**: `types/index.ts`의 `Product` 인터페이스와 `CreateProductInput` 인터페이스에 각각 `tags?: string[]` 추가(둘 다 optional — 기존 데이터/입력 호환).
  **References** (WHY):
  - `types/index.ts:19-20` — `Product`의 `sizes?: string[]; colors?: string[];` 옆(L20 다음)에 `tags?: string[];` 추가.
  - `types/index.ts:193-194` — `CreateProductInput`의 `sizes?: string[]; colors?: string[];` 옆(L194 다음)에 `tags?: string[];` 추가.
  **Must NOT do**: `tags`를 required로 만들지 말 것(기존 8개 시드/상품에 tags 없음 → optional 필수). 다른 인터페이스(FilterOptions 등)에 tags 추가 금지(범위 외).
  **QA Scenarios**:
  - Happy: `grep -n "tags?: string\[\]" types/index.ts` → 정확히 2건(Product, CreateProductInput).
  - Verify: `npx tsc --noEmit` → exit 0(optional이라 기존 코드 무영향).
  - Negative: `grep -n "tags: string\[\]" types/index.ts`(non-optional) → 0건(required로 잘못 추가 안 됨).

- [x] 3. lib/products — toAppProduct tags + createProduct tags + searchProducts `$queryRaw` 전환 `category:ultrabrain`
  **Goal**: (a) `toAppProduct`에 `tags: p.tags` 추가 → 모든 소비처(상세/목록/검색)에 tags 노출. (b) `createProduct` create data에 `tags: input.tags ?? []` 추가. (c) `searchProducts`를 `prisma.$queryRaw<PrismaProduct[]>`로 전환 — name/brand/category ILIKE + `EXISTS(SELECT 1 FROM unnest(tags) t WHERE t ILIKE pattern)`. pattern은 LIKE 와일드카드 이스케이프 후 `%term%`. 가드(2~100자) 유지.
  **References** (WHY):
  - `lib/products.ts:60` — toAppProduct `colors: p.colors,` 다음 줄에 `tags: p.tags,` 추가. **이 한 줄 누락 = silent bug(DB저장 O, 노출 X)** — Metis gap (1).
  - `lib/products.ts:116-132` — searchProducts 현행 `findMany` OR 3필드 전체를 `$queryRaw`로 교체. `orderBy:{createdAt:"asc"}` → SQL `ORDER BY "createdAt" ASC`(컬럼 quoting 필수 — `@map` 없어 camelCase 그대로). 가드 `if (term.length < 2 || term.length > 100) return []`(L119) 유지.
  - `lib/products.ts:169` — createProduct `colors: input.colors ?? [],` 다음에 `tags: input.tags ?? [],` 추가.
  - `lib/products.ts:15` — `import type { Product as PrismaProduct } from "@prisma/client"` 이미 존재 → `$queryRaw<PrismaProduct[]>` 제네릭에 재사용.
  - Librarian: Prisma `String[]`은 `has`/`hasSome`만(정확) → 부분매칭은 `$queryRaw` UNNEST+ILIKE 택일. `$queryRaw` 파라미터 바인딩(`${pattern}`)=prepared statement → injection 안전. LIKE 와일드카드(`%`/`_`/`\`)는 **값에서** 이스케이프(`\\`로 escape + `ESCAPE '\'` 절). — Metis gap (3).
  **Must NOT do**: `has`/`hasSome` 정확매칭 사용 금지(부분매칭 확정). 문자열 보간으로 SQL 조립 금지(`$queryRawUnsafe` 금지 — `$queryRaw` 태그드 템플릿만). 정렬 컬럼을 따옴표 없이 `createdAt`으로 쓰지 말 것(quoting 필수). 가드 임계값(2/100) 변경 금지.
  **QA Scenarios**:
  - Happy(매핑): `grep -n "tags: p.tags" lib/products.ts` → 1건. `grep -n "tags: input.tags ?? \[\]" lib/products.ts` → 1건.
  - Happy(검색): `grep -n "\$queryRaw" lib/products.ts` → ≥1건, `grep -n "unnest(tags)" lib/products.ts` → 1건(대소문자 무관 ILIKE). `grep -n '"createdAt"' lib/products.ts` → ≥1건(quoting).
  - Edge(이스케이프): 와일드카드 이스케이프 헬퍼 존재 — `grep -n "ESCAPE" lib/products.ts` 또는 `replace(/[%_\\\\]/` 패턴 1건(`%`/`_`/`\` 이스케이프). `$queryRaw` 태그드 템플릿로 pattern 바인딩(문자열 보간 아님).
  - Negative: `grep -n "queryRawUnsafe" lib/products.ts` → 0건. `grep -n "has:" lib/products.ts` → 0건(정확매칭 미사용).
  - Verify: `npx tsc --noEmit` → exit 0(`$queryRaw<PrismaProduct[]>` 반환 타입이 `rows.map(toAppProduct)` 입력과 정합).

### Wave 2 — API 계층

- [x] 4. admin route — `getAll("tags")` 파싱 + 상한 가드 + CreateProductInput 배선 `category:ultrabrain`
  **Goal**: `app/api/admin/products/route.ts` POST에서 tags를 **`form.getAll("tags")`**(다중 append 경로 — sizes/colors의 `form.get().split(",")`과 다름)로 파싱: `.map(String).map(s=>s.trim()).filter(Boolean)` → 중복 제거 → 20자 초과 잘라냄(또는 거부) → 최대 10개 `slice(0,10)`. 파싱 결과를 `CreateProductInput.tags`에 배선.
  **References** (WHY):
  - `app/api/admin/products/route.ts:70-78` — sizes/colors의 `String(form.get("sizes")).split(",")` 패턴 **참조하되 복제 금지**. tags는 `form.getAll("tags")`(배열 반환) 경로. — Metis gap (2) 비대칭 핵심.
  - `app/api/admin/products/route.ts:188-202` — `CreateProductInput` 구성 객체(`sizes, colors,` L198-199 옆)에 `tags` 추가.
  - PROJECT_CONTEXT 상한: 서버측 가드 = 빈문자열 제거 + 중복 제거 + 각 20자 + 최대 10개(Zero Trust — 클라 가드 우회 방어).
  **Must NOT do**: tags를 `form.get("tags")`(단일값) + `split(",")`로 파싱 금지(칩 다중 append와 불일치 → 칩이 1개로 합쳐짐). 20자/10개 상한 생략 금지(서버가 정본). `revalidateTag("products", {})` 호출 시그니처(L207) 변경 금지(기존 무영향).
  **QA Scenarios**:
  - Happy: `grep -n 'getAll("tags")' app/api/admin/products/route.ts` → 1건. tags 파싱 후 `slice(0, 10)` 또는 길이 가드 존재.
  - Edge(상한): 11개 태그 전송 → 파싱 결과 10개로 절단(`slice(0,10)`). 21자 태그 → 20자 가드 적용(잘림 또는 필터).
  - Edge(중복/빈값): `["A","A",""," B "]` 전송 → `["A","B"]`(trim·중복제거·빈값제거).
  - Negative: `grep -n 'get("tags")' app/api/admin/products/route.ts` → 0건(`get` 단일값 경로 미사용, `getAll`만).
  - Verify: `npx tsc --noEmit` → exit 0(`tags: string[]`이 `CreateProductInput.tags?: string[]`와 정합).

### Wave 3 — UI 계층 (Task 2·4 의존)

- [x] 5. AdminProductForm — 칩 입력 UI + FormData 다중 append `category:visual-engineering`
  **Goal**: 컬러 input 블록 다음에 태그 칩 입력 블록 신규 추가. 상태 `const [tags, setTags] = useState<string[]>([])` + `const [tagInput, setTagInput] = useState("")`. keydown: 엔터/쉼표 → trim·중복·빈값·20자·10개 가드 통과 시 칩 추가 + input clear / 빈 input에서 backspace → 마지막 칩 제거. 각 칩에 x 버튼(개별 제거). 제출 시 `tags.forEach(t => fd.append("tags", t))`(다중 append). 다크 + `focus:border-brand-neon` 톤.
  **References** (WHY):
  - `components/admin/AdminProductForm.tsx:341-353` — 컬러 input 블록. **이 블록 다음**(L353 `</div>` 뒤, "추가 정보" 카드 내부)에 칩 블록 삽입.
  - `components/admin/AdminProductForm.tsx:126-129` — FormData append 영역. `if (colors.trim()) fd.append("colors", colors.trim());`(L129) 다음에 `tags.forEach(t => fd.append("tags", t));` 추가. — Metis gap (2): forEach 다중 append(JSON.stringify/join 금지).
  - `components/admin/AdminProductForm.tsx:58-61` — `const [sizes, setSizes] = useState("")` 등 선택 필드 상태 선언부 옆에 tags 상태 2개 추가.
  - 시각 참조(스타일만): ootd `ProductTagPicker`의 칩 톤 — **로직 복제 금지**(그건 사전정의 풀 toggle picker, 여기는 자유입력 칩).
  - `components/admin/AdminProductForm.tsx:181` — `focus:border-brand-neon transition-colors` input 톤 → 칩 input에 동일 적용.
  **Must NOT do**: sizes/colors를 칩으로 전환 금지(tags만 칩 — 둘은 콤마 input 유지). `tags` FormData를 `join(",")`/`JSON.stringify`로 전송 금지(forEach append만). ProductTagPicker import/로직 복제 금지. 칩 라이브러리(react-tag-input 등) 추가 금지(F6 — package.json 무변경).
  **QA Scenarios**:
  - Happy: `grep -n 'useState<string\[\]>(\[\])' components/admin/AdminProductForm.tsx` → tags 상태 1건. `grep -n 'fd.append("tags"' components/admin/AdminProductForm.tsx` → forEach 내 1건.
  - Edge(키보드): 엔터/쉼표 keydown 핸들러에서 `e.key === "Enter" || e.key === ","` 분기 + `e.preventDefault()`. backspace + 빈 input → 마지막 칩 pop.
  - Edge(가드): 중복 태그 추가 시도 → 무시(`tags.includes` 체크). 10개 초과/20자 초과 → 추가 안 됨.
  - Negative: `grep -n "ProductTagPicker" components/admin/AdminProductForm.tsx` → 0건. `grep -n 'join(",")' components/admin/AdminProductForm.tsx`(tags 관련) → 0건.
  - Verify: `npx tsc --noEmit` → exit 0. `npm run build` → exit 0(클라 컴포넌트 번들).

- [x] 6. ProductDetailClient — 읽기전용 태그 칩 표시 `category:visual-engineering`
  **Goal**: Options 블록(Colors/Sizes) 다음에 `product.tags?.length` 가드 후 읽기전용 태그 칩 렌더(`flex flex-wrap gap-2`, x 버튼 없음, brand-neon 톤). 태그 없으면 미표시.
  **References** (WHY):
  - `components/product/ProductDetailClient.tsx:182-183` — Sizes 블록 닫힘(L182) 다음, Options 래퍼 `</div>`(L183) **다음**에 태그 칩 블록 삽입(Selection Summary L185 앞).
  - `components/product/ProductDetailClient.tsx:136-156` — Colors 칩 스타일(`flex flex-wrap gap-2`, `px-4 py-2 rounded-full border`) 참조 → 읽기전용 버전(button 아닌 span, onClick 없음, x 없음).
  - 데이터 의존: `product.tags`는 T2 타입 + T3 toAppProduct 매핑으로 채워짐 — **T3 누락 시 여기서 빈 배열 → 미표시(silent)**. 이 task가 Metis gap (1)의 가시적 검증 지점.
  **Must NOT do**: 태그에 x/제거 버튼 추가 금지(읽기전용 — 상세는 조회 전용). 태그 클릭 핸들러(검색 이동 등) 추가 금지(범위 외). ProductCard에 동일 칩 복제 금지(OUT).
  **QA Scenarios**:
  - Happy: `grep -n "product.tags" components/product/ProductDetailClient.tsx` → ≥1건(`product.tags?.length` 가드 + map). `flex flex-wrap gap-2` 컨테이너 존재.
  - Edge(빈 태그): `product.tags`가 `[]`/`undefined` → 칩 영역 미렌더(`product.tags?.length` falsy 가드).
  - Negative: 태그 span에 `onClick`/`<button>`/`<X` 없음(읽기전용 — `grep -n "onClick" 칩 블록` → 0건).
  - Verify: `npx tsc --noEmit` → exit 0. `npm run build` → exit 0.

### Wave 4 — 테스트

- [x] 7. 테스트 — lib/products.test(`$queryRaw` mock 재작성 + createProduct tags) + admin route.test(`getAll` 다중 append) `category:ultrabrain`
  **Goal**: (a) `lib/products.test.ts`의 searchProducts 스위트를 `$queryRaw` mock 기반으로 재작성(현행 `findMany` OR 단언 폐기). (b) `makePrismaRow`·`makeCreateMock`에 `tags` 추가. (c) createProduct tags 기본값([])·전달값 보존 테스트. (d) `admin route.test.ts`의 `adminPostReq` 헬퍼를 다중값 지원으로 확장 → tags 다중 append → `getAll` 파싱·상한 검증.
  **References** (WHY):
  - `lib/products.test.ts:4-17` — `vi.hoisted` mock에 `$queryRaw` 추가(`prisma.$queryRaw` mock fn). 현행 `productFindMany`는 getAllProducts/getHotProductIds 테스트가 계속 사용하므로 유지.
  - `lib/products.test.ts:215-291` — searchProducts 스위트 **전체 재작성**: `findMany` OR 단언(L229-241·L269-273) → `$queryRaw` 호출 단언으로 교체. 가드 테스트(1자/빈문자/101자 → DB 미접근, L249-281)는 유지(임계값 동일).
  - `lib/products.test.ts:184-213` `makePrismaRow` + `:32-57` `makeCreateMock` — 반환 row에 `tags: []`(또는 overrides) 추가(PrismaProduct 형태 정합).
  - `app/api/admin/products/route.test.ts:48-63` `adminPostReq` — `Record<string,string>` → `Record<string, string | string[]>` 확장(배열이면 `for (const v of value) fd.append(k, v)`). tags 다중 append 검증용.
  - `app/api/admin/products/route.test.ts:225-243` — createProduct 호출 인자 단언 패턴 참조 → tags 배열 전달 단언 추가.
  **Must NOT do**: getAllProducts/getHotProductIds 기존 테스트(L293-411) 건드리지 말 것(findMany 경로 무변경 — surgical). 실 DB 접근 금지(`$queryRaw` mock). 가드 임계값 테스트(2/100) 변경 금지.
  **QA Scenarios**:
  - Happy: `npm run test lib/products.test` → exit 0, searchProducts 스위트 green(`$queryRaw` mock 호출 단언 통과).
  - Happy(tags): createProduct 테스트 — `tags` 미제공 → create data.tags `[]`, `tags:["a","b"]` 제공 → 보존. admin route.test — tags 3개 다중 append → `getAll` 파싱 후 createProduct에 `tags:["a","b","c"]` 전달 단언.
  - Edge(비대칭 회귀): admin route.test에 "tags 다중 append가 콤마로 합쳐지지 않는다" 케이스(3개 append → 길이 3, 콤마 split 시 깨질 시나리오 방어).
  - Negative: `grep -n "where.OR" lib/products.test.ts`(searchProducts 스위트 내) → 0건(findMany OR 단언 제거됨).
  - Verify: `npm run test` → exit 0(전 스위트 green — 기존 테스트 회귀 없음).

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | schema 컬럼이 모든 것의 기반(Prisma 타입 생성) |
| 2 | 1 | 앱 타입은 DB 컬럼 존재 후 정의(개념적 — 실제로는 독립이나 순서 고정) |
| 3 | 1, 2 | toAppProduct가 `p.tags`(Prisma 타입) + 앱 `tags` 타입 둘 다 참조 |
| 4 | 2, 3 | CreateProductInput.tags(T2) 배선 + createProduct(T3) 소비 |
| 5 | 2, 4 | 폼이 FormData로 route(T4) 경로에 tags 전송 |
| 6 | 2, 3 | 상세가 `product.tags`(T2 타입 + T3 매핑) 렌더 |
| 7 | 3, 4 | searchProducts(T3) + route 파싱(T4) 검증 |

---

## Parallel Execution Graph

```
Wave 1 (선형 — 데이터 계층):
  Task 1 (schema+push+generate) → Task 2 (types) → Task 3 (lib/products)

Wave 2:
  Task 4 (admin route)  [Task 3 후]

Wave 3 (병렬 — Task 2·4 후):
  ├── Task 5 (AdminProductForm 칩 UI)   [Task 4 후]
  └── Task 6 (ProductDetailClient 표시) [Task 2·3 후 — Task 4 불필요]

Wave 4:
  Task 7 (테스트)  [Task 3·4 후]

Critical Path: Task 1 → 2 → 3 → 4 → 5 → 7
```

> 단일 PR·패턴 복제형이라 전 task 선형에 가깝다. Task 6은 Task 5와 병렬 가능(서로 무관 — 폼 vs 상세).

---

## Category + Skills

| Task | Category | Category Reason | Skills Omitted (Why) |
|------|----------|----------------|----------------------|
| 1 | quick | schema 1줄 + 명령 2개, 로직 없음 | ultrabrain: 비파괴 컬럼 추가는 판단 불요 |
| 2 | quick | 인터페이스 2곳 1줄씩 추가 | - |
| 3 | ultrabrain | `$queryRaw` raw SQL + 와일드카드 이스케이프 + injection 안전 = 보안·정확성 판단 | quick: raw SQL은 단순 변경 아님 |
| 4 | ultrabrain | FormData 비대칭 경로 + 상한 가드 = 입력 검증(Zero Trust) | quick: 보안 경로라 정밀 필요 |
| 5 | visual-engineering | 칩 키보드 인터랙션 + 다크 brand-neon 톤 UI | ultrabrain: 비즈니스 로직 없음(UI 상태만) |
| 6 | visual-engineering | 읽기전용 칩 스타일링(상세 일관성) | - |
| 7 | ultrabrain | mock 재작성 + 비대칭 검증 설계 = 회귀 안전망 정밀 | writing: 테스트는 검증 로직이라 단순 문서 아님 |

---

## Final Verification Wave

- [x] F1. `npx tsc --noEmit` → exit 0, 에러 0건 (전 파일 타입 정합).
- [x] F2. `npm run lint` → exit 0, 경고/에러 0건.
- [x] F3. `npm run test` → exit 0, 전 스위트 green (특히 `lib/products.test`·`admin route.test` 재작성분).
- [x] F4. `npm run build` → exit 0 (Next 빌드 — `$queryRaw`·칩 컴포넌트 번들 무결).
- [x] F5. `git diff prisma/schema.prisma` → `tags String[] @default([])` 1줄만 추가됨(다른 컬럼 무변경 확인).
- [x] F6. `git diff package.json` → 빈 출력(의존성 무변경 — 칩 라이브러리 미도입).
- [x] F7. `grep -n "has:" lib/products.ts` → 0건(부분매칭 `$queryRaw` 사용, `has` 정확매칭 미사용 확인).
- [x] F8. `grep -rn "tags" components/product/ProductCard.tsx` → 0건(ProductCard 태그 표시 미추가 확인 — OUT 준수).
- [x] F9. Tier2 적대검증: validator-agent(plan↔결과 정합·비대칭 silent-bug 3개 차단 확인) + oracle-agent(`$queryRaw` injection·와일드카드 이스케이프·정렬 컬럼 quoting 적대 분석).

---

## Test Strategy
- **방식**: tests-after (Vitest + jsdom). 데이터/API 계층 완성 후 회귀 안전망 재작성.
- **재작성 필수**: `lib/products.test.ts`의 searchProducts 스위트(L215-291) — `findMany` OR 구조 단언이 `$queryRaw` 전환으로 전부 깨지므로 `$queryRaw` mock 기반으로 교체.
- **신규 검증**: createProduct tags 기본값([]) + 전달값 보존, admin route `getAll` 다중 append → tags 배열 파싱·상한 적용.
- **UI 컴포넌트(T5/T6)는 단위 테스트 OUT** — 칩 인터랙션은 F4 빌드 + 수동 확인으로 갈음(인터뷰 범위: 테스트 2개 = lib/products + admin route).

## Success Criteria
- [ ] admin 폼에서 태그 칩 추가(엔터/쉼표)·삭제(x/backspace)·중복차단·10개 상한 동작.
- [ ] 등록 시 DB `Product.tags`에 칩 배열 저장(콤마로 합쳐지지 않음 — 다중 append 정상).
- [ ] 검색창에 '데' 입력 → 태그 '데님' 보유 상품이 결과에 포함(부분매칭).
- [ ] 검색에 `%`/`_` 입력 시 와일드카드로 해석되지 않음(이스케이프 — 전체 매칭 안 됨).
- [ ] 상품 상세에 태그 칩(읽기전용, x 없음) 표시. 태그 없으면 미표시.
- [ ] ProductCard(목록)에는 태그 미표시.
- [x] F1~F9 전부 통과.
