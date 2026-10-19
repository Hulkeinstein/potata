# Independent For You hands-on QA

Date: 2026-10-17. Verdict: **PASS with explicit multi-photo runtime limitation**.

## Environment and boundaries

- Local `http://localhost:3000/for-you`, real Chromium through Playwright MCP.
- Separate unauthenticated browser contexts: desktop 1280×900 and mobile 390×844 (`isMobile`, `hasTouch`). User browser/session was not touched.
- Actual local catalog: 9 products. No database write, login, wishlist mutation, deployment, dependency download, or production request.
- Native mobile gestures used Chrome DevTools `Input.dispatchTouchEvent` touchStart → 8 touchMove samples → touchEnd, not synthetic DOM touch dispatch.

## Observed scenarios

| # | Scenario | Result |
| --- | --- | --- |
| 1 | Fresh independent context defaults to Grid view | PASS |
| 2 | Real grid contains 9 unique product links | PASS |
| 3 | No Sarah / fabricated analysis; explicit non-personalized note | PASS |
| 4 | Grid → Immersive view | PASS |
| 5 | Next product changes first product to Nike ACG / AED 685 | PASS |
| 6 | Immersive → Grid retains product ID 2 | PASS |
| 7 | Return to Immersive retains same product | PASS |
| 8 | Reload restores immersive mode and product 2 / 9 | PASS |
| 9 | Outer category returns 2 products, first at 1 / 2 | PASS |
| 10 | Product detail navigation and browser Back restore Outer/current item | PASS |
| 11 | Shared Footer language EN → KO retains category and current product | PASS |
| 12 | Dress category has honest empty state | PASS |
| 13 | Last product shows 9 / 9 and end notice; Next disabled, no wrap | PASS |
| 14 | Keyboard ArrowUp changes product, focus remains on product panel | PASS |
| 15 | Focused category select uses native arrow behavior, not product gesture handler | PASS |
| 16 | Mobile native upward gesture over image changes product 1 → 2 | PASS |
| 17 | Mobile native horizontal gesture on single-photo product does not change product | PASS |
| 18 | Footer shortcut reaches language control; KO changes labels in mobile | PASS |
| 19 | Desktop/mobile document width never exceeds viewport | PASS |
| 20 | Invalid stored mode/category/missing product normalize to Grid / All / ID 1 | PASS |
| 21 | Native mobile product gesture does not lock document; Footer remains reachable | PASS |
| 22 | Attached mobile console/pageerror listeners during keyboard, category, horizontal swipe and language flow | 0 errors |

Actual prices read on the grid: AED 719, 685, 179, 369, 95, 99, 69, 279, 80. Original-price labels only appeared on products already carrying original prices (779, 239). No conversion factor was introduced by the feed.

## Limits: do not overstate runtime coverage

- All 9 local products currently have one unique photo. Native multi-photo horizontal navigation and photo-position restoration were therefore **not proven with real catalog data**. Existing focused component test `keeps the photo when switching through the grid` covers the two-photo contract with fixture props, not native touch.
- An attempted isolated HTTP/RSC fixture alteration failed hydration because changing serialized Flight content is not a valid test fixture boundary here. That context was closed and the attempt is excluded from application pass/fail evidence. No server data or application files were modified for it.
- Empty filtered category was exercised in browser; empty/one-product catalog variants are covered by existing component tests, not live DB mutation.
- No authenticated wishlist/cart mutation or assistive screen-reader test was performed. Existing HeartButton/ProductCard reuse and focused tests provide separate evidence; they are not represented as authenticated browser proof.
- Browser contexts were closed after QA. No raw logs, secrets, or screenshots were written.
