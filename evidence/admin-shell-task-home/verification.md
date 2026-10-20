# 관리자 전용 화면 · 업무 중심 홈 검증

기준일: 2026-10-20. 계획: `plans/admin-shell-task-home.md`.

## 구현 범위

- 고객 chrome만 `CustomerChrome` 경로 경계로 분리했다. `/admin` exact 및 `/admin/` 하위에서만 InitialLoader/Navbar/Footer를 제외한다. children·LanguageProvider·AuthProvider·StoreSync·CatalogRefresh의 위치는 유지했다.
- 기존 `auth()` → `isAdmin()` 서버 검사를 그대로 두고 AdminShell을 추가했다. 6개 기존 route의 한국어 메뉴·현재 메뉴·skip link·고객 사이트 링크, desktop sidebar/mobile wrapping menu를 제공한다. shell은 main landmark를 추가하지 않는다.
- 홈은 기존 summary/operations loader를 각 1회 병렬 호출한다. 기존 OperationsIssueList를 재사용하고 첫 5개와 정확한 전체 수·기존 severity·impact·해결 링크를 유지한다.
- 저재고·자동 품절·수동 품절·미답변은 지원하는 기존 query만 연결한다. 재고 0 옵션 수와 자동 품절 필터의 다른 범위를 안내하고 해당 재고 0 수치는 링크하지 않는다.
- 기존 10개 현황은 유지한다. 지원하지 않는 상태 필터나 분석 기능을 새로 만들지 않는다. 분석은 간략한 연결 대기 안내로 표시한다.
- DB 조회 실패는 0건으로 대체하지 않는다. Next admin error boundary에 generic 안내와 reset 재시도를 제공한다. 내부 error 내용은 렌더하지 않는다.

## TDD 및 자동 검증

- 최초 sandbox Vitest는 임시 파일 rename EPERM으로 실행하지 못했다. 동일 명령을 승인된 정상 로컬 권한으로 실행했으며 설정·의존성은 변경하지 않았다.
- RED: home의 새 처리할 일·shortcut 및 메뉴 한국어 요구가 실패했다(5 fail / 3 pass, CustomerChrome 신규 모듈 미존재 suite 포함). 기존 HTML Q&A 특수문자 assertion은 실제 escaping에 맞추어 수정했다.
- GREEN focused: 5 files / 20 tests PASS. admin 경로 exact/descendant와 `/administrator` 구분·고객 복원, 6개 nav/중첩 active/home exact, skip target/단일 main, 이슈 6→5와 전체 수/빈 상태/loader reject, error retry를 포함한다.
- TypeScript `tsc --noEmit`: PASS.
- 전체 tests: 144 files / 841 tests PASS, 6 files / 14 tests guarded skip. 기존 jsdom document navigation 안내 2건은 실패가 아니다.
- 전체 프로젝트 tracked code + 신규 code ESLint: exit 0, 오류 0 / 기존 경고 3(`_req`, ProductTagPicker directive, NextAuth). vendor·untracked 로그는 검사 입력에서 제외했으며 lint 규칙/설정은 변경하지 않았다.
- production build: session 76497 exit 0 PASS. compile / TypeScript / 62개 static pages 생성 모두 통과, DB 오류 0. 기존 middleware → proxy convention 안내만 남아 있다.
- `git diff --check`: PASS (기존 CRLF 경고만).
- 변경 source/test pure LOC: 최대 87, 전체 250 이하. source 역할은 고객 chrome·관리자 navigation·shell·home·error 경계로 구분했다. 새 input/domain boundary·type suppression·write/API는 없다.

## 실제 QA

- dev session 43911, `http://localhost:3000`, Next Ready 확인.
- 읽기 전용 HTTP: `/api/health` 200, 비로그인 `/admin` 307 → `/login?callbackUrl=%2Fadmin`. sandbox socket 접근 제한으로 동일 검사를 정상 로컬 권한에서 재실행했다.
- 부모 CUA 인증 QA PASS: desktop 1280×900 / mobile 390×844에서 홈·혜택·이슈 가로 overflow 0, 단일 admin nav/main, 고객 Footer 0. 기존 6개 메뉴를 실제 클릭했고 상품 9 edit에서는 상품 관리가 active로 유지됐다.
- 홈 4개 shortcut의 저재고·자동 품절·수동 품절·미답변 목적지와 선택 filter를 직접 확인했다. 실제 DB의 9개 상품 / 운영 이슈 0건을 확인했고 빈 상태가 정확히 표시됐다.
- 관리자 → 고객 사이트 보기 SPA 클릭 후 고객 nav/Footer 복원, admin nav 제거, 기존 세션 유지. `/for-you` 일반 보기 직접 로드와 관리자 재진입 PASS. skip link Enter → focused ID `admin-content` PASS. console error 0.
- 스크린샷: `desktop-home.png`, `mobile-home.png` (부모가 저장). viewport reset 완료. 클릭 검증은 조회/이동만 수행했고 write button·DB 수량 변경은 수행하지 않았다.
- 고객 mobile menu 추천 클릭은 초기 팝업/메뉴 상태 때문에 전환하지 않아 해당 고객 메뉴 전체 QA 완료로 주장하지 않는다. physical Safari/Android는 미실행이다.
- 독립 Goal/Code/Security/Context review 모두 PASS, blocker 0. independent QA의 읽기 전용 HTTP 6개 guard/health와 focused 29 tests PASS (기존 tests 포함).
- 로컬 DB·상품·수량·계정 데이터 조작, 새 사용자·권한 변경, 외부 서비스·환경변수·유료 호출은 수행하지 않았다.

## 경계 및 보존

- Prisma/schema/migration/API/auth/middleware/환경설정/lockfile는 변경하지 않았다.
- commit/push/배포는 이번 승인 범위에 없고 수행하지 않았다.
- 기존 dirty ADR·로드맵·보고서·스크린샷·로그·vendor 임시 파일을 보존했다.
- 새 임시 helper/테스트 계정을 만들지 않았다. 완료 시 빌드를 위해 식별된 dev만 정상 종료한 뒤 재시작한다.
- dev 43911은 build를 위해 Ctrl+C로 정상 종료했다. production build session 76497 exit 0 후 dev 89382를 재개했고 `http://localhost:3000` Ready를 확인했다. 사용자 확인을 위해 유지한다.
- 재개 후 health 200, 부모 CUA 새 `/admin` tab 25에서 상품 9 / 이슈 0 정상 렌더 및 console error 0을 다시 확인했다. build 중 이전 탭의 stale net error는 새 연결로 정상 해소됐으며 source 오류가 아니다.
- 계획의 남은 top-level checkbox 0, Boulder `admin-shell-task-home` 상태 complete, ledger 완료 기록을 확인했다. 최종 diff-check PASS.
