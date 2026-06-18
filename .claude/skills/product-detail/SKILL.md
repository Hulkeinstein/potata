---
name: product-detail
description: potata 상품 상세 페이지 자동 구현 스킬. 자유 텍스트/마크다운 상품 정보를 파싱해 prisma/seed.ts에 추가/갱신하고 DB upsert → 검증까지 수행한다. Use PROACTIVELY when: "상품 상세", "상세 페이지", "상품 등록", "product detail", "이 상품 올려줘".
allowed-tools: Read, Edit, Bash, Glob, Grep
user-invocable: true
---

# /product-detail — 상품 상세 페이지 자동 구현

자유 텍스트/마크다운 상품 상세 정보를 받아, **기존 상세 페이지 템플릿을 재사용**하면서 DB에 콘텐츠를 주입해 상세 페이지를 자동 구현한다. 새 컴포넌트·스키마 변경 없음.

## 동작 원리 (왜 이렇게 하나)

potata는 상세 페이지 템플릿([components/product/ProductDetailClient.tsx])과 DB 파이프라인([app/product/[id]/page.tsx] → [lib/products.ts] `getProductById` → ISR)이 **이미 완성**되어 있다. 즉 **DB `Product` 행만 채우면 `/product/[id]` 상세 페이지가 자동으로 렌더**된다.

따라서 이 스킬의 일은 "코드를 짜는 것"이 아니라 **상세 정보를 Product 데이터로 구조화해 DB에 주입**하는 것이다. 재현성·버전관리를 위해 직접 DB write 대신 **[prisma/seed.ts]의 `PRODUCTS` 배열을 SSoT로 보고 항목을 추가/갱신한 뒤 `npx prisma db seed`(idempotent upsert)로 DB에 반영**한다. seed.ts가 진실의 원천, DB는 파생물 — DB 리셋/재시드해도 콘텐츠가 보존된다.

## 입력

상품 상세 정보를 **자유 텍스트 또는 마크다운**으로 받는다. 형식 강제 없음 — 아래 필드를 본문에서 최대한 추출한다.

| Product 필드 | 타입 | 필수 | 추출 규칙 / 기본값 |
|---|---|---|---|
| `id` | String | 자동 | **미지정**: seed.ts PRODUCTS의 최대 숫자 id + 1을 **문자열**로 설정(예: 기존 최대 "8" → "9"). **지정**: 그 id로 upsert(기존이면 갱신). |
| `name` | String | ✅ | 상품명 |
| `brand` | String | ✅ | 브랜드명 |
| `price` | Int (AED) | ✅ | 판매가. 숫자만(통화기호·콤마 제거). |
| `originalPrice` | Int? | — | 정가. 없으면 `undefined`. |
| `discountRate` | Int? | — | 할인율(%). originalPrice·price로 계산 가능하면 산출, 아니면 `undefined`. |
| `imageUrl` | String | ✅ | 대표(썸네일) 이미지 URL = 제공된 첫 이미지. |
| `images` | String[] | — | 갤러리·상세탭용 전체 이미지 URL 배열. 하나만 주면 `[그것]`. 없으면 `[imageUrl]`. |
| `category` | String | ✅ | **반드시** `Outer`/`Top`/`Bottom`/`Dress`/`Acc`/`Shoes` 중 하나로 정규화. ('All' 저장 금지 — 필터 전용값) |
| `description` | String? | — | 상세 설명 문단. detail 탭에 렌더됨. |
| `sizes` | String[] | — | 예: `["S","M","L"]`, `["Free"]`, `["230","240"]`. 없으면 `[]`(템플릿이 "Free" fallback). |
| `colors` | String[] | — | 예: `["Black","White"]`. 없으면 `[]`(템플릿이 "Default" fallback). |
| `rating` | Float? | — | 평점(0~5). 없으면 `undefined`. |
| `reviewCount` | Int? | — | 리뷰 수. 없으면 `undefined`. |
| `isNew`/`isBest`/`isHot` | Boolean | — | 배지. 명시 없으면 `false`. |

## 절차 (plan → 실행 → 검증)

### Step 0 — 사전 확인
- `git branch --show-current`가 `main`이면 **중단하고 feature branch 생성**(`feat/...` 또는 `feat/product-<id>`). main 직접 commit 금지(hook 차단).
- [prisma/seed.ts]를 읽어 현재 `PRODUCTS` 항목과 id들을 파악한다.

### Step 1 — Plan (구조화 + 가정 명시)
1. **필수값(`name`,`brand`,`price`,`imageUrl`,`category`) 누락 여부를 먼저 확인**한다. 하나라도 없으면 즉시 해당 항목만 사용자에게 질문하고 나머지는 진행하지 않는다.
2. 입력을 파싱해 위 표대로 **Product 필드 매핑표**를 만든다.
3. `id`를 결정한다(미지정 → 기존 최대 숫자 id + 1을 문자열로, 예: "9").
4. `category`를 6종 중 하나로 정규화한다(모호하면 가장 가까운 값 + **가정 명시**).
5. 이미지: 제공 URL들 → `imageUrl`(첫째) + `images[]`(전체).
6. 추측·기본값으로 채운 항목을 **한 줄씩 가정으로 표기**한다(예: "rating 미제공 → undefined", "category=Top으로 추정").

### Step 2 — Execute (DB 콘텐츠 주입)
1. [prisma/seed.ts]의 `PRODUCTS` 배열에 항목을 **추가**(신규 id)하거나 **수정**(기존 id)한다. 기존 객체 리터럴 스타일(필드 순서·`undefined` 사용)을 그대로 따른다. (로그의 상품 수는 `PRODUCTS.length`로 자동 산출되므로 별도 갱신 불필요.)
2. `npx prisma generate`는 schema.prisma를 변경하지 않으므로 **실행하지 않는다**.
3. `npx prisma db seed`로 upsert 실행. (전체 재upsert이나 idempotent — 안전)
   - DB 미접속/`DATABASE_URL` 부재로 실패하면 **중단하고 보고**한다. seed.ts 변경은 유지되므로 추후 `npx prisma db seed`로 반영 가능.

### Step 3 — Verify (검증)
1. `npx tsc --noEmit` — seed.ts 편집이 타입 안전한지 확인.
2. 주입한 상품을 **DB에서 재조회**해 실제 저장됐는지 확인. 검증 헬퍼([prisma/check-product.ts])를 사용한다:
   ```bash
   node --env-file=.env --import tsx prisma/check-product.ts <id>
   ```
   - exit 0 + 상품 JSON 출력 → 성공. `NOT FOUND`/exit 1 → seed가 반영 안 됨(Step 2 재확인).
   - **주의**: `npx tsx -e "...getProductById..."` 같은 인라인 호출은 쓰지 말 것 — `@/` alias 미해석·`.env` 미로드·pooled 연결 prepared-statement 충돌로 실패한다. 반드시 위 헬퍼로 조회한다.
   - `--env-file` 플래그는 Node.js 20.6+ 필수. `node --version`이 20.6 미만이면 `dotenv` 대안을 사용해야 하나, potata의 Node 환경은 20.6+로 가정한다.
3. 사용자에게 **`/product/<id>`** 경로를 보고하고, 로컬 확인 방법(`npm run dev` 후 방문)을 안내한다.
4. (선택) 페이지 빌드까지 확인하려면 `npm run build` — ISR `generateStaticParams`가 새 id를 포함하는지 본다. 무거우므로 기본은 생략.

### Step 4 — 보고
- 추가/갱신한 상품(id·name·category), 채운 가정 목록, 검증 결과, 상세 URL을 요약 보고한다.
- 커밋/PR은 repo Git 정책(`feat/...` 브랜치 → Conventional Commits → Squash merge)을 따른다. 커밋·push는 **사용자 요청 시에만**.

## 가드레일 (반드시 준수)

- **스키마 변경 금지**: `prisma/schema.prisma`를 건드리지 않는다. 입력에 기존 필드로 담을 수 없는 정보가 있으면 → 그 정보는 `description`에 녹이거나, 스키마 확장이 필요함을 **사용자에게 알리고 Ask-First**(임의 변경 금지).
- **새 컴포넌트/페이지 생성 금지**: `ProductDetailClient`·`page.tsx`를 재사용한다. 상품별 커스텀 컴포넌트를 만들지 않는다.
- **`data/dummy.ts` 의존 금지**: 상품 데이터는 DB(seed.ts) 경유. dummy.ts에 상품 추가 금지.
- **`category`는 6종만**: 입력 표 참조. `All` 저장 금지.
- **main 직접 commit 금지**: 항상 feature branch.
- **외과적 변경**: seed.ts에서 대상 항목만 추가/수정. 기존 8개 항목·포맷·주석을 건드리지 않는다.
- **`.env*` commit 금지**.

## 완료 기준 (Definition of Done)

- [ ] seed.ts `PRODUCTS`에 항목 추가/갱신됨(외과적, 스타일 일치)
- [ ] `npx prisma db seed` 성공
- [ ] `npx tsc --noEmit` 통과
- [ ] DB 재조회로 상품 확인됨
- [ ] `/product/<id>` 경로 보고 + 가정 목록 제시
