# Coupon & Points Pilot Plan

## TL;DR

> **Summary**: Implement an administrator-managed benefits foundation with percentage coupon campaigns (maximum discount and brand scope), safe all-user or individual issuance, and purchase-based point policies that activate only after real payment and purchase confirmation exist.
> **Deliverables**: Benefits data model and migration, administrator campaign/policy/issuance controls, owner-scoped APIs, My Page benefits UI, tests, and browser QA.
> **Effort**: Large
> **Parallel**: YES — 2 waves
> **Critical Path**: domain contract → APIs → UI → integration/QA

## Context

### Original Request

Design coupons and points for Potata. The product is pre-launch and has no real payment flow, so the selected first delivery is an administrator-operated pilot: administrators issue benefits and users view their own history; benefits do not affect order totals.

### Interview Summary

- Include: coupon campaign definitions, all-user or individual issuance, per-user histories, optional coupon expiry, revocation/audit trail, configurable purchase-point policies, My Page entry, tests, and local QA.
- Exclude: checkout application, coupon codes, customer mutation, point spending, payment, fulfillment, refund execution, production deployment, and live currency conversion.
- Defaults: coupon cards show name, discount rate, maximum AED discount, scope, status, and optional expiry; all-user campaigns target verified accounts at issuance-time; points are integers shown as `P`; point grants require a reason; point policy computes from post-coupon merchandise subtotal only after purchase confirmation; all dates are stored and evaluated in UTC.

### Metis Review (gaps addressed)

- Keep the pilot independent of `Order` and checkout to preserve the existing truthful `PENDING`-only boundary.
- Use immutable point ledger entries, not a mutable balance.
- Use a reusable administrator-created coupon campaign plus user-owned grants and revoke state, not shareable codes or deletion.
- Snapshot all-user recipients in an auditable issuance batch and create one grant per recipient; never infer an all-user entitlement dynamically at read time.
- Store purchase-point policy now, but create purchase-derived ledger entries only from a later trusted `PURCHASE_CONFIRMED` order event; no `PENDING` order earns points.
- Add idempotency, admin re-authentication, owner scoping, expiry, and empty-state coverage.

## Work Objectives

### Core Objective

Provide a real, auditable benefits record that users can view and authorized administrators can manage, while preventing the UI from implying that benefits can already be spent.

### Deliverables

- `CouponCampaign`/`CouponIssuanceBatch`/`UserCouponGrant` coupon domain with a percentage rate, maximum AED discount, all-products or selected-brand scope, and individual/all-verified-user issuance, plus active, expired, and revoked grant states.
- Append-only point ledger with administrator grant and reversal entries.
- Versioned administrator point policy with purchase-rate, per-order cap, eligible scope, and future activation event; no premature earning path.
- Admin-only campaign/policy management, individual/all-user issue/revoke endpoints, and UI.
- `/mypage/benefits` customer page with coupons, point balance, and ledger history.
- Regression, authorization, idempotency, migration, and browser QA coverage.

### Definition of Done

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
- Local PostgreSQL integration tests prove owner scoping, single-write idempotency, revocation, expiry, and no checkout/order mutation.
- Browser QA confirms desktop/mobile benefits states with console errors at zero.

### Must Have

- Server-authoritative data and authentication on every endpoint.
- Administrator identity and mandatory reason recorded for every coupon definition, grant/revoke, and point grant/reversal.
- No customer-side issue, revoke, spend, or code-copy affordance.
- All-user issuance uses an explicit audience preview and confirmation; duplicate grants are prevented per campaign and user.
- Clear pre-launch wording: benefits are recorded but unavailable for checkout use.

### Must NOT Have

- No `Order`, cart, checkout, payment, review eligibility, or order total change.
- No coupon code, code copy button, checkout form, or order-total change.
- No mutable point-balance source of truth, direct deletion, production migration/deployment, or point accrual from `PENDING`/`CANCELLED` orders.

## Verification Strategy

> ZERO HUMAN INTERVENTION — all verification is agent-executed.

- Test decision: TDD with Vitest; add isolated PostgreSQL integration coverage for invariants and transaction behavior.
- QA policy: every task has happy and failure scenarios; capture command/browser evidence under `evidence/coupon-points-pilot/`.
- Keep local-only migration application separate from production DB operations.

## Execution Strategy

### Parallel Execution Waves

Wave 1: Tasks 1–2 establish domain contracts and server-side admin/customer APIs.

Wave 2: Tasks 3–5 deliver UI, integration coverage, and documentation once the API contracts are stable.

### Dependency Matrix

| Task | Depends on | Blocks |
|---|---|---|
| 1. Domain and migration | — | 2, 3, 4, 5 |
| 2. Admin campaign, policy, issuance/revocation | 1 | 3, 4, 5 |
| 3. Owner benefits read API | 1 | 4, 5 |
| 4. Customer/admin UI | 2, 3 | 5 |
| 5. Integration, regression, QA | 1–4 | F1–F4 |

## TODOs

- [ ] 1. Define the benefits domain and additive Prisma migration

  **What to do**: Add typed domain contracts under `lib/benefits/` and an additive migration. Model reusable `CouponCampaign` separately from user grants. A campaign has a name, percentage rate (`1..100`), required positive maximum AED discount, scope (`ALL_PRODUCTS` or `BRANDS`), a nonempty de-duplicated brand list only for `BRANDS`, creator, required internal reason, and optional UTC expiry. Add `CouponIssuanceBatch` with audience (`INDIVIDUAL` or `ALL_VERIFIED_USERS`), frozen eligible-recipient count, actor, idempotency key, and completion state. Each grant references one campaign, one batch, and one user; enforce unique campaign/user and calculate `ACTIVE`, `REVOKED`, or expired from UTC expiry. Add a versioned `PointPolicy` with rate basis points, per-order cap, eligible scope, `PURCHASE_CONFIRMED` activation event, creator, and effective window. Add append-only point ledger entries with signed amount, `ADMIN_GRANT`/`ADMIN_REVERSAL`/future `PURCHASE_EARN` type, required reason, actor ID or trusted order source, and unique source key. Add relations/indexes for campaigns, batches, policies, owned history, scope, and expiry. Derive balance only from ledger aggregation.

  **Must NOT do**: Do not add checkout, cart, payment, redemption, coupon code, minimum subtotal, stacking, or mutable balance fields. Do not create purchase ledger entries from current orders or change `Order`; only reserve a future trusted-order reference boundary. Do not seed fabricated benefits.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5 | Blocked By: —

  **References**:
  - Pattern: `prisma/schema.prisma:1-95` — existing User, Order, enum, relation, and index conventions.
  - Pattern: `prisma/migrations/20260824133000_user_settings_size_guide/` — latest additive migration convention.
  - Pattern: `lib/size-guide.ts` — strict parse/validate, fail-closed domain boundary.

  **Acceptance Criteria**:
  - [ ] Prisma schema validates and migration contains no destructive SQL.
  - [ ] A coupon campaign validates rate, maximum discount, and all-product/selected-brand scope against existing brands; each grant is owned by exactly one user and cannot be shared by code.
  - [ ] An all-user issuance batch snapshots verified recipients once and campaign/user uniqueness makes repeated or resumed batch writes safe.
  - [ ] Point policy validates rate, cap, scope, and `PURCHASE_CONFIRMED` activation without changing current Order behavior.
  - [ ] Point balance is reproducible from immutable ledger entries; reversals do not delete history.
  - [ ] Malformed amount, reason, status, expiry, and idempotency contracts reject before persistence.

  **QA Scenarios**:
  ```
  Scenario: valid benefit domain
    Tool: Vitest + local PostgreSQL
    Steps: create all-products and selected-brand campaigns, issue one individually and one through an all-verified-users batch, create a purchase-confirmed point policy and one admin point grant, then read owned history and aggregate balance
    Expected: valid rate/max/scope metadata, one grant per recipient, policy stored but no purchase point entry, active grants, and exact positive balance; no Order row changes
    Evidence: evidence/coupon-points-pilot/task-1-domain.txt

  Scenario: malformed or duplicate mutation
    Tool: Vitest + local PostgreSQL
    Steps: submit a zero/over-100 rate, nonpositive maximum, empty/unknown brand scope, invalid point rate/cap/event, negative point grant, blank reason, invalid expiry, then duplicate batch idempotency key
    Expected: validation failure; duplicate causes exactly one persisted ledger/grant action and each recipient has at most one campaign grant
    Evidence: evidence/coupon-points-pilot/task-1-domain-error.txt
  ```

  **Commit**: NO | Files: `prisma/schema.prisma`, `prisma/migrations/*`, `lib/benefits/*`, tests

- [ ] 2. Implement administrator campaign, policy, issuance, and revoke APIs

  **What to do**: Add admin-only endpoints that create, update only before first grant, and deactivate coupon campaigns; campaigns capture discount rate, maximum AED discount, and all-products or selected-brand scope. Add an audience-preview endpoint and an issue endpoint that supports `INDIVIDUAL` (normalized email) or `ALL_VERIFIED_USERS` (server-selected recipient snapshot) with explicit confirmation count and idempotency. Add revoke endpoints, point-policy create/version/deactivate endpoints, and manual point issue/revoke through positive grant/negative reversal entries. Reuse session plus `isAdmin` server-side authorization. Require a caller-provided idempotency key and audit reason for every write. Return sanitized DTOs only.

  **Must NOT do**: Do not allow public user lookup, arbitrary target IDs, coupon codes, customer mutation, delete routes, checkout calls, point earning from PENDING orders, or campaign edits after issuance. Do not issue “all users” from a client-supplied user list.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4, 5 | Blocked By: 1

  **References**:
  - Pattern: `app/api/admin/products/route.ts:39-248` — session and `isAdmin` enforcement.
  - Pattern: `lib/admin.ts` — administrator allowlist contract.
  - Pattern: `app/api/orders/route.ts:1-132` — input validation, idempotency, transaction, and sanitized failures.

  **Acceptance Criteria**:
  - [ ] Unauthenticated requests receive 401; non-admin requests receive 403.
  - [ ] Campaign creation rejects invalid rates, maximums, scopes, and unknown brands; individual issuance resolves exactly one user by email; all-user issuance uses only a server-generated verified-user snapshot; inactive campaign, invalid payload, stale preview confirmation, and duplicate idempotency return safe errors.
  - [ ] Point policy creation validates purchase rate/cap/scope but produces no purchase ledger entry while real payment and purchase confirmation are absent.
  - [ ] Revoke is idempotent and retains a complete audit trail.

  **QA Scenarios**:
  ```
  Scenario: authorized single-user issuance and revoke
    Tool: Vitest route tests + local PostgreSQL
    Steps: create a 15% / max 50 AED brand-scoped campaign, preview then issue it to all verified users, issue the same campaign to one separate email, create a 3% / max 100P purchase-confirmed policy, manually grant 100P, repeat request keys, then revoke a grant and points
    Expected: one immutable campaign, one grant per eligible recipient, no duplicate campaign/user grant, policy with no purchase entry, and one ledger grant/reversal pair; no deletion
    Evidence: evidence/coupon-points-pilot/task-2-admin.txt

  Scenario: authorization and input attacks
    Tool: Vitest route tests
    Steps: invoke endpoints unauthenticated, as non-admin, with foreign/unknown email, client-supplied all-user target list, stale confirmation count, invalid rate/max/brand scope/policy, negative points, and blank reason
    Expected: 401/403/400 as appropriate; no rows written
    Evidence: evidence/coupon-points-pilot/task-2-admin-error.txt
  ```

  **Commit**: NO | Files: `app/api/admin/benefits/**`, `lib/benefits/**`, tests

- [ ] 3. Implement owner-scoped benefits read API

  **What to do**: Add a session-bound GET endpoint that returns only the current user’s coupon grant cards and cursor-paginated point ledger, with balance derived server-side. Coupon DTOs include campaign name, percentage rate, maximum AED discount, human-readable scope, status, and expiry. Point DTOs distinguish administrator adjustments from future purchase-earned points without exposing internal actors or order identifiers. Compute `EXPIRED` from current UTC time without a background write; expose revoked separately. Exclude admin memo, batch identifiers, actor identity, internal IDs, and every future redemption field.

  **Must NOT do**: Do not accept `userId` query input, expose other users’ data, expose mutations, or trigger checkout/order reads/writes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5 | Blocked By: 1

  **References**:
  - Pattern: `app/api/users/me/posts/route.ts:1-105` — owner-scoped cursor and DTO approach.
  - Pattern: `app/api/notifications/route.ts` — current-user route authentication/error pattern.

  **Acceptance Criteria**:
  - [ ] Unauthenticated calls return 401.
  - [ ] Caller-controlled user identifiers cannot change the returned owner data.
  - [ ] Active, expired, revoked, empty, and paginated ledger states are deterministic.
  - [ ] Checkout and Order mocks remain untouched by this endpoint.

  **QA Scenarios**:
  ```
  Scenario: user sees owned benefits only
    Tool: Vitest + local PostgreSQL
    Steps: create benefits for two users; request as user A with cursor pagination
    Expected: only user A grants and ledger entries plus correct aggregate balance
    Evidence: evidence/coupon-points-pilot/task-3-owner-api.txt

  Scenario: expiry and IDOR attempt
    Tool: Vitest
    Steps: request with an expired grant and query parameter naming user B
    Expected: expiry status is returned for A; B data never appears
    Evidence: evidence/coupon-points-pilot/task-3-owner-api-error.txt
  ```

  **Commit**: NO | Files: `app/api/users/me/benefits/route.ts`, `lib/benefits/*`, tests

- [ ] 4. Build the My Page benefits and administrator management UI

  **What to do**: Add one descriptive My Page row to `/mypage/benefits`. Render coupon cards as name, percentage rate, maximum AED discount, all-products/brand scope, active/expired/revoked status, and optional expiry; render point balance/history as `P` only. Display explicit copy that checkout use is not available yet. Add an admin coupon management page linked alongside product registration: campaign form (name, rate, maximum AED discount, scope, selected existing brands, expiry, internal reason), campaign list, issuance choice (`한 사람` by email or `전체 발급`), server-generated recipient-count preview, irreversible confirmation text, and revoke controls. Add a point policy form (purchase rate, per-order cap, all-products/brand scope, effective window) clearly labeled `결제·구매 확정 연동 후 활성화`, plus separate manual point issue/revoke controls.

  **Must NOT do**: Do not render a coupon code, copy control, apply button, checkout entry, spend/earn button, client-entered bulk list/CSV, fabricated balance, or VIP tier.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5 | Blocked By: 2, 3

  **References**:
  - Pattern: `app/mypage/page.tsx` and `app/mypage/page.test.tsx` — protected navigation and menu tests.
  - Pattern: `app/mypage/posts/page.tsx`, `components/mypage/MyPostsClient.tsx` — owned loading/error/empty/pagination UI.
  - Pattern: `components/admin/AdminProductForm.tsx` — admin form validation and async feedback.

  **Acceptance Criteria**:
  - [ ] My Page benefits link is visible to signed-in users and routes correctly; unauthenticated access redirects by middleware.
  - [ ] Empty, active, expired, revoked, all-products, selected-brand, and long-ledger states are clear and keyboard accessible on desktop/mobile.
  - [ ] Every pilot card clearly shows its rate, cap, scope, and that it cannot be used at checkout yet.
  - [ ] Admin form validates rate/max/scope before submit; all-user issuance shows a server-generated count and explicit confirmation, and never renders the full recipient list or accepts one from the browser.
  - [ ] Point-policy UI clearly distinguishes a stored future rule from currently granted/spendable points.

  **QA Scenarios**:
  ```
  Scenario: customer benefits viewing
    Tool: in-app browser
    Steps: sign in as a seeded QA user with active all-products and brand-scoped coupons plus expired/revoked coupon and point history; open My Page > Benefits at 1280x900 and 390x844
    Expected: rate, cap, scope, statuses, balance, history and unavailable-at-checkout message render; console error count is 0
    Evidence: evidence/coupon-points-pilot/task-4-customer-browser.txt

  Scenario: admin validation and revoke confirmation
    Tool: in-app browser
    Steps: submit blank email/reason, preview an all-user campaign, alter the preview count, then complete a valid individual issuance and cancel revoke confirmation
    Expected: invalid request and stale confirmation stay blocked; valid result appears; cancelled revoke writes nothing
    Evidence: evidence/coupon-points-pilot/task-4-admin-error.txt
  ```

  **Commit**: NO | Files: `app/mypage/**`, `app/admin/**`, `components/benefits/**`, tests

- [ ] 5. Lock boundaries with integration, regression, and migration verification

  **What to do**: Run a focused local PostgreSQL suite covering transaction/idempotency/revoke/expiry/rate-cap-scope/audience-snapshot invariants and add source-contract regression coverage that ensures checkout, cart, `Order`, and review-purchase paths did not change. Apply migration only to the local development database, verify Prisma status/diff, and document the pilot scope and later activation prerequisites in the roadmap/SSoT, including the research-informed purchase-confirmation rule.

  **Must NOT do**: Do not execute migration commands against production, publish benefits, alter environment secrets, change payment plans, or mark a benefit redeemable.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: F1–F4 | Blocked By: 1, 2, 3, 4

  **References**:
  - Pattern: `app/api/orders/route.integration.test.ts` — isolated PostgreSQL cleanup and assertions.
  - Pattern: `components/ui/GhostAffordanceContracts.test.ts` — source contract protecting truthful checkout messaging.
  - SSoT: `.omx/plans/visible-deferred-features.md:134-176` — deferred-payment boundary and future state-machine requirements.

  **Acceptance Criteria**:
  - [ ] Every focused/integration test passes and local migration has no pending drift.
  - [ ] Regression test proves no changes to checkout payload, order total/status, cart, or review entitlement.
  - [ ] Documentation states the exact later activation requirements: coupon minimum order/stacking/usage limits/redemption, point conversion/earn/spend/expiry, refunds, trusted purchase-confirmation event, payment state integration, and operational approval.

  **QA Scenarios**:
  ```
  Scenario: benefits isolation regression
    Tool: Vitest + Prisma CLI
    Steps: run benefits integration suite, order route suite, checkout source-contract suite, prisma migrate status and diff
    Expected: benefits data passes independently; order total/status contracts are unchanged; no pending migration/drift locally
    Evidence: evidence/coupon-points-pilot/task-5-isolation.txt

  Scenario: concurrent duplicate request
    Tool: local PostgreSQL integration test
    Steps: submit the same all-user issuance idempotency key concurrently and retry the same point grant key
    Expected: one frozen issuance batch, one grant per eligible user, and exactly one durable point action; no duplicate balance/grant
    Evidence: evidence/coupon-points-pilot/task-5-concurrency.txt
  ```

  **Commit**: YES | Message: `feat(benefits): add admin-issued coupon and point pilot` | Files: scoped source, migration, tests, roadmap, and plan

## Final Verification Wave

- [ ] F1. Plan Compliance Audit
- [ ] F2. Code Quality and Security Review
- [ ] F3. Real Desktop/Mobile Browser QA
- [ ] F4. Scope Fidelity Check

## Commit Strategy

- One focused commit after all gates: `feat(benefits): add admin-issued coupon and point pilot`.
- Exclude `.env.local`, local database artifacts, screenshots unrelated to QA evidence, and all production configuration.

## Success Criteria

- Users can see only their own issued coupons and point history.
- Administrators can create coupon campaigns and point policies, then issue or revoke benefits individually or to a frozen all-verified-user audience with an auditable reason.
- A benefit cannot alter an order, cart, checkout, payment, or review entitlement.

## Audit retention policy

- `BenefitAdminAudit`, coupon issuance batches, coupon grants, and point ledger entries are operational audit records. They must not be hard-deleted through ordinary product/admin UI.
- The current pilot does not expose user deletion. Before a deletion workflow is introduced, it must choose and review one retention strategy: legally required retention with restricted access, or anonymizing the subject while preserving financial/administrative facts.
- Current owner foreign keys still cascade because changing deletion semantics without an approved privacy/retention policy could block account deletion. Production activation is therefore fail-closed until that policy is approved and the corresponding migration is reviewed against backup/restore procedures.
- Internal `reason` fields are admin-only. Customer APIs return fixed user-facing labels and never expose operator notes or possible PII.
- OAuth-only administrators have no password credential for local step-up authentication and are intentionally denied mutation access until an approved external step-up provider is configured.
