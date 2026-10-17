# 상품 설명 EN/KO 운영 배포 — 2026-10-17

## Objective and approval
- User explicitly approves safe production description-column migration, existing-data preservation, push and deployment. Execute now; no renewed approval is needed for these exact steps.
- Local feature commit: `118db65`; repository `Hulkeinstein/potata`, branch main; known Vercel project potata in jangkamwoo-5912s-projects, public domain potata.vercel.app.
- Live Vercel preflight discovered newer Production source `a7e843d6899dffe1cccfe04f717cd619ea200152` (security #69), deployment `8Lh2urJqMo3kdoPLhSFcmqqJFVgj`. Local origin refs were stale. HOLD production writes/push until a fresh fetch and full ancestry/migration comparison. Never downgrade or force-push over newer remote security work.
- Expanded explicit user approval: preserve all existing data, integrate the newer security work, validate both changes, apply both approved migrations, push and deploy. Reconcile the feature commit with current remote main and retest the resulting SHA. Any third migration or unexplained drift still blocks execution.
- Expected Supabase target: ptosrqkdatrygksyuvpm / postgres / Mumbai; confirm connection identity and current migration history before writing.
- Scope: exactly `20261012000000_product_bilingual_descriptions` (nullable TEXT Product.descriptionKo/descriptionEn, legacy unchanged) and `20261014120000_rate_limit_bucket` (new table/PK/expiry index and its RLS ENABLE only). Rate-limit environment selection stays unchanged.
- No reset/seed/db push, baseline resolve, data backfill, existing role/RLS changes, paid services/new cloud resources, public-signup restriction changes, auth/storage schema or object mutations.
- Complexity medium/high risk: sequential data-safety pipeline, not feature development.

## References and evidence
- `docs/adr/adr-009-prisma-migration-baseline.md` contains existing-history deployment branch; preserve its unrelated dirty content.
- `evidence/supabase-rehearsal/remote-apply-2026-10-04.md`: previous 17 migrations and data-preserving rehearsal.
- `prisma/migrations/20261012000000_product_bilingual_descriptions/migration.sql`, `prisma/schema.prisma`, `docs/work-plans/roadmap.md`.
- Source credentials only from existing private env or authenticated UI; never print or persist secret values outside existing private settings. Backup belongs in ignored state/db-backups; receipts omit personal data and credentials.
- Metis review: exact pending-set/checksum, restore isolation, snapshot concurrency, nondestructive failure handling, deployment SHA confirmation incorporated below.

## TODOs (strict sequence)
- [x] 1. Fresh remote fetch/ancestry and read-only DB preflight: verify approved connection identity, 17 successful migration checksums, no failed/partial rows, pending exactly the two approved migrations, and old schema parity. Integrate six newer security commits preserving all changes, then test/type/lint/build. Reject any third migration or unexplained drift.
- [x] 2. Take a fresh timestamped public-schema custom-format backup using existing postgres:17 tooling. Record backup size/checksum privately and restore into a fresh isolated local rehearsal DB/container, never existing potata_dev. Validate all existing tables/counts/data and structure. Backup does not include auth/storage platform or image objects; do not claim full-platform DR.
- [x] 3. Apply the exact two migrations to the restored copy using normal Prisma migrate deploy. Confirm 19 migrations/current schema parity and all pre-existing column/count equivalence. Only the two columns and new RateLimitBucket table/PK/index/RLS may differ. Existing roles/RLS remain unchanged. Run actual Prisma product/variant/account-safe reads without exposing user data.
- [x] 4. Repeat production target/history preflight; take immediate old-column/count fingerprints. Apply only the two verified migrations. Verify 19 migrations/schema parity, both nullable TEXT columns, new RateLimitBucket RLS, and old rows/descriptions unchanged. New history rows and counter table are expected differences. Investigate concurrent app writes rather than asserting loss or restoring.
- [ ] 5. Only after all data gates pass, push the reconciled and tested release commit to origin/main without force and without unrelated local files. Confirm remote HEAD. Observe automatic Vercel Production deployment, expected source SHA and Ready/domain. Use existing authenticated UI/CLI; do not expose tokens or create paid resources.
- [ ] 6. Production smoke: uncached/new requests for brands and product detail with EN/KO cookie; expected actual DB prices and legacy/fallback description; no hydration/server errors. Verify unauthenticated admin remains blocked. Keep public signup/legal gate and single-account exception unchanged. Do not submit orders or mutate real products/users for smoke.

## Failure and cleanup
- Any backup/restore/preflight/migration failure blocks push. Do not automatically DROP columns or restore over production; additive nullable columns remain backward compatible with old deployment.
- A build/deployment failure after safe migration does not justify data rollback. Preserve old deployment, inspect exact failure, and report if new scope/authority is needed.
- Rehearsal containers/ports created by this run: stop after verification; preserve private backup. Keep existing dev DB/server running. No broad Docker/WSL shutdown.
- Capture sanitized receipts under evidence/bilingual-production-release; keep raw DB data/backups/private temp env under ignored state. Record exact checks, limitations and deployed SHA.

## Final verification
- [ ] Goal/scope: exact migration and release SHA, no extra changes.
- [ ] Data safety: restore verified, old columns/rows preserved, no unexplained drift.
- [ ] Deployment/QA: Ready SHA/domain and EN/KO/product/admin checks pass; any unavailable authenticated user interaction stated explicitly.
- [ ] Cleanup: private artifacts excluded from Git, temporary test resources stopped, dirty user files preserved. No new receipt commit/push unless needed and within approved release documentation scope.
