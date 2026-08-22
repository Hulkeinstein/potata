# OOTD Comments + Notifications

## TL;DR
> **Summary**: Keep the locally completed deployment/email work visible as an external waitlist, then add OOTD comments and in-app `COMMENT`/`LIKE` notifications end to end without touching production infrastructure.
> **Deliverables**: waitlist documentation, additive Prisma migration, comment and notification APIs, feed counts, collapsible card comments, `/notifications`, tests, local DB/browser evidence
> **Effort**: Large (multi-module, medium complexity)
> **Parallel**: YES — 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Tasks 3/4/5 -> Tasks 6/7 -> Task 8 -> Final Verification

## Context

### Original Request

- Record domain/Resend/production deployment as blocked on external configuration while preserving the completed local-readiness record.
- Implement the next roadmap item: OOTD comments plus notifications.
- Include `COMMENT` and `LIKE` notifications, source-FK cleanup, and self-action exclusion.
- Provide public paginated comment reads, authenticated create, owner-only delete, authenticated notification list/read-all, feed `commentCount`, collapsible comment UI, and a `/notifications` page reached from the existing mypage link.
- Use only the local development DB and tests. Do not access production DB, deploy, push, or configure external services.

### Repository Findings

- `prisma/schema.prisma:9-31,158-192` owns the current `User`, `OOTDPost`, `OOTDLike`, and `OOTDPostProduct` relations. OOTD children consistently use `onDelete: Cascade` and explicit indexes/unique constraints.
- `app/api/ootd/route.ts:99-153` is the public cursor-paginated feed and already maps `_count.likes` plus viewer-specific `isLiked` into `OOTDFeedItem`.
- `app/api/ootd/[id]/like/route.ts:6-42` is the authenticated, idempotent like toggle. It must become transactional so the source like and its notification cannot diverge.
- `app/api/ootd/[id]/route.ts` is the owner-only post-delete path; post cascade deletion must also remove comments and notifications.
- `app/api/ootd/route.test.ts` and `app/api/ootd/[id]/like/route.test.ts` establish the hoisted Vitest mocks, fake request helpers, auth gates, and response assertions to copy.
- `types/index.ts:162-182,233-238` is the shared API contract SSoT for OOTD and `ApiResponse<T>`.
- `components/ootd/WhatToWearClient.tsx:23-105,190-290` owns feed state, auth prompting, optimistic likes, and each masonry card. Comments belong inside the card rather than a new detail route.
- `app/mypage/page.tsx:21-26` already links “Notifications” to `/notifications`; only the destination and route protection are missing.
- `middleware.ts:23-40` currently protects `/mypage` and `/liked`; `/notifications` must be added to both `protectedPaths` and `config.matcher`.
- `.github/workflows/ci.yml` already runs Prisma generate, typecheck, lint, migrations on ephemeral PostgreSQL, schema parity, production build, and tests. No CI policy expansion is required.
- `README.md:46-77`, `docs/work-plans/roadmap.md:17-28,98-103`, and `.claude/rules/session.md:9-19` contain the local-readiness and external-deployment status that must remain consistent.

### Decisions (gap analysis incorporated)

- Comments are flat only; replies, editing, mentions, reactions, moderation, and realtime are out of scope.
- Comment content is trimmed, required, and limited to 500 Unicode code units. Invalid JSON/content returns `400`; a missing post/comment returns `404`.
- Comment GET is public and cursor-paginated at 20 rows, newest first (`createdAt desc`, `id desc`), with opaque `id` cursor and `nextCursor`. The UI labels pagination “Load older”.
- A notification records `recipientId`, `actorId`, `postId`, `type`, `readAt`, timestamps, and exactly one nullable source FK (`sourceLikeId` or `sourceCommentId`). Each source field is `@unique` and `onDelete: Cascade`; post/user deletion also cascades. Application code and a SQL `CHECK` constraint enforce source/type pairing.
- Notification creation occurs only when actor and recipient differ. Like removal and comment deletion remove their notifications automatically through the source FK. Like/create-comment and notification creation are one Prisma transaction.
- `LIKE` notification is created only when the like row is newly inserted; toggling off never creates one. `create` is used inside a transaction, with Prisma unique-conflict recovery that re-reads/toggles deterministically rather than `createMany`, because the created source ID is required.
- Notification list is cursor-paginated at 20, newest first, and returns actor plus post preview. `PATCH /api/notifications/read-all` sets `readAt` only where it is currently null; no per-item read endpoint or navbar badge.
- The notification page calls read-all only after a successful first list response and then updates local state. Failed read-all leaves items visibly unread and shows a retryable error.
- Tests follow TDD (RED -> GREEN -> REFACTOR) with existing Vitest route/component patterns; the local migration and browser flow are required integration evidence.

## Work Objectives

### Core Objective

Deliver a locally usable OOTD participation loop: visitors can read comments, authenticated users can comment/delete their own comments and like posts, post owners receive durable in-app notifications for other users’ actions, and recipients can inspect and clear those notifications.

### Definition of Done

- The migration is additive, applies to the designated local development DB, and CI schema parity remains clean.
- Public comment reads, authenticated comment writes/deletes, like/comment notification generation, self-action exclusion, source deletion cleanup, and read-all behavior have automated coverage.
- OOTD feed responses include `commentCount`; each card can expand/collapse comments and supports create/delete/load-older states.
- The existing mypage Notifications link reaches an authenticated, functional notification page.
- `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build`, migration status, and schema parity pass using local-only configuration.
- Browser QA proves two-user comment/like notification flows and records screenshots/logs without sending email or touching external systems.

### Must NOT Have

- No navbar badge, unread counter outside `/notifications`, follow notifications, realtime transport, email notification, push notification, comment replies/editing, or admin moderation.
- No Resend/domain/account setup, production environment edits, production DB commands, deployment, commit, or push.
- No `prisma db push`, `migrate reset`, baseline replay, seed against production, or migration history resolution.
- Do not expose emails, password hashes, connection strings, secrets, or raw internal errors in API responses/evidence.

## Verification Strategy

- **Test decision**: TDD with Vitest 4 and Testing Library where UI behavior needs coverage.
- **DB policy**: migration apply is allowed only after verifying the target is the existing Potata local development PostgreSQL. Log database name/host only; redact credentials.
- **Evidence**: place command output and screenshots under `evidence/ootd-comments-notifications/`; do not commit secrets or `.env.local`.
- Every implementation task includes one happy path and one failure/edge scenario.

## Execution Strategy

### Parallel Execution Waves

- **Wave 1**: Task 1 (documentation boundary), Task 2 (schema/migration/contracts).
- **Wave 2**: Task 3 (comments API), Task 4 (like notifications), Task 5 (notification APIs/feed count), after Task 2.
- **Wave 3**: Task 6 (comment UI), Task 7 (notifications page/protection), after their API dependencies.
- **Wave 4**: Task 8 (local migration, full gates, browser QA), after all implementation.

### Dependency Matrix

| Task | Blocked by | Blocks |
|---|---|---|
| 1 | none | 8 |
| 2 | none | 3, 4, 5, 8 |
| 3 | 2 | 6, 8 |
| 4 | 2 | 8 |
| 5 | 2 | 6, 7, 8 |
| 6 | 3, 5 | 8 |
| 7 | 5 | 8 |
| 8 | 1-7 | Final Verification |

## TODOs

- [x] 1. Move external production readiness to a waitlist SSoT

  **What to do**:
  - Update `docs/work-plans/roadmap.md` so domain verification, Resend live delivery, production baseline approval, Vercel/Supabase/Google/Replicate configuration, and deployment are grouped under an explicit **External waitlist** state.
  - Preserve and link the already completed local evidence: local PostgreSQL baseline/seed, preview signup-verification-login, production build, and ephemeral-Postgres CI pipeline.
  - Update the short current-state sentence in `.claude/rules/session.md` to say feature work continues while external deployment is waiting on owner-provided access/settings.
  - In `README.md`, keep Deployment readiness intact and add a compact status note pointing to the roadmap waitlist. Do not duplicate operational procedures from ADR-009.

  **Must NOT do**: Do not mark any external console item complete and do not remove required production safeguards.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8 | Blocked By: none

  **References**:
  - `docs/work-plans/roadmap.md:17-28,98-103` — current config/ops prerequisites and next-candidate section.
  - `README.md:46-77` — locally verified versus operator-provided/external-console evidence.
  - `.claude/rules/session.md:9-19` — concise session SSoT.
  - `docs/adr/adr-009-prisma-migration-baseline.md` — production baseline procedure remains authoritative.

  **Acceptance Criteria**:
  - [ ] `rg -n "waitlist|대기|Locally verified|로컬" README.md docs/work-plans/roadmap.md .claude/rules/session.md` clearly distinguishes completed local work from blocked external work.
  - [ ] The docs explicitly retain “no production DB/deploy without separate approval”.

  **QA Scenarios**:
  ```text
  Scenario: Local readiness remains discoverable
    Tool: rg + document review
    Steps: Search the three SSoT files for baseline, preview email flow, CI, Resend, and production deploy.
    Expected: Local items are complete; domain/live email/production items are waitlisted and unchecked.
    Evidence: evidence/ootd-comments-notifications/task-1-waitlist.txt

  Scenario: No false completion claim
    Tool: rg
    Steps: Search checked list items near Resend/domain/deployment language.
    Expected: No text claims live delivery or production deployment succeeded.
    Evidence: evidence/ootd-comments-notifications/task-1-waitlist-negative.txt
  ```

  **Commit**: NO | Files: `README.md`, `docs/work-plans/roadmap.md`, `.claude/rules/session.md`

- [x] 2. Add additive comment/notification schema, migration, and shared contracts

  **What to do**:
  - Extend `User` with named relations for authored comments, received notifications, and acted notifications. Extend `OOTDPost` with comments and notifications; extend `OOTDLike` with optional one-to-one notification.
  - Add `NotificationType { COMMENT LIKE }`.
  - Add `OOTDComment`: `id cuid`, `postId`, `userId`, `content Text`, `createdAt`; cascade relations; indexes `[postId, createdAt, id]` and `[userId]`.
  - Add `Notification`: `id cuid`, `recipientId`, `actorId`, `postId`, `type`, `sourceCommentId? @unique`, `sourceLikeId? @unique`, `readAt?`, `createdAt`; named User relations; all source/post/user relations `onDelete: Cascade`; indexes `[recipientId, createdAt, id]` and `[recipientId, readAt]`.
  - After parsing `.env.local` into the current PowerShell process without printing values and confirming `DIRECT_URL` is `127.0.0.1`/`localhost` and DB `potata_dev`, run `New-Item -ItemType Directory -Path prisma/migrations/20260821120000_ootd_comments_notifications` and then generate exactly its `migration.sql` with `npx prisma migrate diff --from-url "$env:DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script --output prisma/migrations/20260821120000_ootd_comments_notifications/migration.sql`. This command reads the verified local DB and writes SQL only; it does not apply it and needs no shadow DB. Inspect its SQL and add a named `CHECK` constraint requiring `COMMENT` + only `sourceCommentId`, or `LIKE` + only `sourceLikeId`.
  - Add exact response/request contracts in `types/index.ts`:
    - `OOTDCommentItem = { id: string; postId: string; content: string; createdAt: string; author: { id: string; name: string; handle: string | null; avatar: string | null }; isMine: boolean }`.
    - `OOTDCommentPage = { items: OOTDCommentItem[]; nextCursor: string | null }`; `nextCursor` is the last returned id only when 20 rows were returned, otherwise null.
    - `OOTDCommentCreateRequest = { content: string }`.
    - `NotificationItem = { id: string; type: "COMMENT" | "LIKE"; readAt: string | null; createdAt: string; actor: { id: string; name: string; handle: string | null; avatar: string | null }; post: { id: string; imageUrl: string | null; caption: string | null } }`.
    - `NotificationPage = { items: NotificationItem[]; nextCursor: string | null; unreadCount: number }`; `nextCursor` follows the same 20-row rule.
    - `NotificationReadAllData = { updatedCount: number }`; extend `OOTDFeedItem.commentCount: number`.
  - Run schema generation only; defer DB apply to Task 8.

  **Must NOT do**: No destructive SQL, no baseline edits, no production apply, no parent comments, no denormalized notification message text.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3, 4, 5, 8 | Blocked By: none

  **References**:
  - `prisma/schema.prisma:9-31` — User relation ownership and named-relation precedent.
  - `prisma/schema.prisma:158-192` — OOTD cascade/index/unique conventions.
  - `prisma/migrations/00000000000000_baseline/migration.sql` — PostgreSQL naming/DDL style only; do not edit.
  - `types/index.ts:162-182,233-238` — OOTD and API contract placement.

  **Acceptance Criteria**:
  - [ ] `npx prisma validate` and `npx prisma generate` pass with local env loaded.
  - [ ] Migration SQL contains only additive enum/table/index/FK/check operations; `rg -ni "DROP|TRUNCATE|DELETE FROM|ALTER .* DROP" prisma/migrations/*ootd_comments_notifications*/migration.sql` returns no match.
  - [ ] The SQL CHECK prevents null/both/wrong source-type combinations.

  **QA Scenarios**:
  ```text
  Scenario: Schema and migration are reproducible
    Tool: PowerShell + Prisma CLI
    Steps: Validate/generate; diff the migration-applied shadow schema to schema.prisma using an isolated local empty DB or CI-equivalent DB.
    Expected: Commands exit 0 and diff is empty.
    Evidence: evidence/ootd-comments-notifications/task-2-schema.txt

  Scenario: Invalid source pairing is rejected
    Tool: psql against isolated local test DB
    Steps: Attempt a COMMENT notification with only sourceLikeId after prerequisite rows are inserted in a transaction that is rolled back.
    Expected: PostgreSQL CHECK violation; no row persists.
    Evidence: evidence/ootd-comments-notifications/task-2-check-constraint.txt
  ```

  **Commit**: NO | Files: `prisma/schema.prisma`, `prisma/migrations/<timestamp>_ootd_comments_notifications/migration.sql`, `types/index.ts`

- [x] 3. Build public comment pagination and authenticated create/delete APIs with TDD

  **What to do**:
  - Add `app/api/ootd/[id]/comments/route.ts` with public `GET` and authenticated `POST`.
  - `GET`: verify post existence, accept optional cursor, fetch 20 comments newest-first with `take: 20`, `cursor`, `skip: 1`, deterministic `[createdAt desc, id desc]`, and select only author public fields. Perform optional auth once and map `isMine = session?.user?.id === comment.user.id`; anonymous callers always receive `isMine:false`. Return `OOTDCommentPage`, `404` for missing post, and `400 { success:false, error:"Invalid cursor" }` when the cursor does not exist or belongs to another post (pre-validate with `findFirst({where:{id:cursor,postId}})`).
  - `POST`: auth first; parse JSON safely; require a string whose trimmed length is `1..500`; verify post and select owner ID; in one `$transaction`, create the comment then create a `COMMENT` notification only when author differs from post owner. Return the mapped comment with `201`.
  - Add `app/api/ootd/[id]/comments/[commentId]/route.ts` `DELETE`: auth first, fetch comment constrained to `postId`, return `404` when absent, `403` unless author, then delete. Source cascade removes its notification.
  - Add route tests before implementation and cover transaction input, selected fields, cursor, auth, validation, ownership, self-exclusion, and DB failures.

  **Must NOT do**: Never trust request user IDs; never expose author email; do not allow post owner/admin to delete another user’s comment in this MVP.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 8 | Blocked By: 2

  **References**:
  - `app/api/ootd/route.ts:99-159` — cursor parsing, public optional auth, mapping, errors.
  - `app/api/ootd/[id]/route.ts` — owner-delete and route-param handling.
  - `app/api/products/[id]/questions/route.ts` — JSON content validation and public author projection pattern.
  - `app/api/ootd/route.test.ts` — hoisted Prisma/auth mocks and NextRequest helpers.

  **Acceptance Criteria**:
  - [ ] Comment route tests pass and assert `401/400/403/404/201/200` outcomes.
  - [ ] Self-comment creates no notification; another user’s comment creates exactly one source-linked notification in the same transaction.
  - [ ] Delete is constrained by both post and comment IDs and relies on cascade cleanup.

  **QA Scenarios**:
  ```text
  Scenario: Public list and authenticated comment lifecycle
    Tool: curl + local DB query
    Steps: As user B, post “Great layering”; fetch anonymously; delete as user B; fetch again.
    Expected: Create 201, anonymous GET 200 contains public author data, delete 200, subsequent list omits it.
    Evidence: evidence/ootd-comments-notifications/task-3-comment-flow.txt

  Scenario: Unauthorized ownership boundary
    Tool: Vitest + curl
    Steps: Submit whitespace/501 chars; create as B then delete as C; access a missing post/cursor.
    Expected: 400 for invalid content, 403 for non-owner delete, 404 for missing resources, no mutation.
    Evidence: evidence/ootd-comments-notifications/task-3-comment-errors.txt
  ```

  **Commit**: NO | Files: `app/api/ootd/[id]/comments/route.ts`, `app/api/ootd/[id]/comments/route.test.ts`, `app/api/ootd/[id]/comments/[commentId]/route.ts`, `app/api/ootd/[id]/comments/[commentId]/route.test.ts`

- [x] 4. Make like toggles transactionally emit and clean up notifications

  **What to do**:
  - Write failing tests for other-user like notification, self-like exclusion, toggle-off cleanup, missing post, auth, and unique-conflict/retry behavior.
  - Refactor the existing toggle into `prisma.$transaction`: read post owner; read existing like; when existing, delete it (source cascade deletes notification); when absent, create the like and, only for another user’s post, create the source-linked `LIKE` notification.
  - Preserve the exact response `{ postId, liked, likeCount }` and current UI behavior.
  - Handle Prisma `P2002` from simultaneous likes without producing duplicate notifications. The create+notification transaction is attempt 1. Catch `P2002` strictly outside `$transaction` after rollback, then run a separate read transaction containing `findUnique(userId_postId)` plus `count(postId)`; if the like exists, return `{ liked:true, likeCount }` and never toggle/delete it. If it is absent, retry the create+notification transaction exactly once (attempt 2). On a second `P2002`, perform one final separate read transaction and return liked/count if present; if still absent, return `409` retryable error. All response counts are computed after the write transaction commits, never inside a failed transaction.

  **Must NOT do**: Do not notify on unlike, self-like, or a duplicate/race retry. Do not add external messaging.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8 | Blocked By: 2

  **References**:
  - `app/api/ootd/[id]/like/route.ts:6-42` — current toggle contract.
  - `app/api/ootd/[id]/like/route.test.ts` — current assertions to preserve and extend.
  - `app/api/orders/route.ts` — transaction conventions and Prisma error handling.

  **Acceptance Criteria**:
  - [ ] Existing like tests remain green with transaction-aware mocks.
  - [ ] Other-user like yields one `LIKE` notification linked to the created like; self-like yields none.
  - [ ] Unlike deletes the source like and cascade-removes its notification; concurrent duplicate does not emit another row.

  **QA Scenarios**:
  ```text
  Scenario: Like/unlike notification lifecycle
    Tool: curl + Prisma Studio/read-only query
    Steps: User B likes user A’s post, inspect A’s notifications, then B unlikes.
    Expected: One notification appears after like and disappears after unlike; likeCount returns to baseline.
    Evidence: evidence/ootd-comments-notifications/task-4-like-notification.txt

  Scenario: Self and duplicate suppression
    Tool: Vitest
    Steps: Like own post; issue two concurrent first-like requests for another post.
    Expected: No self notification; exactly one like and one notification for the concurrent pair.
    Evidence: evidence/ootd-comments-notifications/task-4-like-edge.txt
  ```

  **Commit**: NO | Files: `app/api/ootd/[id]/like/route.ts`, `app/api/ootd/[id]/like/route.test.ts`

- [x] 5. Add notification list/read-all APIs and feed comment counts with TDD

  **What to do**:
  - Add authenticated `GET app/api/notifications/route.ts`: optional cursor, 20 newest-first ordered exactly by `[{ createdAt: "desc" }, { id: "desc" }]`, recipient constrained to session user, select actor public profile, type, readAt/createdAt, and post preview (`id`, first image/caption); return `NotificationPage`. Pre-validate cursor with `findFirst({where:{id:cursor,recipientId}})` and return `400 { success:false, error:"Invalid cursor" }` when absent or owned by another recipient. `unreadCount` is the recipient's total unread count across all pages, computed with a separate `prisma.notification.count({ where: { recipientId, readAt: null } })` in the same GET; tests must include unread rows outside page 1 and expect the total, not page-local count.
  - Add authenticated `PATCH app/api/notifications/read-all/route.ts`: `updateMany({ where: { recipientId, readAt: null }, data: { readAt: now } })`; return `{ updatedCount }`.
  - Extend feed `_count.select` to include comments and map `commentCount` without changing feed pagination/filtering.
  - Add isolated route/feed tests for auth, user scoping, cursor, mapping, empty lists, idempotent read-all, and error handling.

  **Must NOT do**: No notification data for another recipient, no raw source objects/email fields, no per-item endpoint, badge, or polling.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6, 7, 8 | Blocked By: 2

  **References**:
  - `app/api/ootd/route.ts:99-153` and `app/api/ootd/route.test.ts:128-211` — cursor/list mapping and `_count` tests.
  - `app/api/orders/route.ts` — authenticated list scoping.
  - `types/index.ts:162-182,233-238` — shared response types.

  **Acceptance Criteria**:
  - [ ] Notification GET cannot query outside `recipientId=session.user.id` and returns no sensitive user fields.
  - [ ] Read-all updates unread rows for only the current recipient and returns zero on repeat.
  - [ ] Feed tests assert `commentCount` for logged-out and logged-in responses.

  **QA Scenarios**:
  ```text
  Scenario: Recipient lists and clears notifications
    Tool: curl + DB read-only query
    Steps: Seed mixed read/unread records for A/B; GET and PATCH as A; GET again.
    Expected: A sees only A’s newest 20; only A’s unread rows gain readAt; updatedCount is exact.
    Evidence: evidence/ootd-comments-notifications/task-5-notification-api.txt

  Scenario: Unauthenticated and idempotent behavior
    Tool: Vitest
    Steps: Call both routes without session, then invoke read-all twice as A.
    Expected: Both anonymous calls return 401; second authenticated read-all returns updatedCount 0.
    Evidence: evidence/ootd-comments-notifications/task-5-notification-errors.txt
  ```

  **Commit**: NO | Files: `app/api/notifications/route.ts`, `app/api/notifications/route.test.ts`, `app/api/notifications/read-all/route.ts`, `app/api/notifications/read-all/route.test.ts`, `app/api/ootd/route.ts`, `app/api/ootd/route.test.ts`

- [x] 6. Add collapsible comments to each OOTD card

  **What to do**:
  - Extract `components/ootd/OOTDComments.tsx` so `WhatToWearClient.tsx` remains focused. It receives `postId`, initial `commentCount`, current user ID/status, and a count-change callback.
  - Add a MessageCircle button beside the heart showing `commentCount`. On first expand, fetch page 1; cache while open/closed; support loading, empty, API error + retry, “Load older”, and collapse.
  - Render avatar/name/handle, relative or stable locale date, content, and a delete action only for the current author. Use safe React text rendering.
  - Authenticated submit uses a 500-character controlled textarea/input, trims locally, disables during request, prepends the returned comment, clears input, and increments feed state. Unauthenticated submit calls the existing login confirmation behavior.
  - Delete confirms, removes only after success, and decrements count; failed create/delete leaves state intact and shows inline error.
  - Add Testing Library tests for expansion fetch, public read, login prompt, successful create/delete, pagination append, duplicate-submit prevention, and rollback/error states.

  **Must NOT do**: No automatic fetch for collapsed cards, no nested replies/edit, no optimistic destructive delete, no raw HTML rendering.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 3, 5

  **References**:
  - `components/ootd/WhatToWearClient.tsx:23-105` — feed state and `requireLogin` behavior.
  - `components/ootd/WhatToWearClient.tsx:190-290` — card action layout and responsive masonry constraints.
  - `components/product/QASection.tsx` and `.test.tsx` — list/form states and Testing Library style.
  - `types/index.ts` — consume shared comment contracts, do not redefine them locally.

  **Acceptance Criteria**:
  - [ ] Collapsed cards make no comment request; first expansion loads once and clearly exposes retry on failure.
  - [ ] Count stays synchronized after API create/delete and feed refresh.
  - [ ] Keyboard labels exist for expand/collapse, submit, load older, and delete controls.

  **QA Scenarios**:
  ```text
  Scenario: Comment interaction in a feed card
    Tool: browser + Testing Library
    Steps: Expand a post with 21 comments, load older, submit “Love this fit”, collapse/reopen, delete own comment.
    Expected: Pages append without duplicates; count increments/decrements; cached list survives collapse; controls remain accessible.
    Evidence: evidence/ootd-comments-notifications/task-6-comments-ui.png

  Scenario: Anonymous/network failure
    Tool: browser + mocked fetch test
    Steps: Anonymous user attempts submit; then force GET/POST/DELETE failures.
    Expected: Login prompt for anonymous; retryable inline errors; no count/list corruption.
    Evidence: evidence/ootd-comments-notifications/task-6-comments-ui-error.png
  ```

  **Commit**: NO | Files: `components/ootd/OOTDComments.tsx`, `components/ootd/OOTDComments.test.tsx`, `components/ootd/WhatToWearClient.tsx`, `types/index.ts`

- [x] 7. Implement the protected notifications page behind the existing mypage link

  **What to do**:
  - Add `/notifications` to `middleware.ts` protected path logic and matcher.
  - Add `app/notifications/page.tsx` as a client page consistent with the black/zinc mypage styling. Fetch `GET /api/notifications`, show skeleton/empty/error+retry, and append older pages.
  - Render clear `COMMENT`/`LIKE` text from typed fields (not stored message text), actor avatar/name, timestamp, post thumbnail, unread visual state, and a link to `/what-to-wear` (the app has no post-detail route; do not invent one).
  - After the first successful list, call read-all once. On success, mark current items read; on failure, retain unread styling and show a “Mark all as read” retry button.
  - Add component tests and a middleware test if none exists; otherwise extend the existing middleware test.

  **Must NOT do**: No navbar changes/badge, no redirect to nonexistent post detail, no anonymous API fallback, no automatic repeated PATCH loop.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 5

  **References**:
  - `app/mypage/page.tsx:21-26,107-130` — existing destination link and visual language.
  - `middleware.ts:6-40` — auth redirect with callback URL and matcher convention.
  - `app/mypage/orders/page.tsx` — authenticated list page/empty state pattern.

  **Acceptance Criteria**:
  - [ ] Anonymous `/notifications` redirects to `/login?callbackUrl=/notifications`.
  - [ ] Logged-in empty/populated/error states render deterministically; successful first load triggers exactly one read-all request.
  - [ ] Read-all failure is visible and retryable, not silently treated as read.

  **QA Scenarios**:
  ```text
  Scenario: Mypage-to-notifications flow
    Tool: browser + Testing Library
    Steps: As recipient A, open mypage Notifications, inspect COMMENT/LIKE rows, load older.
    Expected: Destination is not 404; typed messages and actor/post previews render; unread styles clear after successful PATCH.
    Evidence: evidence/ootd-comments-notifications/task-7-notifications.png

  Scenario: Auth and read-all failure
    Tool: browser + mocked fetch test
    Steps: Visit logged out; then logged in with PATCH returning 500.
    Expected: Logged-out redirect preserves callback; PATCH failure keeps unread styles and offers one explicit retry.
    Evidence: evidence/ootd-comments-notifications/task-7-notifications-error.png
  ```

  **Commit**: NO | Files: `app/notifications/page.tsx`, `app/notifications/page.test.tsx`, `middleware.ts`, `middleware.test.ts` (new only if absent)

- [x] 8. Apply only to local development DB and execute full automated/browser verification

  **What to do**:
  - Before any migration command, inspect `.env.local` without printing values; establish that host is loopback/local container and database is the Potata development DB. Stop if host/project identity could be production.
  - Apply the new migration with `npm run db:migrate:deploy` (not `migrate dev` after artifact generation), then run status and schema parity against that same local DB.
  - Run all quality gates. Preserve the running local app/data; restart the dev server only if Prisma client generation or schema reload requires it.
  - Create two disposable local users and one OOTD post using existing safe local mechanisms. Perform browser QA: B comments/likes A’s post; A sees two notifications; B’s own post actions generate none; B deletes comment/unlikes and A’s source notifications disappear; read-all behaves idempotently.
  - Clean only disposable QA rows through normal app/API paths. Do not delete the local DB or existing user data.

  **Must NOT do**: Stop immediately on a non-local DB identity. Do not use `db push`, reset, resolve, production credentials, external email, deployment, commit, or push.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: 1-7

  **References**:
  - `docs/adr/adr-009-prisma-migration-baseline.md` — migration safety/production prohibition.
  - `.github/workflows/ci.yml` — canonical gate ordering and ephemeral DB parity command.
  - `README.md:13-43` — local setup and quality commands.
  - Existing running local E2E environment — reuse local PostgreSQL and dev-only auth preview; do not enable Resend.

  **Acceptance Criteria**:
  - [ ] `npm run db:migrate:status` reports all migrations applied on the verified local DB.
  - [ ] `npx prisma migrate diff --from-url "$env:DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code` exits 0 with empty diff in PowerShell.
  - [ ] `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`, `npm run lint`, `npm run test`, and `npm run build` pass; known pre-existing warnings are separately identified.
  - [ ] Browser QA proves comment/like notification creation, self-exclusion, cleanup, read-all, and responsive/mobile layout.

  **QA Scenarios**:
  ```text
  Scenario: Two-user end-to-end social loop
    Tool: browser + local PostgreSQL read-only queries
    Steps: A owns post; B comments and likes; A opens notifications; A marks read; B deletes comment and unlikes.
    Expected: Counts/UI and two notification rows appear, readAt updates, then source-linked rows are removed without orphans.
    Evidence: evidence/ootd-comments-notifications/task-8-e2e.png and task-8-db.txt

  Scenario: Local-only safety gate
    Tool: PowerShell
    Steps: Inspect parsed host/database identity before migration and scan git diff/status afterward.
    Expected: Only loopback development DB touched; `.env.local` untracked/ignored; no production/external changes or secret text in diff/evidence.
    Evidence: evidence/ootd-comments-notifications/task-8-safety.txt
  ```

  **Commit**: NO | Files: no new product files beyond Tasks 1-7; evidence remains local unless project policy explicitly tracks it

## Final Verification Wave

> Run only after Tasks 1-8. All reviewers must approve; fixes repeat the affected gates.

- [x] **F1. Plan compliance audit** — verify every requested deliverable and exclusion against `git diff --name-only` and this plan; ensure waitlist wording preserves local readiness.
- [x] **F2. Code quality/security review** — inspect auth-first ordering, recipient/owner constraints, public projections, transactions, race handling, SQL CHECK, cascade graph, and error sanitization.
- [x] **F3. Real manual QA** — repeat the two-user browser scenario at desktop and narrow mobile width; capture visible comment and notification states.
- [x] **F4. Scope fidelity** — confirm no navbar badge, follow/realtime/email notification, external service edit, production DB access, deploy, commit, or push occurred.

## Commit Strategy

- This execution must not commit or push. Keep changes reviewable in the working tree.
- Recommended later split, only after explicit approval: `docs(roadmap): waitlist external deployment setup`; `feat(social): add ootd comments and notifications`; `test(social): cover comment notification flows`.
- Never include `.env.local`, evidence containing credentials, local DB volumes, or generated runtime logs.

## Success Criteria

- Users can publicly browse comments and authenticated users can create/delete their own comments from a collapsible OOTD card.
- Another user’s new comment or like creates exactly one durable notification for the post owner; self-actions create none; removing the source removes the notification.
- Authenticated recipients can page through notifications and reliably mark all unread rows read.
- Feed counts, API types, Prisma schema/migration, UI, tests, and CI parity remain consistent.
- All work is proven locally with no external-service, production, deployment, or Git remote mutation.
