# 전체 고객 상품 화면 갱신·For You 확장 계획

## 요약
- 목표: 기존 관리자 상품 변경을 모든 실제 고객 상품 소비 화면에 주기적으로 반영하고, For You의 감상 위치와 각 화면의 입력 상태를 유지한다.
- 분량 예상: 전체 소비 화면과 안전 갱신·상세 초안 보호로 확장하여 코드/테스트/증거 약 28~36개 파일, 난이도 중간 이상, 복잡도 medium-high. 대량 pagination은 제외.
- 2026-10-19 사용자 구현·테스트 승인 및 '전체에 반영' 요청으로 실행 범위를 확장했다. 운영 상품 생성·DB 변경·설정 변경·commit·push·배포는 이번 범위가 아니다.
- 사용 스킬: planing-prometheustic. 읽기 전용 코드 조사와 Metis gap 검토 반영.
- 2026-10-20 후속 승인: 미완료 모바일/Try-On QA를 마무리하고 발견한 최소 UI 결함을 검증 수리한다. 이 실행 리드는 운영 데이터/설정·git stage/commit/push/배포를 변경하지 않으며, 최종 QA gate 뒤 부모의 별도 release 작업으로 인계한다.

## 현재 상태와 중복 방지
- `app/api/admin/products/route.ts`: 등록 후 products 태그 무효화가 이미 있다.
- `app/api/admin/catalog/[id]/route.ts`: 수정·판매 중지 후 같은 태그를 무효화한다.
- `lib/products.ts`: 활성 상품만 캐시 조회하며 현재 공통 순서는 createdAt ASC다.
- `app/for-you/page.tsx`: 같은 getAllProducts를 사용한다. 새 상품용 별도 DB/등록 기능은 필요 없다.
- `app/for-you/ForYouContent.tsx`: 열린 화면은 서버 products prop을 유지하며 자동 재조회가 없다.
- `app/api/admin/inventory-adjustments/route.ts`: 재고 조정 후 상품 캐시 무효화가 빠져 있다.
- `app/for-you/discovery-feed.ts`: 전체 상품 기반 브랜드 후보와 6상품 간격 카드를 만든다.

## 전체 범위 조사와 화면별 계약

| 실제 소비 경로 | 현재 데이터/동작 | 이번 반영·보존 기준 |
| --- | --- | --- |
| `/` | getAllProducts, ProductGrid | 갱신된 상품 정보, 기존 섹션/선택/스크롤 유지 |
| `/shop` | getAllProducts, category/visibleCount 로컬 state | 기존 ASC 순서·카테고리·더 보기 개수 유지 |
| `/brands` | getAllProducts + mock 에디토리얼 | 실제 상품 grid만 갱신, mock 소개를 실DB 브랜드처럼 확장하지 않음 |
| `/ranking` | getAllProducts → price DESC | 기존 가격 기준 유지, 판매 순위라고 주장하지 않음 |
| `/for-you` | getAllProducts → 전용 최신순 변경 | 열린 세션 순서/사진/브랜드/End 계약은 아래 작업 3–4 준수 |
| `/liked` | getAllProducts + wishlist store | 새 metadata만 갱신, 찜/스토어 초기화·write 없음 |
| `/search?q=...` | searchProducts 동적 SQL | query URL 그대로 refresh, query/filter/입력 변경 없음 |
| `/product/[id]` | getProductById 단건 | 가격/재고/설명 갱신, 수량·색상·사이즈 초안 유지. 제거된 옵션을 자동 선택하지 않고 구매 차단 |
| `/try-on` | getAllProducts + 업로드/선택/생성 localstate | 업로드·결과·선택 보존, 생성 중 refresh 일시 보류, 삭제된 상품은 다음 생성 차단 |
| `/what-to-wear` | getAllProducts는 글쓰기 상품 tag용 | 피드 탭·caption·파일·tag 초안 보존. 등록 폼이 열린 동안 refresh 보류 |
| `/category` | 정적 분류/이미지와 Shop 링크, 상품 DB 미소비 | 새 동기화 기능을 중복 추가하지 않음. 이동한 Shop에서 갱신 |

### 공통 안전 경계

- Root에 공통 갱신 컴포넌트 한 곳만 두고 위 실제 상품 소비 route를 명시 allowlist로 처리한다. admin/auth/onboarding/settings/checkout/마이포스트/기타 route에는 자동 refresh를 실행하지 않는다.
- visible+online 상태에서 60초 간격, visible/online 복귀도 같은 throttle을 적용한다. 최초 mount 중복 요청 없음, 겹치는 transition 없음, 하나의 timer와 cleanup. URL·컴포넌트 key·Provider·상태를 교체하지 않는다.
- 열린 입력 form, OOTD 작성 모달, 생성 중 Try-On, 열린 장바구니 등 보호된 편집/작업 표식이 있으면 해당 refresh를 보류한다. 안전해진 뒤 다음 정상 주기에 시도한다. 입력을 저장하거나 초기화하지 않는다.
- 상세 preferred-size effect는 현재 `[sessionStatus, sizes]`로 refresh마다 다시 실행되어 사용자 선택을 덮을 위험이 있다. 사용자 선택 우선 및 계정/상품별 초기 한 번 적용으로 고정하고 독립 회귀 테스트를 추가한다.
- 선택한 옵션이 상품에서 제거되면 자동으로 다른 옵션을 선택하거나 수량을 줄이지 않는다. 현재 draft를 보존하되 명시적인 구매 불가 상태로 차단하고 재선택을 요구한다. 현재 재고보다 많은 수량도 기존 검증으로 차단한다.
- Cart/StoreSync/Zustand는 로그인 시 읽은 **장바구니 snapshot**이다. 이번 주기적 상품 refresh가 items·quantity·옵션·가격 snapshot을 덮어쓰거나 서버 PUT을 발생시키지 않는다. 상품 상세/목록은 최신 metadata, 장바구니 snapshot은 최종 주문 서버 재계산이 권위다. 장바구니 실시간 재견적은 별도 후속이다.
- Q&A/리뷰/글쓰기 입력은 열린 form 동안 refresh를 보류한다. Try-On 유료 AI 호출이나 주문을 검증으로 실행하지 않는다.
- 새 공개 API·Realtime·전역 DB 구독·강제 reload는 추가하지 않는다. 임의 props key 변경으로 전체 client UI를 remount하지 않는다.
- 각 갱신 시도는 기존 `/api/health`의 no-store DB 상태 조회를 먼저 확인한다(최대 1회/60초, 10초 timeout, unmount abort). network/503/잘못된 상태 응답이면 현재 화면을 두고 다음 주기에 재시도한다. 성공 직후 실제 RSC 렌더 사이 장애 race나 프레임워크 error boundary까지 완전히 보장하지는 않는다.
- 상세에서 사용자가 직접 사이즈·색상·수량을 바꾸면 해당 구매 초안이 있는 동안 주기 갱신을 보류한다. 초기 저장 선호 사이즈 자동 적용만으로는 보류하지 않는다. 따라서 모든 페이지가 무조건 60초마다 바뀐다고 약속하지 않는다.

## 확정할 기본 동작
1. 새 진입/브라우저 새로고침: For You만 최신 등록순(createdAt DESC, id DESC). 기존 Shop 순서는 유지한다.
2. 같은 상품 ID가 남아 있으면 기존 사진·위치 복원은 유지한다. 처음 보는 방문자만 맨 앞 신상품부터 시작한다.
3. 열린 탭: 공통 allowlist 상품 화면에서 visible·online으로 60초 간격 router.refresh. 화면 복귀·online 복귀도 같은 60초 throttle을 적용한다.
4. 첫 mount의 중복 refresh 금지. 단일 timer, unmount 정리, hidden/offline 중단, 겹치는 refresh 방지.
5. 즉시 push형 실시간이 아니라 주기적 자동 갱신이다. 정상 요청 완료 후 반영하며 네트워크 장애에는 보장하지 않는다.
6. 열린 피드의 기존 상품 순서는 유지하고 신규 상품만 뒤에 추가한다. 일반/몰입 모두 같은 세션 순서를 사용한다.
7. 기존 상품 정보는 ID 기준 교체하고 비활성/삭제 상품은 제거한다. 품절 상품은 기존처럼 품절 표시한다.
8. 현재 상품이 사라지면 기존 순서의 다음 상품 → 이전 상품 → 빈 상태 순서로 이동한다.
9. 카테고리를 바꾸면 최신 catalog로 새 순서를 만들고 첫 항목에서 시작한다. 언어·dismiss 설정은 유지한다.
10. 갱신 실패 시 기존 화면 유지, 다음 정상 주기에 재시도한다. 강제 reload·로그인 이동은 없다.
11. End에서 신규 상품이 오면 자동으로 넘기지 않고 ‘새 상품 이어보기’ 버튼을 활성화한다.
12. 현재 상품/사진/스크롤을 유지한다. 새 상품 등장 때문에 보고 있던 카드가 튀거나 이동하면 실패다.

## 상품 수를 늘리는 운영 방법
- 기존 관리자 상품 등록 화면을 그대로 사용한다. 별도 For You 등록은 하지 않는다.
- 1차 운영 목표로 실제 상품 30~50개를 권장하되 개발 완료 조건으로 강제하지 않는다.
- 상품명·브랜드·카테고리·실제 가격·권한 있는 이미지·한/영 설명·옵션별 재고를 준비한다.
- 비슷한 상품만 늘리기보다 카테고리와 브랜드를 분산한다. 브랜드 카드에는 같은 브랜드 실제 상품 2개 이상이 필요하다.
- 상품 수 증가와 자동 반영 개발은 별개다. 테스트 상품을 실제 상품처럼 공개하거나 복제해 수를 부풀리지 않는다.
- CSV 대량 등록, 외부 상품 수집, AI 상품 생성, 자동 번역은 이번 범위에서 제외한다.

## 구현 작업 (기능+테스트를 함께 수행)
- [x] 1. For You 전용 최신순 read contract
  - 참조: lib/products.ts, app/for-you/page.tsx, prisma/schema.prisma의 Product.createdAt/id.
  - 기존 mapper와 products 캐시를 재사용하고 For You에만 최신순을 적용한다. 다른 소비 페이지 순서는 바꾸지 않는다.
  - 공통 Product DTO에 createdAt이 없으므로 문자열 ID/NEW 배지로 정렬하지 않는다. 서버 raw rows 경계에서 정렬한다.
  - 완료/QA: 동일 createdAt tie-break, 비활성 제외, 새 등록 노출, Shop 기존 정렬 불변을 RED→GREEN 검증.

- [x] 2. 상품 변경 캐시 정합성
  - 참조: 관리자 create/catalog/inventory-adjustments 라우트와 기존 route tests.
  - 성공한 재고 조정 이후에만 products 태그 무효화를 추가한다. 등록/수정 경로는 중복 구현하지 않는다.
  - 설치된 Next 문서 기준 즉시 만료 계약을 명시한 `{ expire: 0 }`를 해당 products 변경 경로에 적용하고 기존 `{}` 테스트를 갱신한다.
  - 완료/QA: 성공 후 무효화, 실패·권한 거부 시 호출 0회, 다음 조회의 실제 재고 상태 검증.

- [x] 3. 갱신 주기와 세션 catalog 병합
  - 참조: ForYouContent.tsx, discovery-state.ts/tests, lib/i18n/feed-messages.ts.
  - timer/visibility lifecycle과 ID 기반 순서 병합을 작은 hook·순수 함수로 분리한다. 새 공개 API나 Supabase Realtime은 추가하지 않는다.
  - router.refresh는 서버 캐시를 무효화하지 않으므로 작업 2와 함께 검증한다. 전체 reload는 금지한다.
  - 새로고침은 최신순 재구성+기존 anchor 복원, 주기적 refresh는 현재 순서 유지라는 차이를 명시적으로 테스트한다.
  - 완료/QA: fake timer로 hidden/offline/focus/throttle/unmount 중복요청 방지, 동일 ID 중복 0, 실패 후 기존 목록 유지.
  - 확장: 공통 refresher route allowlist와 편집/생성/장바구니 일시 보류, 상세 preferred-size 초기화 가드, ProductPurchaseActions stale 옵션 구매 차단을 함께 구현한다.

- [x] 4. 브랜드·위치·End 상태 안정화
  - 참조: discovery-feed.ts/tests, ImmersiveFeed.tsx, BrandFeed.test.tsx, discovery-state.ts.
  - 살아 있는 기존 브랜드 카드의 ID·상품 뒤 anchor를 고정한다. 대표상품 데이터는 갱신하되 자격을 잃으면 제거하고 같은 slot에 다른 브랜드를 즉시 채우지 않는다.
  - 새 브랜드 카드는 새로 추가된 구간의 미사용 6상품 경계에만 삽입한다. 이미 사용한 브랜드는 같은 카테고리의 연속 피드 sequence당 한 번만 보여준다. 카테고리 전환은 새 sequence라 사용 이력을 초기화하지만 dismissedBrands는 전 카테고리에서 유지한다.
  - 현재 브랜드 제거 시 다음 상품 → 이전 상품 fallback을 적용한다. feedId/productId/사진 상태를 함께 정합 처리한다.
  - 일반 보기 IntersectionObserver는 추가된 카드도 관찰하며 삭제된 노드를 정리한다.
  - 완료/QA: 현재 상품·브랜드/사진 보존, dismiss 보존, 카테고리 전환, 현재 상품 삭제, End에서 이어보기, 격자 새 카드 위치 기억 검증.

- [x] 5. 실제 등록 왕복 검증
  - 로컬 테스트 전용 관리자 계정·명시적 disposable 상품으로만 create→공개 조회→열린 피드 반영→수정→재고 조정→비활성을 검증한다.
  - 데스크톱/모바일 각각 기존 위치 유지와 신규 상품 도달을 확인한다. 테스트 항목·계정은 실행 전 식별하고 테스트 종료 시 원상정리한다.
  - 운영 DB에 테스트 상품을 등록하지 않는다. 실제 상품 콘텐츠는 사용자 제공 전까지 생성하지 않는다.
  - 완료/QA: 정상 환경의 다음 갱신 주기에 반영, console error 0, EN/KO 안내, 실패 네트워크에서도 기존 피드 유지.
  - 전체 화면 QA: 홈/Shop/Ranking/Brands/검색/상세/찜/Try-On tag/글쓰기 소비 경로를 구분해 확인하고, Shop filter·검색 q·상세 선택/수량·Try-On 업로드·글쓰기 draft·장바구니 items/수량이 보존되는지 검증한다. `/category`는 정적 경로라는 사실을 별도 기록한다.
  - 실제 로컬 검증 경계: admin POST의 이미지 업로드는 실제 외부 Supabase Storage 쓰기이므로 이번 금지 경계에 따라 실행하지 않는다. 같은 createProduct helper로 로컬 disposable 상품 하나만 생성하고 기존 이미지 URL을 재사용한다. 기존 정상 admin 세션의 로컬 편집/재고 UI로 해당 fixture만 수정하여 실제 API·캐시 만료·다음 주기 반영을 검증한다. POST 인증/업로드/성공 invalidation은 route tests와 구분한다. 새 사용자/admin 승격/allowlist 변경은 하지 않는다.
  - 정리: fixture를 먼저 관리자에서 비활성화하여 products 캐시에서 제외한 뒤 정확 ID/name/brand guard로 로컬 DB에서 fixture와 cascade QA 재고 이력만 삭제한다. 기존 상품 9개 metadata hash(viewCount/updatedAt의 정상 조회 변동 제외)를 전후 비교하며 운영 DB·외부 Storage·기존 상품 metadata는 수정하지 않는다.

## 검증·실행 순서
- 의존: 1·2 → 3 → 4 → 5. 범위가 작으므로 과도한 병렬 수정은 하지 않는다.
- 기존 Vitest TDD 유지. focused → 전체 tests → TypeScript → lint → production build → 실제 브라우저 순서.
- 검증 기록은 evidence/for-you-catalog-refresh/에 작성하고 비밀값·실제 개인정보는 기록하지 않는다.
- 최종 검토: 요구 충족, 코드 품질, 실제 QA, 범위/보안 확인. 모든 실패를 처리한 뒤 완료 보고한다.
- commit/push/운영 배포는 구현 완료 후 별도 사용자 승인에 따른다.

## 후속 확장 (이번 구현에 포함하지 않음)
- 최종 자동 검증: 2026-10-20 모바일 CTA 최소 수리 포함 전체825 PASS / 14 guarded skip, TypeScript PASS, 전체 프로젝트 소스 ESLint 오류0/기존 경고3, fresh production build62/62 routes exit0·DB오류0. 로컬 fixture 생성·실제 관리자 수정/품절/비활성·열린 For You/Shop/검색 반영·상세 초안 보호를 확인하고 fixture/이력을 정리했다. 오늘도 원래9개 metadata hash 동일.
- 2026-10-20 실제 모바일 갱신 추가 PASS: 상품/브랜드 anchor와 End opt-in, Try-On 실제 local PNG·카테고리·선택 상품 보존을 실제60초 갱신으로 확인했다. 생성중 보류/종료후 재개는 wire interception한 fake HTTP sandbox와 사전 설치 clock으로 검증했으며 실제 유료 생성과 구분한다. CTA 클릭 차단 RED→GREEN 및 모바일/desktop 정상 클릭도 확인했다.
- 남은 제한: what-to-wear 작성 중 live 상품 변경 왕복, 실제 유료 AI 결과·physical Safari·인증된 찜의 전체32개 조합은 미실행이다. 모든 desktop/mobile 시나리오 PASS라는 의미가 아니며 `evidence/for-you-catalog-refresh/qa.md`의 실행/제한 구분을 따른다.
- 응답 크기·DOM·메모리·스크롤 성능을 측정한 뒤 cursor pagination/화면 가상화/다음 묶음 prefetch를 별도 계획한다.
- 페이지네이션 도입 시 브랜드 후보를 한 페이지 안에서만 계산하지 않도록 전체 자격·중복 방지 계약을 다시 설계한다.
- 지금 상품이 적은 문제를 무한 반복으로 감추지 않는다. 끝 상태와 일반 보기 전환은 유지한다.

## 근거 문서
- node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md
- node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md
- Next 설치 버전의 문서 확인: revalidateTag는 다음 서버 요청의 데이터 갱신이며, router.refresh는 서버 캐시 자체를 무효화하지 않는다.
