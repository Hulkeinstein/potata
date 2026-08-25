# Coupon Campaign Minimum Order and Google Step-up

## TL;DR

Add a minimum order amount to the coupon campaign pilot, make every campaign field self-explanatory, and replace the password-only administrator gate with a provider-aware step-up flow. The new minimum amount is stored and displayed only; checkout redemption remains explicitly out of scope.

## Scope

- Include: `CouponCampaign.minOrderAed`, validation and migration, clear campaign form labels/help, customer/admin display, and one-time Google step-up for Google-only administrators.
- Preserve: credentials administrators can still reauthenticate with their password; preview remains read-only; audit/idempotency/authorization boundaries remain enforced.
- Exclude: coupon redemption, cart/order total changes, payment, email OTP, external deployment, commit, and push.

## Decisions

- `minOrderAed` is a required positive whole AED amount. It is an inactive pilot rule until an approved checkout integration applies it.
- The campaign form uses visible `label` elements and a short explanatory sentence instead of relying on placeholder text.
- Google reauthentication requires fresh Google authorization (`prompt=login`, `max_age=0`), then issues a short-lived, one-time proof bound to the initiating administrator and permitted mutation scope. A current ordinary Google session alone is never proof.
- Proof creation verifies the returning Google account maps to the initiating app user; wrong user, expiry, replay, or wrong action family fail closed.

## Work

1. Extend the campaign model and contract.
   - Add additive `minOrderAed Int` to `CouponCampaign` with a positive-value database CHECK in a timestamped Prisma migration.
   - Extend `CampaignInput`, admin command parsing, DTOs, create/update service inputs, and schema validation.
   - Reject missing, non-integer, and non-positive values. Do not impose a relationship to the maximum discount without a separately stated business policy.
   - Update pilot documentation to state that the value is stored/displayed only before checkout exists.

2. Repair the coupon campaign UX.
   - Use explicit labels for campaign name, percentage discount, minimum order amount, maximum discount, scope, brands, expiry, audit reason, and step-up action.
   - Add concise helper copy: the order threshold is not yet enforced because checkout is not connected.
   - Display rate, minimum order, maximum discount, scope, and expiry on campaign cards.
   - Keep mobile layout single-column and preserve accessible labels/validation messages.

3. Implement provider-aware administrator step-up.
   - Add a short-lived, hashed and atomically consumed step-up proof store with actor/user binding, expiry, and permitted action scope.
   - Add a dedicated start/callback flow for fresh Google authorization. Verify the callback account email and resolved DB user ID match the original admin before issuing proof.
   - Return the available reauthentication method to the admin client; credentials users use password verification, while Google-only users are presented a Google reauthentication button.
   - Require and consume a valid proof before every write; do not require it for read-only previews. Preserve rate limiting for password attempts.

4. Test and verify.
   - TDD: add failing unit/route/UI tests before each behavior change.
   - Run migration against local PostgreSQL; verify the CHECK rejects invalid values.
   - Test campaign create/update/card rendering, no checkout mutation, credentials success/failure, Google proof success, expiry, replay, wrong-user and wrong-action rejection.
   - Run typecheck, lint, full tests, production build, and browser QA at desktop/mobile.

## Definition of Done

- An administrator can clearly create a campaign with discount rate, minimum order amount, maximum discount, scope, brands, expiry, and reason.
- The stored minimum order amount is visible but never changes checkout/order behavior.
- A Google-only admin can complete a fresh Google step-up once and authorize exactly the intended write; an expired, replayed, or mismatched proof is rejected.
- Existing password-based administrator flow remains secure and all existing benefits safety tests stay green.
