# Footer EN / KO — 1차 검증

- 범위: 공통 Footer/메뉴, 홈 Hero/상품 UI/트렌드 9개, 로그인/가입/인증, 프로필 완성/사진/법률 팝업 chrome.
- 상품명/브랜드/사용자 content 및 기존 법률 본문/버전 불변. 전체 사이트 번역 완료 아님: 탐색본문/상품상세/cart/checkout/mypage/admin/AI 등의 후속 목록은 계획에 유지.
- 언어만 `potata-language=en|ko` cookie에 1년 저장. Path=/, SameSite=Lax, HTTPS Secure. root cookies SSR 초기값과 HTML lang 동일. 선택은 context만 바꾸며 navigation/refresh/remount 없음.
- RED: 신규 locale module과 Footer 선택기 없는 상태에서 focused test 실패 확인. GREEN: switch/parser/cookie/parity/editorial-route, auth 입력+오류, onboarding 입력/동의+법률 원문 회귀 통과.
- 최종 tsc 통과. 전체 lint 0 errors, 기존 warnings 3.
- verify UI 분리 뒤 최종 전체 회귀: 106 files / 634 tests PASS, 5 files / 11 guarded skips.
- 최종 Production build exit 0, 62/62. request cookie로 Home 기존 ISR 분류가 dynamic(ƒ)로 변경됨. `lib/products` cache policy 불변. local PostgreSQL 접속불가 HOT cache 재검증 warning이 있었으나 build 통과.
- HTTP 실제 `/login`: cookie ko => 200 HTML lang=ko, invalid => 200 HTML lang=en.
- 부모 실제 desktop/mobile QA: Footer EN↔KO, 홈/메뉴/트렌드, 가입 provider/email form, query/hash 유지, reload 언어 지속 확인. 실제 입력값은 브라우저 개인정보 redaction으로 baseline부터 관찰 불가하여 automated actualProvider tests로 검증.
- DB offline 때문에 실가입/실온보딩 저장·메일 발송은 검증하지 않음. DB/외부 설정을 변경하지 않음.
- 독립 Security PASS(critical/high 0), Goal/Context PASS. 부모 core Code PASS. 5-agent 동시 리뷰는 tool agent thread limit 때문에 수행 불가; 5개 전체 독립 PASS로 주장하지 않음.
- 기존 법률 원문은 영어 포함. 승인 번역으로 바꾸지 않고 원문 초안 notice만 양언어 표시.
- commit/push/deploy 없음. dev server localhost:3000 재시작 ready.
