# 고객 화면 EN/KO 계속 작업

## 관리자 상품 설명 실제 저장
- 부모 사용자 브라우저에서 local product1 edit: 두 언어 QA 설명 저장 → EN/KO 정확한 본문 → 원래 null 필드로 UI 복원.
- Prisma local127.0.0.1/potata_dev9 상품, descriptionKo/En null 확인. 전체 hash는 변경되어 전체행 동일 주장하지 않음. Admin save updatedAt 및 고객 페이지 기존 view analytics 자동 POST가 존재하므로 timestamp만 원인이라고 단정하지 않는다.
- 재고 후속 조회: Product9, variants40, total stock200, 40개 모두stock5, manual sold out0. 기존 승인된 로컬 재고 상태와 일치.
- 운영 DB·Storage·메일·commit/push/deploy 없음.

## 실제 사용자 브라우저 QA
- Orders empty 한국어 ↔ English, 같은 URL, 주문 내역/No orders yet 확인.
- Checkout empty 한국어 ↔ English, 결제/주문 제출 없음.
- Cart empty 한국어 닫기 → Footer English → 재열기 Shopping Bag/Close cart 확인. 장바구니 상품 변경 없음.
- Screenshots: orders-en.png, checkout-ko.png, cart-ko.png, cart-en.png.
- Shop EN/KO9 products; Search `?q=hood` EN/KO3 results with query preserved; Brands headings/style chrome EN/KO; Category category/subcategory labels EN/KO; For You presentation EN/KO.
- Ranking Korean9 catalog products and original catalog-order caveat observed; some first reads caught loading state, not claimed as every-state bilingual proof.
- Settings preferred size M→L unsaved → Footer Korean remained L, then UI reverted M without saving. Notifications and Benefits empty English state verified; pilot checkout restriction retained.
- `/liked` Korean CTA was still English during QA; RED→GREEN fixed and parent final browser recheck confirmed Korean action.
- Product Reviews selected tab preserved EN Write Review ↔ KO 리뷰 작성, empty state translated. Q&A unsaved question remained after Footer EN switch (actual DOM showed unchanged text and10/2000), form labels/buttons translated; Cancel used without posting.
- Try-On Gallery tab preserved KO→EN My Gallery/No Generated Images Yet. OOTD Korean post form labels/close/tag controls rendered; no upload/post/AI generation performed.
- Further screenshots: try-on-gallery-en.png, ootd-form-ko.png, question-form-en.png.
- Try-On category final parent recheck: 전체/아우터/상의/하의/원피스/액세서리/신발 rendered Korean after RED→GREEN fix, raw IDs/selection preserved.
- Mobile390x844 Product Q&A/Shop/Footer Korean rendering: document scrollWidth <= innerWidth (no horizontal overflow). Screenshots mobile-product-qa-ko.png and mobile-shop-ko.png; original viewport restored. Recent console error list empty.

## Coverage inventory
- Discovery: Shop, Category, Search page/SearchOverlay, Ranking, Brands, For You.
- Account: My Page, Settings, Benefits, My Posts cards, Notifications item/page, Liked, public profile/follow/handle banner.
- Commerce: CartDrawer, Checkout, owner-scoped Orders chrome/status/date. Existing price and shipping semantics preserved.
- Social: product reviews/Q&A, OOTD feed/cards/form/comments/tag picker, Try-On panels/gallery/upload controls.
- Fallback: app loading, error, not-found; Try-On loading shell.
- Existing first wave: Navbar/Footer/Home/login/signup/emailverify/onboarding/photo/legal modal chrome/product detail/actions/Size Guide.
- Exclusions: admin chrome, original user/product/brand content and legally unapproved Korean draft bodies; official legal translations, emails, SEO remain outside this scope.
- 당시 발견한 기존 오류: Brands의 `Math.round(price*0.003)`/`price*0.004`가 잘못된 AED 값을 표시했다. 2026-10-17 별도 승인 후 공통 `formatPrice`와 실제 originalPrice만 사용하도록 정정했다. 가격 정책·DB 값은 변경하지 않았으며 회귀·브라우저 결과는 `evidence/brand-price-fix/verification.md` 참조.

## 자동 검증 (작업 중)
- Cart RED: 한국어 제목 테스트 실제 실패(English 제목) → GREEN2 tests.
- CommerceText + checkout 추가 회귀 포함6 tests PASS; checkout/order 테스트는 test-after이며 RED 증거 없음.
- Shell fallback locale 회귀 추가; 전체 검증은 다른 작업 범위 완료 후 재실행.
- OrderDate는 locale별 표시와 explicit UTC timezone/label을 사용해 서버·브라우저 timezone 차이의 hydration mismatch를 막음. exact timestamp contract3 tests PASS.
- Sandbox Vitest EPERM 임시 rename 때문에 elevated 재실행 사용; 테스트 실패를 기능 실패로 혼동하지 않음.
- Integrated TypeScript PASS; no LSP diagnostic tool available, so tsc used as type-diagnostic gate. Whole lint0 errors/existing3 warnings. Production build exit0,62/62 pages with local DB available.
- Initial full suite had6 legacy Korean expectation failures and1 pre-existing debounce timing failure. Translation expectations were migrated without weakening behavior assertions; isolated affected10 tests then passed. Final full rerun with maxWorkers2:123 files/678 tests PASS,5 files/11 guarded skips, exit0.

## 경계
- 관리자 UI, 상품/브랜드/사용자 콘텐츠, 법률 본문 원문은 번역 제외.
- Currency/shipping/order/payment/auth/API 정책 그대로. Checkout 서버 오류 원문 대신 locale별 안전한 오류 안내.
- Intentional QA description save/restore and pre-existing automatic product-view analytics changed local DB. No order/post/inventory submission or production write was performed; no blanket database-unchanged claim.
- 탐색·계정·소셜·Reviews/Q&A와 전체 타입·lint·tests·build 및 desktop/mobile 실제 QA 완료. Actual external image uploads/AI generation/legal acceptance/order submission were intentionally not executed; UI/state behavior uses focused regressions.

## 다각도 검토 진행
- Code/Security cross-review(탐색 담당자가 다른 계정·commerce·shell 검사): blocker0 PASS. 날짜 locale 문자열 비교와 default timezone minor findings를 확인해 후속 수정.
- Goal/Context cross-review는 계정 담당자가 다른 탐색·소셜·commerce·shell 검사 완료.
- Goal/Context cross-review(계정 담당자): 신규 blocker0 PASS, existing For You fabricated demo Sarah/12-view wording retained as pre-existing out-of-scope risk.
- 4-slot 환경 제한으로 5개 별도 동시 리뷰 실행하지 못했고 교차 리뷰와 부모 실제 QA를 순차 병합한다. 완전한 5-agent 동시 리뷰라고 주장하지 않는다.
