# Independent hands-on QA — admin catalog and representative image

## Scope / execution boundary

2026-10-20, final source freeze. Ran actual HTTP requests against localhost:3000 and actual catalog loader calls against the existing local PostgreSQL database. All DB operations in this review were read-only. No browser interaction, external Storage request, credential output, data mutation, fixture creation, commit, push, or deploy.

Browser observation was previously denied by URL policy. This review did not retry through another browser, CLI browser, or other workaround. Desktop/mobile visual QA and authenticated upload therefore remain explicitly unexecuted. This report is not a full visual/UI acceptance claim.

## Scenario inventory and augmentation

Initial scenarios: auth gates, real status truth, category/brand/search, empty results, price ordering, pagination, deterministic sort, URL limits and safe return, baseline data preservation.

Additional risk scenarios after review: authenticated non-admin403; malformed image; duplicate multipart fields; concurrent representative changes; broken-image fallback; invalid replacement selection; draft preservation; desktop/mobile layout. Existing focused component/route/integration tests cover many of these, but those results are separate from this independent runtime execution.

## Executed cases

| Priority | Scenario | Actual result |
|---|---|---|
| P0 | Catalog GET without session | 401, generic response, no Prisma/Storage secret leakage |
| P0 | Representative-image POST without session | 401, generic response, no leakage |
| P0 | Narrow status PATCH without session | 401, generic response, no leakage |
| P0 | Admin products page without session | 307 to login |
| P0 | Admin edit page without session | 307 to login |
| P0 | Existing product count | 9 |
| P0 | Existing variant count | 40 |
| P0 | Product/variant full-row preservation | SHA-256 exactly equals pre-work baseline |
| P1 | All-status loader | Matches full database truth/count |
| P1 | Active-status loader | Matches active + available-option truth/count |
| P1 | Inactive-status loader | Matches inactive truth/count |
| P1 | Sold-out-status loader | Matches active + no-available-option truth/count |
| P1 | Exact brand filter | Count and returned rows match local source |
| P1 | Category filter | Count and rows match local source |
| P1 | Product-name query | Known current product included |
| P1 | Nonexistent query | total0 and empty array |
| P1 | Price ascending | All adjacent values nondecreasing |
| P1 | Price descending | All adjacent values nonincreasing |
| P1 | Page1/page2 size3 | Three rows each, same total, no repeated IDs |
| P1 | Repeat page request | Identical ordered IDs |
| P1 | Huge page query | Clamps to100 |
| P0 | External returnTo | Falls back to /admin/products |
| P1 | Valid returnTo with unknown key | Keeps allowed brand/status/page; strips unknown key |

Executed: 23 checks, 23 PASS. DB driver used the existing Prisma/catalog/query modules; HTTP driver used normal requests without session cookies. Driver output contained only statuses, pass booleans, counts, and preservation hash.

Preservation hash: `78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689`.

## Unexecuted runtime cases / separate automated evidence

- Authenticated non-admin403: route tests, not a real session in this review.
- Authenticated image upload and real Supabase delivery: not executed; no external-write authorization in this QA scope.
- Real UI preview/cancel/invalid-selection/network409/draft retention: component tests in image.md, not browser execution here.
- Local image CAS with relationship/stock preservation: implementation agent's real guarded integration2/2 in image.md; not rerun concurrently with parent's full regression suite.
- Desktop1280/mobile390 layout, keyboard navigation, image visual loading and edit/list visual round-trip: not executed because browser policy denied access.

## Disposition

Executed HTTP/DB subset PASS, no runtime blocker found within that subset. Full browser and external-upload acceptance remain unverified; do not represent this report as an unconditional UI QA PASS.
