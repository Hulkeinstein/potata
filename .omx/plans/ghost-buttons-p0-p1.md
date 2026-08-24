# Ghost Button P0/P1 Execution Plan

> Status: **Approved for execution**
> Scope: P0 plus only P1 actions backed by an existing route, API, or local state transition. No external services, production DB, deployment, commit, or push.

## Goal and acceptance contract

- Remove or correct links that resolve to 404, especially the My Page wishlist path.
- Remove nonexistent settings, coupon, and points affordances instead of inventing data or policy.
- Describe checkout honestly as creating a payment-pending order, not starting payment.
- Connect eligible discovery and product CTAs to existing `/shop`, `/search`, `/product/[id]`, `/liked`, and existing local wishlist/cart behavior.
- Any remaining interactive control must cause a real state change, valid navigation, or present an explicit non-interactive “preparing” state.
- Preserve intentional disabled states for loading, authentication, empty state, and required input validation.

## Explicitly deferred

- **P2:** recommendation refresh/filtering, AI outfit generation expansion, invented ranking/personalization behavior.
- **P3:** policy pages, external social links, coupons, points, and payment-provider integration.
- Deferred capabilities are hidden or rendered as honest non-interactive copy; no placeholder route, policy, or mock data is created.

## Execution workflow

1. **Lock behavior with RED tests**
   - Extend My Page tests for `/liked` and absence of coupons, points, and settings.
   - Add focused UI tests for Hero, ProductGrid, Footer, search suggestions, discovery cards, and product purchase actions.
   - Verify tests fail for the current ghost behavior before implementation.
2. **P0 cleanup**
   - Correct `/wishlist` to `/liked` and remove unsupported My Page affordances.
   - Remove `href="#"` support/social links and hide unsupported AI/recommendation invocations.
   - Replace checkout’s payment claim with payment-pending order wording.
   - Remove nonfunctional filter/sort/size/visual-only controls where no existing contract exists.
3. **Existing-function P1 connections**
   - Hero and collection CTAs navigate to existing Shop/Try-on routes.
   - “View all,” popular searches, trend/brand/product cards use existing Shop, Search, and Product routes.
   - Product quantity updates cart quantity; wishlist uses the existing `/api/wishlist`; share copies the current product URL.
   - Product brand/review affordances navigate or update visible page state.
4. **Maintainability boundary**
   - Extract the purchase-control region from oversized `ProductDetailClient.tsx` into a typed focused component; no schema/migration changes.
   - Keep new and materially edited TypeScript modules below the repository’s 250 pure-LOC guideline where feasible.
5. **Verification and review**
   - GREEN focused tests, then full `test`, TypeScript check, `lint`, and production `build`.
   - Desktop/mobile browser QA of Home, Search, Shop/Ranking/Brands, Product, My Page, and Checkout copy.
   - Final diff/security/scope review; remove temporary QA artifacts produced by this task.

## File-level change map

- P0: `app/mypage/page.tsx`, `app/checkout/page.tsx`, `components/ui/Footer.tsx`, `app/shop/ShopContent.tsx`, `app/for-you/ForYouContent.tsx`, `app/try-on/TryOnContent.tsx`.
- P1: `components/ui/Hero.tsx`, `components/ui/ProductGrid.tsx`, `components/search/SearchOverlay.tsx`, `components/ui/K_TrendSection.tsx`, `app/ranking/RankingContent.tsx`, `app/brands/BrandsContent.tsx`.
- Product actions/refactor: `components/product/ProductDetailClient.tsx` plus one focused purchase-actions component.
- Tests: colocated `*.test.tsx` files and existing My Page/search tests.

## Risks and controls

- Removing unsupported affordances may change layout: verify both desktop and mobile visually.
- Search links depend on the existing query contract: assert encoded query URLs in tests and browser QA.
- Cart/wishlist actions are security-sensitive only at the existing API boundary: reuse existing stores/components without altering authorization.
- No Prisma model, migration, secret, external account, or production data operation is required.
