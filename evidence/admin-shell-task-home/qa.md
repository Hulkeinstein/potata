# 관리자 화면/업무 홈 독립 QA

기준: 2026-10-20 승인된 `plans/admin-shell-task-home.md`, source freeze. 담당은 이 문서만 작성했으며 앱 코드·설정·DB·계정·서버 프로세스를 변경하지 않았다.

## 독립 실행 결과

- 로컬 HTTP GET: `/api/health` 200.
- 비인증 `/admin`, `/admin/products`, `/admin/inventory?filter=low-stock`, `/admin/questions?status=unanswered`, `/admin/benefits`, `/admin/operations`: 모두 307, localhost `/login?callbackUrl=...`로 이동. 미들웨어의 callback은 기존 pathname 계약으로 query를 포함하지 않으며 이번 범위에서 바꾸지 않았다.
- 집중 회귀: `CustomerChrome.test.tsx`, `AdminNav.test.tsx`, `AdminShell.test.tsx`, `app/admin/page.test.ts`, `error.test.tsx`, `dynamic-rendering.test.ts` — 6 files / 29 tests PASS.
- 처음 샌드박스 HTTP는 연결 제한(000), Vitest는 temp rename EPERM으로 테스트 본문 실행 전 실패했다. 동일 읽기 전용 요청/동일 테스트를 정상 승인된 실행 환경에서 재실행해 위 결과를 확인했다. 코드 수정이나 서버 재시작으로 우회하지 않았다.

## 시나리오 목록: 기본 15개 + 경계 5개

| # | 시나리오 | 직접 확인 범위/결과 |
|---|---|---|
| 1 | 개발 서버/DB health | HTTP 200 PASS |
| 2 | 비로그인 운영 홈 차단 | HTTP 307 login PASS |
| 3 | 비로그인 상품 관리 차단 | HTTP 307 login PASS |
| 4 | 비로그인 재고 관리 차단 | HTTP 307 login PASS |
| 5 | 비로그인 고객 문의 차단 | HTTP 307 login PASS |
| 6 | 비로그인 혜택 관리 차단 | HTTP 307 login PASS |
| 7 | 비로그인 운영 이슈 차단 | HTTP 307 login PASS |
| 8 | 관리자 6개 메뉴와 한국어 이름 | component regression PASS |
| 9 | 상품 등록/편집 시 상품 메뉴만 활성 | component regression PASS |
| 10 | 홈 exact 경로 활성 | component regression PASS |
| 11 | admin 고객 Navbar/Footer/intro 제외 | component regression PASS |
| 12 | 고객 홈/shop chrome 유지 | component regression PASS |
| 13 | admin→고객 전환 시 chrome 복원 | component rerender regression PASS; 실제 왕복은 부모 별도 QA |
| 14 | 본문 skip target·한 개 nav·main 중첩 방지 | component regression PASS; 실제 키보드 이동은 부모 별도 QA |
| 15 | 지원되는 재고/문의 shortcut query | 서버 페이지 렌더 regression PASS; 실제 필터 클릭은 부모 별도 QA |
| E1 | `/administrator` 유사 접두어 | 고객 chrome 유지 component regression PASS |
| E2 | 이슈 6개 이상 | 정확 총 6개/상위 5개 preview component regression PASS |
| E3 | 이슈 0개 | 정직한 빈 상태 component regression PASS |
| E4 | summary/issues loader reject | 서버 페이지 throw 및 generic retry reset 회귀 PASS; 실제 DB 중단은 미실행 |
| E5 | 0재고/수동품절 의미 혼동 | informational 설명·자동품절 shortcut 분리 및 unsupported 필터 부재 회귀 PASS |

## 실제 브라우저 범위와 한계

이 독립 담당은 사용자 브라우저/인증된 관리자 탭을 조작하지 않았다. 인증된 desktop/mobile 화면, 6개 메뉴 클릭, 가로 overflow, 고객 왕복, 실제 focus/console 확인은 부모 담당의 별도 관측이며 아래 인수 기록과 구분한다. 로그인한 비관리자 실세션, 실제 DB 중단/복구, 물리 휴대폰 Safari, 상품/쿠폰/재고 mutation은 이 QA에서 수행하지 않았다. 실패·빈 데이터는 회귀 테스트의 mock이며 실DB 오류/정상 0건이라고 주장하지 않는다.

## 인수 기록

부모가 제공한 실제 브라우저 관측을 2026-10-20 인수했다. 아래는 독립 담당의 직접 실행이 아니라 부모 담당에 귀속되는 결과다.

- 기존 인증 관리자 IAB tab 24 / dev session 43911, desktop 1280×900 및 mobile 390×844: nav 1, main 1, 고객 Footer 0, 가로 overflow 없음.
- 6개 관리자 메뉴의 목적지 접근을 확인했다. 재고 목적지는 홈 shortcut으로 실제 클릭했으며 재고 nav 자체의 단독 클릭으로 확대하지 않는다. 나머지 nav는 직접 클릭했다. 상품 관리→첫 상품 수정(`/admin/products/9/edit`)에서 상품 메뉴 current 유지, 재고·고객 문의·쿠폰/포인트·운영 이슈·홈 접근 정상.
- 홈의 4개 shortcut을 실제 클릭하여 low-stock / sold-out / manual-sold-out 선택값 및 Q&A 미답변 pressed 상태를 확인했다.
- 현재 실제 9개 상품, 운영 이슈 0개의 정직한 빈 상태를 확인했다. 테스트 fixture/DB write 없음.
- `고객 사이트 보기` SPA 클릭 후 고객 Navbar 존재/Footer 1/admin nav 없음, 기존 인증의 알림·로그아웃 표시 유지. `/for-you` 직접 GET에서 일반 보기·몰입 보기 버튼 및 9개 상품 정상 후 관리자 재진입.
- skip link에 Enter 입력 시 activeElement.id=`admin-content`. console errors `[]`.
- 증거: `desktop-home.png`, `mobile-home.png` (본 evidence 디렉터리). viewport reset 완료.
- 고객 모바일 메뉴의 추천 클릭 전환은 popup 등으로 최종 확정하지 못해 For You 직접 GET으로 대체했다. 고객 전체 cart/state 실사용 보존을 검증했다고 주장하지 않는다. 새 계정·권한 변경·DB write·외부 provider 호출 없음.

판정: 승인 범위의 독립 HTTP/회귀 + 부모 authenticated desktop/mobile 인수 기준 **PASS**. 물리 Safari·실제 DB 장애 복구·전체 고객 상태 보존·외부 기능 mutation은 위 한계 그대로다. production build 및 전체 자동 검증은 구현 담당의 별도 기록으로 판단한다.

## 정리

별도 브라우저·스크린샷·임시 스크립트·테스트 계정·fixture를 만들지 않았다. 이 담당이 종료할 서버/브라우저나 지울 데이터는 없다.
