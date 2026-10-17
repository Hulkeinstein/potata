# Footer English / 한국어 전환

## 결정과 범위
- 사용자 승인: 모든 페이지 공통 Footer에 Language dropdown, English / 한국어 원어 이름.
- 1차: 공통 UI + 홈 + 로그인/가입/인증/프로필 완성 문구. 나머지 화면은 후속 목록으로 명시한다.
- 기본 English; 유효한 `potata-language` cookie (`en` / `ko`) 우선. 잘못된 값은 English.
- URL prefix/domain 전환·자동 브라우저 언어 감지·새 라이브러리·DB 모델은 추가하지 않는다.
- locale cookie를 RootLayout에서 읽고 client LanguageProvider의 초기값으로 전달한다.
- cookie 읽기로 root가 request-time 렌더링된다. 기존 Home ISR 페이지 분류 변화는 허용하되 `lib/products`의 데이터 캐시/조회 정책은 변경하지 않는다. 빌드 전후 route 결과를 기록한다.
- client context state + cookie 직접 기록으로 즉시 전환한다. refresh/reload/router navigation은 호출하지 않는다.
- cookie: Path=/, SameSite=Lax, Max-Age=31536000, HTTPS에서 Secure. 기밀값/권한 정보 아님.
- 선택하면 `document.documentElement.lang`도 갱신한다. server HTML lang과 초기 context는 동일해야 한다.
- URL/path/query/hash, 로그인 세션, 장바구니, 미저장 입력, 모달 열림, focus를 유지한다.
- 브랜드 POTATA/Seoul to Dubai/AI Studio, 상품명·브랜드명·게시물·사용자 이름은 원문 유지한다.
- 법률 전문/버전은 번역하지 않는다. English UI에서는 원문 한국어·미승인 초안임을 명시한다. 동의 의미·LEGAL_VERSION·공개 가입 제한은 변경하지 않는다.
- Metadata의 제품 브랜드 제목/설명은 이번에 기존 영어 유지. html lang만 locale에 맞추며 SEO 다국어 경로는 별도 범위.

## 조사 근거
- `app/layout.tsx`: sync root, AuthProvider + Navbar + Footer; html lang=en.
- `components/ui/Footer.tsx`: 서버 컴포넌트, 공통 메뉴/소개/저작권.
- `components/ui/Navbar.tsx`: client; NAV_LINKS label과 mobile auth/aria 문자열.
- `app/page.tsx`: revalidate=1800; 데이터 로딩과 client 홈 컴포넌트가 분리됨.
- `components/ui/Hero.tsx`, `ProductGrid.tsx`, `K_TrendSection.tsx`: client UI shell.
- `app/login/page.tsx`, `app/signup/page.tsx`, `components/signup/*`: mixed EN/KO.
- `components/onboarding/ProfileOnboardingForm.tsx`, `ProfilePhotoField.tsx`: local form state/API 에러 문자열.
- `components/legal/LegalModal.tsx`: 한국어 법률 본문과 원문 draft notice, 버전 유지 필요.
- Next 로컬 docs: `01-app/03-api-reference/04-functions/cookies.md`, `02-guides/internationalization.md`, `01-getting-started/05-server-and-client-components.md`.
- gap review 반영: cookie 범위/invalid fallback, hydration, request-time 영향, lang, 미저장 state, 정확한 번역 대상.

## 실행 과제 (TDD)
1. Locale 계약·사전·Provider
   - `lib/i18n`에 en/ko literal 타입, cookie parser, scope별 동일 key 사전. 문자열 value만, interpolation은 명시 typed 함수.
   - `components/providers/LanguageProvider.tsx`: initialLocale -> state, no locale-key remount, cookie+lang update.
   - context 기본값 English로 기존 isolated component test 호환; 실제 root에는 반드시 provider.
   - 테스트: invalid/missing cookie fallback, 사전 key parity/nonempty, EN/KO 변경, cookie 속성, lang, input 보존.
2. 공통 Footer/Navigation + 홈
   - Footer client화, label `Language / 언어`, native select min-height44px; 기존 black/zinc 스타일.
   - Navbar desktop/mobile labels/aria/auth; 홈 heading/description/CTA/scroll controls를 사전에서 읽는다.
   - ProductCard 배지/찜 aria, AICoordinatorPopup UI 포함하면 별도 home/shared dictionary에 추가. 상품 content 불변.
   - 테스트: Footer accessible name+options, NAV 링크 destination 동일, KO/EN 실문구, home 상품명 불변.
3. 가입/로그인/온보딩 문구
   - login, signup, ProviderChooser, EmailSignupForm, verify-email, ProfileOnboarding header/form/photo UI.
   - 서버 header는 별도 client translated heading으로 추출해서 refresh 없이 바뀌게 한다.
   - errors는 raw 문자열을 state로 저장하지 않고 translation key 또는 server-message descriptor 저장: 선택 후 기존 오류도 전환.
   - API 내부/공급자 오류 원문을 UI에 그대로 노출하지 않는다. known safe errors map, unknown localized generic fallback; API 계약/auth semantics 그대로.
   - handle validation 결과는 기존 validator를 유지하고 known client feedback만 두 언어로 표시.
   - legal modal의 close/full-page/confirm chrome만 전환, 한국어 원문/초안/버전 표시 유지.
   - 테스트: 이메일 mismatch/network/known API fallback 양언어, unsaved name/handle/password/consent 보존, Google callback/prompt unchanged, legal원문/버전 불변.
4. 전체 검증/기록
   - focused Vitest RED→GREEN; typecheck, lint, 전체 Vitest, production build.
   - 1280x900 / 390x844 실제 browser: Footer EN→KO→EN, 홈/로그인/가입/온보딩, navigation/reload persistence.
   - signup form 입력 후 Footer 변경: pathname+query+hash와 필드값 유지, focus/keyboard selectable, console hydration error0.
   - cookie ko 직접 HTTP GET: 최초 HTML lang=ko 및 번역된 Footer; invalid cookie lang=en.
   - auth/admin 보호 focused regressions 확인; DB mutation, 메일 발송, 외부 storage 업로드로 검증하지 않는다.
   - 결과/남은 범위 `evidence/footer-language-switch/` 기록. main 기존 문서/임시 산출물 preserve.

## 남은 번역 목록 (완료로 표시하지 않음)
- Shop/Category/Search/Ranking/Brands/For You 본문 및 검색/cart drawer: 탐색과 주문 전 UI.
- 상품 상세/옵션/리뷰/Q&A/Size Guide/checkout/orders.
- My Page/Settings/Benefits/My Posts/Notifications/public profile.
- OOTD/댓글/업로드/AI Try-On.
- 관리자 UI는 사용자 요청으로 번역 대상에서 제외한다.
- API 에러의 전체 error-code 계약 및 이메일 템플릿 번역; 이번 적용 화면의 안전한 표시만 처리.
- 법률 공식 번역 및 다국어 SEO metadata/URL/hreflang은 별도 승인 범위.

## Done 조건/경계
- 선택기는 일반 앱 layout을 사용하는 모든 페이지에서 보임(기존 fullscreen overlays가 덮는 동안 제외).
- 1차 번역 화면 EN/KO 전환·reload/SSR 일치·미저장 state 보존이 실제 browser 검증됨.
- 제품/content/auth/coupon/inventory/동의 의미 불변. 신규가입 제한·test account allowlist 불변.
- 각 새 module250 pureLOC 이하; Navbar 기존 크기는 기능별 작은 translated helper/extraction 최소 변경.
- 예상 production 약16-22파일/600-1000줄 + focused tests. 난이도 중간, complexity medium.
- 여기서는 commit/push/deploy/운영 DB 변경 없음. 배포는 별도 사용자 승인.

## 2026-10-13 계속 구현 승인
- [x] 로컬 관리자 상품 설명 실제 저장 → EN/KO 고객 렌더 → null 원복 검증.
- [x] Shop/Category/Search/Ranking/Brands/For You 및 SearchOverlay.
- [x] My Page/Settings/Benefits/My Posts/Notifications/liked/profile.
- [x] Cart/Checkout/Orders.
- [x] 고객 Reviews/Q&A/OOTD/댓글/게시 입력/AI Try-On.
- [x] 전체 회귀·타입·lint·build·desktop/mobile 실제 화면 검증.
- 모든 기존 데이터 보존, 관리자 번역 제외, 운영 DB·메일·Storage 외부 mutation 및 commit/push/deploy 없음.
- 기존 상품 설명 nullable fields는 UI QA 후 null 복원, 재고9상품40옵션각5 유지. 기존 view analytics는 고객 페이지 방문 시 자동 기록되므로 DB 전체불변으로 표현하지 않는다.
- 최종678 tests PASS/11 guarded skip, TypeScript PASS, lint0errors/existing3warnings, production build62/62 PASS. 실제 QA와 제외 범위는 evidence/customer-translation/verification.md 참조.
