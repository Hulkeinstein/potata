# 관리자 상품 저장한 보기

## 목표 / 범위

2026-10-20 사용자 승인: 자주 쓰는 검색·필터 조건을 이름 붙여 저장하고 다시 불러온다. 기존 기능과 중복하지 않고 상품 데이터는 그대로 유지한다. 예상6~12파일, 난이도 중간, 복잡도 medium. 계획과 실행 승인됨. TDD/Vitest, 기존 Next/React/npm/ESLint 유지.

## 탐색 / Metis

- 기존 saved view 없음. lib/admin-catalog-query.ts의 parseAdminCatalogQuery/catalogQueryParams를 그대로 사용한다. 다른 query parser/전체상품조회/API/DB모델을 만들지 않는다.
- page.tsx는 기존 auth+isAdmin를 이미 수행한다. session.user.id를 storageScope로 전달하여 계정별 browser localStorage key를 분리하고 이메일은 저장키에 넣지 않는다.
- Metis: corrupt/unknown version 자동덮어쓰기 금지, 쓰기 성공 뒤만 UI성공, 변경 직전 persisted 목록 다시 읽어 stale overwrite 완화, 적용하지 않은 폼값 저장 금지.

## 확정 계약

- 기존 관리자 상품 목록에 '저장한 보기' 영역을 넣는다. 저장/불러오기/개별 삭제만. 이름변경/자동덮어쓰기/서버동기화/기본보기/팀공유/CSV 제외.
- UI에 '현재 관리자 계정의 이 브라우저에만 저장, 다른 기기와 동기화되지 않음'을 명시한다. ID가 없는 경우 기능 비활성화, 공용계정 fallback키 사용 금지.
- 현재 적용된 URL의 q/brand/category/status/quality/sort/pageSize만 저장. 미적용 폼입력/현재page/선택상품ID/확인dialog/결과수는 저장하지 않는다. 저장/불러오기 page1.
- 저장 이름 trim1~40자, control characters 거부, NFKC+소문자 비교로 중복거부(자동치환덮어쓰기 없음). 최대20개. 같은 조건의 다른 이름은 허용. 순서는 저장순.
- version1 {version:1,views:[{id,name,query}]}로 persist. ID는 UUID생성, 읽기상한80자·중복거부; 이름 위계약·중복거부; query최대4096자; 전체raw최대100KB·최대20개. strict object keys, 알려지지 않은 version은 오류. canonicalization은 기존parser/serializer 사용, externalURL·비허용querykey는 거부하며 page는 무시하여1. URL목표는 항상 /admin/products와 안전한query 조합.
- 저장/삭제는 key를 fresh-read→parse→변경→write 성공한 뒤 UI갱신. quota/security/읽기실패/invalid JSON/version은 정직한오류, persisted 원본 유지, 메모리만 성공처럼 바꾸지 않는다. corrupt 상태에서는 쓰기금지, 자동초기화하지 않는다.
- SSR는 빈/로딩의 안정된 snapshot, mount후client읽기. serverrender에서 window/localStorage 접근금지, hydration mismatch금지. storage event는 같은key에만 반응해 외부탭변경 반영. 완전한 multi-tab원자성은 localStorage만으로 보장하지 않음(동시쓰기 마지막저장우선), 직전읽기로 일반stale overwrite 완화.
- 삭제 전 보기 이름이 보이는 확인/취소. 취소/Escape no storage write. 접근성 focus/레이블/모바일 overflow 유지.
- 저장한 보기 불러오기는 기존 router.push의 내부목록 URL만 사용, bulk선택/확인은 기존URL scope 변경으로 초기화. bulk실행 중 저장·불러오기·삭제 비활성화. 기존 개별/일괄 상태·누락·편집복귀·조건초기화 계약 유지.
- 상품/옵션/재고/가격/이미지/상태/설명/운영DB 변경 없음. 새API/schema/migration/dependencies/외부서비스/commit/push/배포 금지. unrelated dirtyADR/roadmap/temp 보존.

## TODOs

- [x] 1. 저장한 보기 순수계약·storage 경계와 실패우선 테스트
  - 참조: lib/admin-catalog-query.ts/test, 기존 localStorage 패턴 components/ui/AICoordinatorPopup.tsx, Vitest환경.
  - QA: canonical query/page1, 허용key만, 빈/40/41이름·정규화중복/20한계, malformed/version/ID중복/rawcap, read/write예외, stale-read후추가/삭제. 새DB없이 실제Storage adapter 동작 확인.
- [x] 2. 기존 목록 UI 연결·세션 scope·실패우선 회귀
  - 참조: app/admin/products/page.tsx, AdminProductCatalogClient.tsx/tests, AdminProductStatusConfirmation.tsx의 focus패턴.
  - QA: 적용조건저장→다른조건→불러오기(page1)→새로고침유지→삭제취소/확정, 미적용입력제외, 계정분리, bulk선택초기화/실행중disabled, 오류no false success, storageevent반영.
  - 디자인: 기존 작업중심 dark/zinc/brand-neon 그대로, 간결한 이름입력+보기select+명시적불러오기 버튼. 상품등록 form과 nestedform 금지.
- [x] 3. 실제 UI/회귀검증 및 기록
  - desktop기본/mobile390x844 실제관리자 저장/불러오기/삭제/포커스/overflow. 임시보기만 정리하고 기존saved값 보존, 기존DB9상품40옵션 전체SHA불변확인. 상품fixtures 불필요.
  - focused/fulltests, TypeScript, sourceESLint, productionbuild, diffcheck, 각source250pureLOC이하. evidence/admin-saved-catalog-views/verification.md에 실행/미실행 구분. dev서버유지.

## 실행 전략

1→2→3 단일 구현소유자, 부모가 계획·실제UI·독립검토 통합. 프로그래밍/프론트엔드/start-work/review 스킬 사용. currentcheckout사용, 새worktree요청없음. commit/push는 후속사용자승인 전 제외.

## Final Verification Wave

- [x] F1. Goal/제약 검토
- [x] F2. Code 검토
- [x] F3. Security 검토
- [x] F4. 실제 QA
- [x] F5. 기존맥락 검토

완료 근거: evidence/admin-saved-catalog-views/verification.md. 전체983tests/63pagebuild PASS, 기존9상품40옵션 지문불변, 실제인증desktop/mobile 저장/불러오기/reload/삭제와 테스트보기정리 완료. dev유지build후 최종탭정상확인. 같은URL을 다시 불러오는 경우 조회범위가 바뀌지 않아 bulk선택이 유지될 수 있으며 URL조건이 바뀌는 경우 기존scope가 초기화한다.

## 완료 기준

현재관리자 브라우저에서 명명된 조건이 reload후유지되고 안전하게 재적용·삭제되며 상품데이터불변. 로컬저장/기기미동기화 한계명시. 실패시 기존목록 보존, 기존 기능회귀없음. 검증증거와 cleanup기록.
