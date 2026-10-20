# 전체 고객 카탈로그 갱신 검증

2026-10-19, 로컬 개발 환경. 사용자 승인에 따라 For You 전용 계획을 실제 상품 소비 10개 route로 확장했다. `/category`는 상품 DB를 읽지 않는 정적 분류/Shop 링크이므로 중복 갱신을 만들지 않았다.

## 구현과 안전 경계

- 홈/Shop/Brands/Ranking/For You/Liked/검색/상세/Try-On/OOTD 상품 tag 소비 경로에 공통 CatalogRefresh 한 곳을 적용한다. admin/auth/onboarding/settings/checkout 등의 페이지에는 실행하지 않는다.
- visible+online에서 60초 주기, online/focus/visibility 복귀도 같은 throttle. 최초 mount 요청 없음. 기존 `/api/health`를 한 번 사전 확인하고 10초 timeout/unmount abort를 사용한다. 503/network/잘못된 응답이면 현재 화면을 두고 다음 주기를 기다린다.
- 열린 form/실제 보이는 busy marker/장바구니/OOTD 작성/Try-On 생성/사용자가 편집한 상세 구매 초안 동안 갱신을 보류한다. 닫힌 dialog·inert·hidden·레이아웃 없는 form은 보류하지 않는다.
- 상세의 선호 사이즈는 계정/상품의 초기 조회만 수행하고 늦은 응답이 수동 선택을 덮지 않는다. 제거된 옵션은 구매 불가, 수량·선택은 자동 변경하지 않는다.
- 장바구니/Zustand/StoreSync의 수량·옵션·가격 snapshot은 자동 덮어쓰기나 PUT을 하지 않는다. 최종 주문의 서버 재계산이 권위다.
- For You 신규 진입만 raw createdAt DESC/id DESC. 기존 공통 ASC와 Ranking 가격 DESC를 변경하지 않았다. 열린 피드는 ID별 metadata 교체·삭제 제거·신규 append, category 변경은 최신순 새 sequence다.
- 상품/브랜드 anchor·사진·dismiss 보존. 같은 category sequence에서 브랜드 anchor/사용 이력을 유지하고 비활성 브랜드 slot을 다른 브랜드로 채우지 않는다. End는 도달 당시 slide ID gate로 고정하고 새 상품 이어보기 CTA에서만 새 구간을 연다.
- 관리자 등록/수정/재고 성공 뒤 `products` 태그를 `{ expire: 0 }`로 무효화한다. 실패나 권한 거부에는 호출하지 않는다.

## 자동 검증

- 캐시/For You 최신순 read: RED 5개 → focused 75 PASS.
- For You 새 props 순서·metadata·삭제·브랜드·End/IO: RED 2개 → focused 57 PASS.
- 공통 주기 component: RED 3개 → 초기 9 PASS, 추가 offline/malformed retry 포함 최신 11 PASS.
- 상세 갱신: 수동 사이즈 덮어쓰기 및 제거 옵션 RED 2개 → GREEN. 늦은 선호 응답 보호 포함 3 PASS.
- 최종 전체 140 files / 824 tests PASS, 6 files / 14 guarded skip. 추가 offline/malformed retry 테스트까지 포함한 결과다. 최종 TypeScript PASS.
- 전체 lint 오류 0, 기존 경고 3. production build 62 routes exit 0, DB 오류 0. 마지막 소스 변경 후 검증이다.

## 실제 로컬 fixture와 보존 기준

- 원래 상품 9개에서 시작했다. 외부 이미지 업로드를 실행하지 않고 기존 `createProduct` helper로 명시적 `CatalogRefreshQA-20261019` 상품 1개만 로컬 DB에 생성했다. 이미지 URL은 기존 상품에서 재사용했다.
- disposable ID: `d4e06f40-6ab8-417a-9096-b9ae362e8e4e`, brand `Catalog QA`, category Top, 시작 price151/재고5/사이즈M/Black.
- 기존 상품 metadata baseline SHA256: `da6308720f3f2ae266643da91b6a6d0b6ae1253919cb94360c8ffaec7b95e1fe`. 정상 상품 조회로 변할 수 있는 viewCount/updatedAt만 제외했다.
- 부모의 기존 실제 관리자 세션에서 해당 fixture의 편집 UI로 price151→152 저장했고 `/api/admin/catalog/[id]` 성공 및 실제 태그 만료를 확인했다. 다른 상품은 수정하지 않았다.
- 이어 실제 관리자 재고 UI로 같은 fixture의 M/Black 옵션에 DISPOSE -5를 기록했다. 재고5→0 및 품절, 이력1개가 예상 결과다. 상세·열린 목록의 다음 정상 주기 반영을 부모 브라우저로 관찰한다.
- 실제 서버 HTTP 대조: `/`, `/shop`, `/brands`, `/ranking`, `/for-you`, `/try-on`, `/what-to-wear`, 검색 query, fixture 상세가 모두 200이며 최신 fixture payload를 포함했다. `/liked`는 미인증 요청이 `/login`으로 이동했으므로 인증된 찜 UI 검증으로 주장하지 않는다. `/category`는 정적 분류라 fixture payload가 없는 것이 정상이다.
- 별도 독립 QA는 열린 For You/Shop/검색에서 다음 주기 반영을 관찰한다. 실제 화면/health/race/초안 검증은 qa.md와 구분하여 기록한다.
- admin POST 이미지 업로드는 외부 Supabase Storage 쓰기라 실행하지 않았으며 route tests 증거와 구분한다. 관리자 계정 생성/승격/allowlist 변경 없음.
- 부모의 실제 관리자 UI로 fixture price152→153 및 비활성화를 수행했다. 열린 For You는 새 상품을 기존 순서 뒤에 추가했고, 마지막 fixture를 보고 있을 때 제거되자 이전 상품1로 fallback했다. Shop은 상의 필터, 검색은 `q=CatalogRefreshQA`를 유지하며 다음 visible 주기에 fixture가 사라졌다. 숨겨진 탭은 갱신하지 않으므로 탭별 반영 시점이 달랐다.
- 실제 상세 UI는 L/Black/수량2 초안을 92초 뒤에도 유지했고 AED1438 및 busy marker를 확인했다. 이는 초안 보호 증거이며 해당 편집 중 화면의 자동 metadata 갱신 증거가 아니다.
- 최종 cleanup: fixtureRemaining=0, productCount=9, adjustmentsRemaining=0. 위 baseline SHA256과 동일하다. 정확 ID/name/brand 및 로컬 DB guard로 fixture와 그 cascade 재고 이력만 제거했다. 개인 QA 실행 helper도 제거했다.
- 독립 Goal/Code/Security/Context 검토 PASS, critical/high 0. 별도 QA의 Playwright transport가 중단되어 이후 실제 변경 왕복은 부모의 정상 CUA 관리자/고객 브라우저 증거로 보완했다. 실제 실행한 범위와 미실행 UI 조합은 qa.md에 구분한다.

## 2026-10-19 당시 제한 (아래 10-20 보완 기록과 구분)

주기적 갱신이지 즉시 push형 실시간은 아니다. 각 화면의 기존 category/query/section limit/찜 조건을 지키며, 모든 신규 상품을 모든 화면에 강제로 노출하지 않는다. 편집 중인 상세는 재진입까지 보류될 수 있다. Health 성공과 실제 RSC 처리 사이의 갑작스러운 장애는 완전 보장하지 않는다. 실제 Safari/Android 하드웨어·대량 카탈로그 pagination/가상화·장바구니 실시간 재견적은 이번 검증 범위가 아니다.

브라우저 도구 장애로 mobile-update 및 Try-On 생성/글쓰기 입력 중 실제 상품 변경 왕복은 미검증이다. 해당 보호 표식과 생명주기는 자동 테스트·소스 검토로 확인했으며 실제 모바일/작성 UI 전체 PASS로 표시하지 않는다. 독립 QA focused 29개 PASS와 부모 실사용 결과는 각각 귀속한다.

운영 DB/외부 서비스·설정·DB migration·commit·push·배포 변경 없음. 기존 dirty ADR와 임시 파일을 보존한다. 로컬 서버 session42560을 유지한다.

## 2026-10-20 추가 QA 실행 기록 (진행 중)

남은 모바일 갱신/Try-On 초안 검증을 사용자 승인으로 재개한다. `/api/health`는 `{ok:true, db:"ok"}`, 기존 `potata-dev-postgres` 실행을 읽기 전용 확인했다. 무시되는 `state/catalog-refresh-local-qa.ts`는 localhost/potata_dev 및 정확 fixture ID/name/brand guard를 적용한 로컬 QA 도구이며, 종료 시 제거한다. 새 fixture 이름은 `CatalogRefreshQA-20261020`; 기존 상품은 수정하지 않는다. 유료 AI·외부 이미지 업로드 요청은 실행하지 않고 생성중 보호는 HTTP 차단 sandbox 증거와 분리한다.

모바일 Try-On 카테고리 클릭 차단 조사: (H1) positioned 부모가 없는 absolute 생성 CTA가 카테고리를 덮음, (H2) 전역 고정 Navbar/하단 메뉴가 클릭점을 덮음, (H3) 중첩 scroll 영역이 자동 scrollIntoView 시 잘못 정렬됨. 강제 클릭으로 우회하지 않고 실제 bounding box/elementFromPoint와 정상 클릭 결과로 구분한다. 기존 색감·기능을 유지한 레이아웃 최소 수정만 승인 범위다.

확인된 원인(H1): mobile390×844의 Top 버튼 y753.862–791.462 중심에서 `elementFromPoint`가 disabled Generate Try-On 버튼을 반환했다. `tryon-mobile-obstruction.png` 증거와 실제 정상 클릭 timeout을 확인했다. `TryOnLayout.test.tsx` 회귀 RED1(absolute overlay) → CTA를 normal flex footer로 바꾸고 scroll 영역 `min-h-0`를 적용한 GREEN1; 언어/카테고리 기존 테스트 포함3 PASS. 이벤트/인증/유료 요청 로직은 변경하지 않았다. 부모 델타 소스 검토 PASS, 실제 정상 클릭 재검증은 별도 QA 기록에 남긴다.

수정 후 전체 141 files / 825 tests PASS, 6 files / 14 guarded skips. TypeScript PASS. MCP transport 재발로 독립 모바일 검증은 설치된 Playwright의 새 owned Chromium context로 재개하며 사용자 브라우저 context를 열람하거나 인증을 우회하지 않는다.

오늘 최종 lint: 전체 Git tracked+nonignored 신규 코드391개를 ESLint에 명시해 exit0, 오류0/기존 경고3. 기본 전체 폴더 스캔과 `.pnpm-store` 제외 스캔은 기존 로컬 vendor 탐색 지연으로 본인 세션만 중단했고, 설정/규칙은 변경하지 않았다. `.next`, `next-env.d.ts`, 무시된 vendor·로그·개인 QA helper는 소스 명시 목록에서 제외했다. 오늘 수정한2파일도 별도 lint exit0.

오늘 fixture `9b7588c5-69f1-418e-beca-7cf810269a7f` / `CatalogRefreshQA-20261020` / Top / price161 / stock5를 한 건 생성했고, 부모 정상 관리자 UI에서 price162 저장으로 products 캐시를 만료했다. 생성 직전 원래9개 baseline SHA256은 `2fb1c104b6e247f65bbda2724d71242573eee31e09de2f2722cb45fea48c0a8d`다(동일 helper 직렬화로 종료 시 비교). 운영 DB/기존 상품 metadata 쓰기는 없다. 오늘 QA 완료 뒤 fixture archive와 정확 guard cleanup을 수행한다.

부모 실제390×844 CUA 정상 클릭으로 전체→상의 전환2회 성공. 수정 후 Top y403.2–440.8 중심 hit='상의', selected=true, 가로 overflow=false. `mobile-try-on-layout-fixed.png`를 저장했다. 강제 클릭/유료 호출/외부 업로드는 없다.

후속 독립 브라우저 QA PASS: 설치된 Playwright의 독립 Chromium에서 실제60초 health/RSC 갱신 후 모바일 For You의 상품8/scroll844 및 브랜드 위치를 유지하고 새 상품을 뒤에 추가했다. End는 기존 index10/scroll8440을 유지하다 이어보기 클릭 시에만 fixture로 이동했다. Try-On synthetic PNG의 preview SHA256/선택 Top/상품/파일명이 실제60초 갱신 뒤 동일했다. 생성중은 `/api/try-on`과 `/api/recents`를 wire interception한 sandbox로만 검사했고, 사전 설치 clock65초 동안 health/RSC0, synthetic 응답 해제 뒤 다음65초 health/RSC2로 보류·재개를 검증했다. 실제 유료 AI/DB recent 쓰기와 구분한다. 독립 브라우저 모두 닫음 확인. 상세 증거는 qa.md에 귀속한다.

부모 desktop1280×900에서도 Top 정상 클릭/hit='상의', CTA y820–876, 가로 overflow없음을 확인했다. 오늘 fixture는 정상 관리자 UI 비활성 후 exact guard cleanup하여 fixtureRemaining0/productCount9, 오늘 baseline hash `2fb1c104b6e247f65bbda2724d71242573eee31e09de2f2722cb45fea48c0a8d` 동일. 제 private QA helper는 제거했다. 원래 상품 metadata/운영 DB/외부 저장소는 변경하지 않았다.

기존 제한 중 mobile-update/Try-On local draft·sandbox busy는 위 증거로 보완됐다. 실제 유료 생성 결과/물리 Safari/인증된 찜의 전체32개 조합/what-to-wear live draft 변경 왕복은 이번 보완으로 모두 검증됐다고 주장하지 않는다. 이전 실패 MCP context는 연결이 없어 폐쇄 확인을 못 했으며 광범위 강제 종료하지 않았다.

오늘 최종 fresh production build `npm run build` exit0, 62/62 routes, DB 오류0. 최적화/TypeScript/페이지 데이터 생성 단계가 순차 완료됐다. 기존 middleware→proxy deprecation 경고 외 기능 오류는 없었다. 빌드 동안 dev42560만 정상 종료했고 새 dev15191로 재개한다. 추가 source 변경 없이 전체825/14 guarded skip, 타입 PASS, 프로젝트 소스 lint0errors/3 기존warnings가 최종 결과다. commit/push/Vercel은 부모 release 담당에 인계하며 이 실행 리드는 stage/외부 배포를 실행하지 않았다.

재개 확인 완료: dev15191 Ready, `/api/health` True/ok, `/for-you` HTTP200, `/try-on` HTTP200. 두 고객 응답 모두 오늘 테스트 fixture 문자열이 없으며 `git diff --check` PASS. 서버를 유지하고 source freeze 상태로 부모 release에 인계했다.
