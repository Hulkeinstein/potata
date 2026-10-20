# 관리자 전용 화면과 업무 중심 홈 개편

## 요약

2026-10-20 사용자 승인: 조사 보고서를 바탕으로 계획 후 실행한다. 기존 업무 기능을 다시 만들지 않고 관리자 화면의 틀과 운영 홈만 개편한다. 예상 10~18개 코드/테스트/기록 파일, 난이도 중간, 복잡도 medium. 단일 실행 담당으로 겹치는 수정은 직렬 처리한다.

## 현재 구조와 중복 방지

- `app/layout.tsx`: Language/AuthProvider·StoreSync·CatalogRefresh와 고객 InitialLoader/Navbar/Footer가 공통 렌더된다.
- `app/admin/layout.tsx`: 서버 auth/isAdmin 통과 뒤 기존 AdminNav를 덧붙인다. 이 권한 검사는 유지한다.
- `lib/admin-dashboard.ts`: 기존 운영 수치 10개를 제공한다. 새 통계/분류 쿼리를 만들지 않는다.
- `lib/operations-assistant.ts`: 이미 우선순위 정렬된 read-only 이슈를 제공한다. 새 감지·해결 원장·자동 조치는 만들지 않는다.
- `/admin/products`, `/admin/inventory`, `/admin/questions`, `/admin/benefits`, `/admin/operations`의 기존 경로를 유지한다.
- 상품 등록/편집·재고 이력·Q&A·쿠폰/포인트 API 및 Prisma schema는 변경하지 않는다.

## 확정 화면

### 관리자 전용 화면 틀

- 산업형 업무 도구 방향: 기존 폰트·어두운 zinc 배경·제한된 neon 강조, 읽기 쉬운 경계선·숫자·focus 표시. 장식 모션/텍스처/커스텀 커서/외부 폰트 추가 없음.
- desktop `lg` 이상 왼쪽 고정 폭 메뉴, 작은 화면은 위쪽에 줄바꿈 가능한 동일 메뉴. drawer·별도 모바일 상태/모달은 만들지 않는다.
- 한국어 메뉴: 운영 홈, 상품 관리, 재고 운영, 고객 문의, 쿠폰·포인트, 운영 이슈. 현재 경로 `aria-current=page`, 상품 등록/편집은 상품 관리 활성, 홈은 `/admin` exact만 활성.
- 관리자 상단: 관리자 영역 안내와 '고객 사이트 보기' 기존 `/` 링크. `skip link`로 본문 접근, 새 전역 검색/알림 버튼은 만들지 않는다.
- root의 고객 chrome만 작은 Client Component 경계로 분리한다. `/admin` 또는 `/admin/` 하위만 제외하고 `/administrator` 같은 접두어는 제외하지 않는다. children/providers는 기존 위치에 유지하여 페이지 입력·세션·장바구니 remount를 방지한다.
- admin 진입에서 쇼핑용 intro·Navbar·Footer를 제외하고 고객 경로로 돌아가면 기존 chrome을 복원한다. 경로 그룹 이동·middleware 변경·새 쿠키/권한 없음.

### 업무 중심 홈

- 제목 '운영 홈', 기본 CTA '상품 등록'과 '상품 관리'. 기존 `/admin/products/new`·목록 연결.
- 최상단 '처리할 일': 기존 이슈 배열 첫 5개와 정확 전체 이슈 수, severity·대상·이유·영향·기존 해결 링크, 전체 `/admin/operations` 진입.
- severity별 기존 의미·정렬을 바꾸지 않는다. 정보성 판매 중지/미발급을 새로운 긴급 오류로 격상하지 않는다. 업무 시각이 없으므로 '오늘 발생'이나 시간 초과로 표현하지 않는다.
- 빈 이슈는 차분한 빈 상태. 조회 실패는 0건으로 대체하지 않고 오류 boundary에서 재시도를 제공한다.
- '바로 처리': 저재고(`/admin/inventory?filter=low-stock`), 자동 품절(`/admin/inventory?filter=sold-out`), 수동 품절(`/admin/inventory?filter=manual-sold-out`), 미답변(`/admin/questions?status=unanswered`). 지원하는 조건만 연결한다.
- 현황은 기존 10개 수치를 유지하되 작은 요약 영역으로 묶는다. 수치와 목적지가 정확히 같은 계약일 때만 link. 지원하지 않는 활성상품/전체품절상품/캠페인 필터를 있는 것처럼 만들지 않는다.
- 특히 zeroStockVariants는 수동 품절도 포함하나 inventory sold-out은 수동 품절을 제외한다. 해당 수치는 informational로 유지하고 별도 '자동 품절 보기' shortcut과 구분한다. 이슈 수·영향 건수·옵션 수는 서로 다른 단위다.
- 매출·순위는 홈의 큰 가짜 카드 대신 간결한 '판매 분석 연결 대기' 안내로 유지. 결제/원가 미연결을 정직하게 표시한다. 새로운 분석 route나 dead button 없음.
- 최근 변경 데이터가 없으므로 최근 작업 타임라인을 임의로 만들지 않는다.

## 테스트와 완료 기준

기존 Next/Prisma/Vitest/ESLint 환경 유지. RED→GREEN 후 focused→전체 test→tsc→소스 lint→build→실제 UI. 설치 Next `layout.md`, `use-pathname.md`의 client hook/상태 보존/rewrites 주의사항을 따른다. manifest/lockfile 설정을 바꾸지 않는다.

## TODOs

- [x] 1. 고객 chrome 경로 경계와 회귀
  - 참조: app/layout.tsx, components/ui/{Navbar,Footer,InitialLoader}.tsx, 기존 component 테스트 패턴.
  - RED: admin/root/subroute에는 세 요소 없음, `/`·`/shop`·`/administrator`는 그대로, 경로 전환 시 복원.
  - 구현: 작은 CustomerChrome 책임 컴포넌트, children은 그 안으로 이동하지 않음.
  - QA: 고객 홈/For You 유지, admin에 쇼핑 menu/footer 없음, 새로고침·고객 왕복에서도 hydration 오류 없음.
- [x] 2. 기존 auth 경계 안의 responsive Admin Shell
  - 참조: app/admin/layout.tsx, components/admin/AdminNav.tsx/test.
  - RED: 6개 기존 경로·한국어 labels·nested current·home exact·skip target.
  - 구현: 기존 Nav 대체/재사용 책임 정리, 중복 navigation 렌더 금지. 기존 서버 권한 유지.
  - QA: desktop1280×900/mobile390×844 모든 메뉴 클릭·Tab focus·가로 overflow0, 기존 상품/재고/문의/혜택/이슈 접근. 비인증 redirect 유지.
- [x] 3. 기존 read-only 데이터로 업무 중심 홈
  - 참조: app/admin/page.tsx/test, lib/admin-dashboard.ts, lib/operations-assistant.ts, app/admin/inventory/page.tsx.
  - RED: 6issue→5preview+정확total,0issueempty, shortcuts query, unsupportedmetricnonlink, zero/manual 의미, 실제 loader reject 실패.
  - 구현: 소형 표시 컴포넌트로 나누되 loader 재구현/중복조회/새write없음. admin error/retry 필요시 generic error boundary. 기존 oversized 모듈 확장 금지.
  - QA: 실제 로컬 DB 데이터로 수치·링크 목적지·필터 일치. 데이터 조작/테스트 상품 생성 없이 현재 데이터 사용, 빈/실패는 component 테스트와 구분.
- [x] 4. 전체 검증과 기록
  - focused·full tests, npx tsc --noEmit, 프로젝트 코드 ESLint(무시 vendor 제외), npm run build, git diff --check.
  - 직접 browser desktop/mobile 확인과 screenshot, console 오류 점검, 고객 browse regression, nonadmin guard.
  - 기존 서버 있으면 재사용. 빌드 충돌 시 식별된 로컬 dev만 정상 종료 후 재개. Docker 오류 시 독단적인 reset/reinstall/volume 변경 금지.
  - evidence/admin-shell-task-home/verification.md에 자동·실제·미실행 구분. 실제 admin 세션이 없으면 권한 변경하지 않고 정직하게 미검증 보고.

## Final Verification Wave

- [x] F1. 목표와 중복 방지 검토
- [x] F2. 코드 품질 검토
- [x] F3. 보안 경계 검토
- [x] F4. 실제 desktop/mobile QA
- [x] F5. git/보고서/기존 계약 맥락 검토

## 실행과 경계

작업 1→2→3→4, 검토는 source freeze 후 수행한다. 리뷰는 동시 슬롯 제한 안에서 batch로 실행한다. 새 파일은 책임별 분리하고 250 pure LOC 이하를 지킨다. UI 상태/권한/데이터 실패를 숨기지 않는다.

운영 DB·외부 서비스·환경변수·권한·유료 AI·상품 이미지/수량·commit/push/Vercel 배포 변경은 제외한다. 기존 dirty ADR·로드맵·보고서·로그·이미지 보존. 사용자 요청이 계획과 실행을 함께 승인했으므로 계획 확정 뒤 불필요한 재승인 없이 로컬 구현한다. 새 비용/외부 쓰기/데이터 변경이 필요하면 중단하고 별도 결정한다.

후속은 상품 편집/이미지/대량 작업이며 이번 완료 기준에 섞지 않는다.
