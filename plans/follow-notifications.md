# Follow Notifications

## TL;DR
> **Summary**: Existing follow toggles create one durable, source-linked FOLLOW notification for the followed user and feed the current notification list/read-all/Navbar badge flow.
> **Deliverables**: additive Prisma migration, atomic follow/notification API, discriminated notification contract, FOLLOW list UI, TDD coverage, local desktop/mobile QA
> **Effort**: Medium
> **Parallel**: NO — schema, API, contract, and UI are a dependency chain
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

## Context

### Original Request
- Plan first, then immediately implement and verify FOLLOW notifications without external services, production DB, deployment, or push.

### Research Summary
- `Follow` already has a unique `(followerId, followingId)` pair and cascade user relations.
- `Notification` currently requires an OOTD post and supports only COMMENT/LIKE source rows.
- The follow endpoint uses `findUnique` plus `delete/createMany`; it is not transactional and cannot source-link a newly created row.
- Notification GET/read-all and the Navbar unread badge already share one recipient-scoped table and need no new transport.

### Metis Review (gaps addressed)
- Exact database invariants, concurrent create/delete behavior, re-follow policy, nullable post contract, legacy null-handle fallback, migration parity, and ordered browser QA are fixed below.

## Work Objectives

### Core Objective
When A follows B, B receives exactly one unread FOLLOW notification linked to that Follow row. Unfollowing removes it by cascade; re-following creates one fresh notification. B can discover it in the Navbar, read it in `/notifications`, and navigate to A's public profile when A has a handle.

### Definition of Done
- New local migration is additive except for the named CHECK replacement and `postId` nullability.
- Concurrent duplicate follow/unfollow requests never produce duplicate rows/notifications or a 500; responses reflect committed state.
- Existing auth, self-follow, missing-target, and session-owned actor protections remain.
- COMMENT/LIKE list behavior and all unread/read-all/Navbar behavior remain green.
- `prisma validate/generate`, typecheck, lint, full tests, production build, and local desktop/mobile QA pass.

### Must Have
- `FOLLOW` enum value, `sourceFollowId @unique`, FK cascade, exact three-branch CHECK.
- Follow mutation and notification creation in one transaction.
- FOLLOW list text/icon and safe profile navigation.
- RED→GREEN evidence before production changes.

### Must NOT Have
- Follow suggestions, follower list, realtime/email/push, notification preferences, per-item reads, rate limiting, or unrelated social features.
- External services, production DB commands, deployment, commit, or push.
- Any table/column/data drop; only the existing named CHECK may be dropped and recreated.

## Verification Strategy
- Test decision: TDD with Vitest and Prisma mock contracts, then local PostgreSQL/browser QA.
- Every implementation task includes a failing test or invariant check before production changes.
- Temporary users/rows are local-only and deleted after QA.

## Execution Strategy

| Task | Depends on | Blocks |
|---|---|---|
| 1. Schema/migration | — | 2, 3 |
| 2. Atomic follow API | 1 | 3, 5 |
| 3. Notification contract/API | 1, 2 | 4, 5 |
| 4. Notification UI/badge regression | 3 | 5 |
| 5. Full verification/QA | 1–4 | Final wave |

## TODOs

- [x] 1. Add the exact FOLLOW notification database invariant

  **What to do**: Write RED schema/migration assertions first. Extend `Follow` with an optional notification relation; extend `NotificationType` with FOLLOW; make `postId/post` nullable; add unique nullable `sourceFollowId/sourceFollow` with cascade. Commit the enum value in `20260822130000_follow_notifications`, then apply post nullability, source column, named CHECK replacement, unique index, and FK in `20260822130100_follow_notification_invariant` because PostgreSQL rejects use of a new enum value before its transaction commits. CHECK branches must be exact: COMMENT=(post+comment only), LIKE=(post+like only), FOLLOW=(follow only and no post). Existing rows must remain valid.

  **Must NOT do**: apply anything to production, edit the baseline migration, drop data/table/column, or permit mixed sources.

  **References**: `prisma/schema.prisma:39-48,190-227`; `prisma/migrations/20260821120000_ootd_comments_notifications/migration.sql:1-35`.

  **Acceptance Criteria**:
  - [ ] `prisma validate` and `prisma generate` pass.
  - [ ] SQL contains only the expected enum/nullable column/source FK/index/CHECK operations.
  - [ ] Empty local DB migration deploy/status succeeds; invalid source/type combinations fail the CHECK.

  **QA Scenarios**:
  - Happy: migrate an ephemeral/local empty DB, insert valid COMMENT/LIKE/FOLLOW rows, expect success.
  - Edge: insert FOLLOW with post or COMMENT without post/source, expect `Notification_type_source_check` rejection.

  **Commit**: NO | Files: `prisma/schema.prisma`, the two `2026082213*` migration SQL files, schema/migration tests

- [x] 2. Make follow toggles transactionally create and remove notifications

  **What to do**: Add RED route tests for transaction creation, duplicate `createMany` count 0, stale concurrent delete, re-follow, auth/self/404/IDOR. Move the mutation decision into `prisma.$transaction`. For create: `createMany(skipDuplicates)` and create FOLLOW notification only when count=1 after reading the created Follow by unique pair. For count=0, create no notification and read committed state. For delete: use pair-constrained `deleteMany` so a stale delete is not P2025; source cascade removes notification. Count and returned `following` must describe the committed state. Re-follow creates a fresh source and one fresh notification.

  **Must NOT do**: accept actor from body, explicitly delete notification rows, notify self, or claim ordering semantics stronger than committed-state/no-duplicate guarantees.

  **References**: `app/api/users/[id]/follow/route.ts`; its test; `app/api/ootd/[id]/like/route.ts` transaction/source pattern.

  **Acceptance Criteria**:
  - [ ] New follow creates one Follow and one `{type:"FOLLOW", recipientId:target, actorId:session, sourceFollowId}` in one transaction.
  - [ ] Duplicate concurrent create and stale delete return 200 without duplicate notification or 500.
  - [ ] Unfollow cascades the source-linked notification; auth/self/404/IDOR tests remain green.

  **QA Scenarios**:
  - Happy: A follows B, verify one pair and one unread notification; A unfollows, verify both removed; A re-follows, verify one fresh pair/notification.
  - Edge: run two create-intent competitors and two stale deletes, expect at most one pair/notification and no 500.

  **Commit**: NO | Files: `app/api/users/[id]/follow/route.ts`, `app/api/users/[id]/follow/route.test.ts`

- [x] 3. Extend the recipient-scoped notification contract and API

  **What to do**: Add RED GET tests for FOLLOW with `post:null`, unread count, cursor ownership, and actor public-field whitelist. Model `NotificationItem` as a discriminated union: COMMENT/LIKE require a post preview; FOLLOW has `post:null`. Select nullable post and map without unchecked access.

  **Must NOT do**: expose email/password/private fields, return another recipient's rows, or weaken cursor validation.

  **References**: `types/index.ts:201-214`; `app/api/notifications/route.ts`; `app/api/notifications/route.test.ts`.

  **Acceptance Criteria**:
  - [x] FOLLOW serializes with actor `{id,name,handle,avatar}` and `post:null`.
  - [x] COMMENT/LIKE retain required post previews and cursor/unread recipient scoping.

  **QA Scenarios**:
  - Happy: recipient GET returns FOLLOW and counts it unread.
  - Edge: foreign cursor remains 400 and no private actor data appears.

  **Commit**: NO | Files: `types/index.ts`, `app/api/notifications/route.ts`, `app/api/notifications/route.test.ts`

- [x] 4. Render FOLLOW notifications and preserve Navbar/read-all behavior

  **What to do**: Add RED page tests for FOLLOW copy, icon semantics, profile href, null-handle fallback, and COMMENT/LIKE regression. Render “{actor}님이 회원님을 팔로우했습니다.” with a user-plus icon. If handle exists, link the row to `/profile/{encoded handle}`; otherwise render a non-link row. Keep COMMENT/LIKE linked to `/what-to-wear`. Keep read-all dispatch and the existing accessible Navbar badge unchanged, with regression tests confirming FOLLOW counts are surfaced and hidden after read-all.

  **Must NOT do**: redesign Navbar/page, create a user-id profile URL, add polling, or add new navigation surfaces.

  **References**: `app/notifications/page.tsx`; its test; `components/ui/NotificationNavLink.tsx`; `components/ui/Navbar.test.tsx`; `app/profile/[handle]/page.tsx`.

  **Acceptance Criteria**:
  - [x] FOLLOW copy/icon/link and null-handle fallback are accessible at desktop/mobile widths.
  - [x] COMMENT/LIKE copy, previews, read-all retry, badge 0-hide and 99+ behavior remain green.

  **QA Scenarios**:
  - Happy: FOLLOW row links to actor profile and opening notifications clears unread badge.
  - Edge: legacy actor with null handle renders readable, non-broken non-link content.

  **Commit**: NO | Files: `app/notifications/page.tsx`, `app/notifications/page.test.tsx`, Navbar regression tests only if needed

- [x] 5. Run full local verification and desktop/mobile two-user QA

  **What to do**: Apply the migration only to the confirmed localhost development DB. Run focused tests, Prisma validation/generation/status, typecheck, full lint/tests, and production build. With disposable A/B users, verify desktop and 390px mobile: A follows B → B sees badge 1 → B opens notifications and sees FOLLOW → badge/read marker clear → profile CTA opens A → A unfollows and notification disappears → re-follow creates one new row. Confirm self-follow creates nothing. Clean fixtures and temporary viewport/state.

  **Must NOT do**: touch production/external accounts, leave fixture data, deploy, commit, or push.

  **Acceptance Criteria**:
  - [x] All automated gates pass and browser has no new runtime/hydration errors.
  - [x] DB inspection proves create/read/unfollow cleanup/re-follow and fixture cleanup.

  **Completion Evidence**: Prisma validate/generate/status, local and ephemeral-empty-DB deploy, exact CHECK rejection and cascade probes, typecheck, lint, 359 tests, and production build passed. Two disposable users verified follow state, FOLLOW copy and encoded profile link at 390px; responsive desktop behavior is covered by the shared component tests. QA users, temporary DB, viewport, logs, and dev server were removed.

  **QA Scenarios**:
  - Happy: ordered badge→list→read-all→profile flow passes on desktop and mobile.
  - Edge: self-follow/duplicate requests create no invalid or duplicate notification.

  **Commit**: NO | Files: evidence only if already tracked; no external state

## Final Verification Wave

- [x] F1. Plan compliance audit: map every requested behavior and exclusion to diff/tests/evidence.
- [x] F2. Code quality/security review: transaction races, IDOR, CHECK invariant, private-field scope, file-size audit.
- [x] F3. Real manual QA: repeat desktop/mobile flow and inspect console/runtime state.
- [x] F4. Scope fidelity: confirm no new social feature, external service, production DB, deploy, commit, or push.

## Commit Strategy
- No commit or push in this task. Preserve prior Navbar badge work and unrelated user files.

## Success Criteria
- Follow/unfollow lifecycle owns exactly one source-linked FOLLOW notification without duplicates or orphan rows.
- Recipients discover, read, and navigate from FOLLOW notifications through existing protected surfaces.
- All automated and real local QA gates pass with temporary state removed.
