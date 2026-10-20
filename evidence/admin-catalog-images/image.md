# Representative image implementation evidence

## Scope and preservation

- New image-only endpoint/domain and separate editor; existing JSON edit excludes imageUrl/images explicitly.
- Existing representative Storage files retained because historical order snapshots can refer to them.
- New upload compensation removes only the URL returned by this request's server-side upload.
- No schema/migration, existing product mutation, external Storage request, credentials output, commit, push or deploy.

## RED → GREEN

- Initial new domain/API tests RED: implementation modules absent; image API next exposed real behavior failures until Node multipart environment used.
- Edit form integration RED: image action absent and returnTo ignored (2 failing tests), then GREEN.
- Editor tests RED: component absent, then preview/save/cancel/conflict/network and invalid later selection GREEN.
- Final focused five files: 23 PASS; additional route error tests: 13 PASS (earlier route suite10, now13). Combined current total26 unit/route/component cases plus legacy description.
- Commands: `npx vitest run components/admin/AdminProductImageEditor.test.tsx components/admin/AdminProductEditForm.image.test.tsx components/admin/AdminProductEditForm.description.test.tsx lib/admin-product-image.test.ts app/api/admin/catalog/[id]/image/route.test.ts --maxWorkers=2`.
- Sandbox initial Vitest worker hung; same commands elevated passed. No config/dependency rewrite.
- `npx tsc --noEmit`: PASS. Scoped ESLint four production files: PASS, errors0/warnings0.

## Real local database

- Guard RUN_INTEGRATION=1 and local localhost/127.0.0.1 database pathname /potata_dev; refuse cloud target.
- Command loads @next/env before spawning Vitest so Prisma constructor receives DB environment without printing values.
- `lib/admin-product-image.integration.test.ts`: 2/2 PASS.
- Disposable UUID product/user/review/wishlist fixture only; removed after test. Existing9products/40variants untouched.
- Verified representative + first detail image change contract, same product/variant/review/wishlist IDs, exact stock/manual flags, descriptions/price retained, concurrent updates yield one saved + one conflict.
- First attempts refused missing environment and then Prisma captured early env; no fixture writes before those failures. Corrected command preloads environment before process start. Existing production code unchanged.

## Actual HTTP

- POST http://localhost:3000/api/admin/catalog/qa/image without auth →401 `{"success":false,"error":"Unauthorized"}`.
- Authenticated UI manual visual/upload QA not performed here: parent reported CUA browser policy limitation; no workaround attempted.
- Real external Supabase upload intentionally not exercised (requires scoped external-write authorization); Storage seam is tested through narrow mock, DB update uses real PostgreSQL fixture.

## Size and responsibility

- All changed/new owned files below100 pure LOC; one image update domain, one endpoint, one image editor, one existing information form.
- No any/assertion escapes, no empty catch. Multipart actual read4MiB before parsing, file3MiB, MIME+signature, duplicate image/expected fields rejected; auth before parsing.
- Parent owns final full suite/build/independent reviews and broad browser QA evidence.

## Follow-up review correction

- Full suite observed saved-success status while previous blob preview remained for a passive-effect tick. Removed duplicated file/preview state: one selection contains file+URL, synchronously cleared on success/cancel; effect only revokes object URL. Existing saved-photo assertion retained unchanged.
- Added failing-first disabled UI regression (RED input disabled false), then propagated disabled to input/save/cancel (GREEN).
- Focused editor+edit+legacy description: 3 files/10 PASS. Scoped editor ESLint PASS.
