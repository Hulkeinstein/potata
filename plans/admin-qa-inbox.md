# Admin Q&A Inbox

## TL;DR
> **Summary**: 기존 상품 Q&A와 admin 답변 API를 재사용해, 운영자가 미답변 문의를 찾아 답변·수정할 수 있는 관리자 inbox를 만든다.
> **Deliverables**: admin 읽기 API와 안전한 DTO, `/admin/questions` 화면, navigation/dashboard 진입점, 자동·브라우저 검증.
> **Effort**: Medium
> **Parallel**: YES — 2 waves
> **Critical Path**: read contract → inbox UI → navigation/dashboard 연결 → 검증

## Context

### Original Request

로드맵의 다음 내부 작업인 관리자 Q&A inbox를 구현한다. 기존 Q&A 기능과 겹치지 않으며, 미답변 문의를 운영자가 처리할 수 있어야 한다.

### Interview Summary

- Question과 Answer는 이미 존재하며 Question 하나에 여러 Answer가 가능하다.
- 답변의 생성·수정 API는 admin 검증과 product → question → answer 부모 경로 검증을 이미 수행한다.
- 대시보드는 답변이 0개인 Question을 미답변으로 집계하지만, 연결된 inbox와 관리자 목록 API는 없다.
- 테스트 전략은 Vitest TDD와 로컬 관리자 브라우저 QA다.

### Metis Review (gaps addressed)

- `answered` 컬럼을 새로 만들지 않는다. 답변 1개 이상이면 answered로 분류한다.
- 고객 이메일·비밀번호·내부 필드는 DTO에서 절대 반환하지 않는다.
- admin layout만 신뢰하지 않고 읽기 API에서도 auth와 admin allowlist를 검증한다.
- 이미 검증된 답변 mutation을 중복 구현하지 않는다.
- inactive 상품의 문의도 admin inbox에는 남기고, 고객용 product 링크와 admin 편집 링크를 함께 제공한다.

## Work Objectives

### Core Objective

운영자가 `/admin/questions`에서 미답변 Q&A를 먼저 보고, 상품·작성자·질문 본문으로 검색하며, 기존 안전한 API를 통해 답변을 작성·수정할 수 있게 한다.

### Deliverables

- admin 전용 paginated Q&A read contract와 `/api/admin/questions` GET
- `/admin/questions` server page와 client inbox
- status(`unanswered`, `answered`, `all`)·검색·페이지네이션
- admin answer create/edit UI와 정확한 refresh/error 경계
- Q&A AdminNav 항목 및 dashboard 미답변 카드 링크

### Definition of Done

- `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`가 통과한다.
- 비관리자 `/admin/questions`와 `/api/admin/questions` 접근은 fail-closed다.
- 미답변 질문만 첫 진입 기본 목록에 표시되고, 답변 성공 후 동일 화면에서 answered 상태가 반영된다.
- desktop 1280×900과 mobile 390×844에서 검색·필터·답변·수정·빈 상태·오류 상태가 확인된다.

### Must Have

- 서버가 검증한 admin scope
- 페이지/검색 파라미터 allowlist와 범위 제한
- customer email 비노출 DTO
- question 삭제 등 동시 변경 시 재조회 가능한 오류 처리

### Must NOT Have

- Question/Answer schema migration 또는 별도 status 컬럼
- 이메일·푸시 알림, assignment/SLA, AI 자동답변, 고객 질문 편집/삭제
- 답변 삭제를 inbox MVP에 노출
- 주문·결제·쿠폰·포인트·재고 데이터 변경

## Verification Strategy

- Test decision: TDD with Vitest.
- Every task includes route/component tests and agent-executed QA.
- Evidence: `evidence/admin-qa-inbox/`에 API·desktop·mobile 결과를 저장한다.

## Execution Strategy

### Parallel Execution Waves

| Wave | Tasks | Dependency |
|---|---|---|
| 1 | 1 read contract/API, 2 types/tests, 3 nav/dashboard link tests | Existing Q&A contract |
| 2 | 4 inbox UI, 5 mutation integration, 6 full QA | Wave 1 |

### Dependency Matrix

| Task | Blocks | Blocked by |
|---|---|---|
| 1. Admin Q&A read contract | 4, 5, 6 | — |
| 2. Public-safe types and tests | 1, 4 | — |
| 3. Admin navigation and dashboard entry | 6 | — |
| 4. Inbox page and client UI | 5, 6 | 1, 2 |
| 5. Existing answer mutation integration | 6 | 1, 4 |
| 6. Verification and evidence | — | 1–5 |

## TODOs

- [x] 1. Define the admin Q&A read contract and implement the admin GET route

  **What to do**:
  - Add a dedicated admin query service that selects only: question id/content/timestamps, customer display name, product id/name/brand/image/isActive, and answer id/content/timestamps/author display name.
  - Define `status=unanswered|answered|all`, `q`, `page`, and bounded `pageSize`; default to `unanswered`, newest first.
  - Search only product name, brand, customer name, and question content. Treat malformed parameters as safe defaults.
  - Add `GET /api/admin/questions` with `auth()` and `isAdmin()` before data access; return 401 or 403 without private data.

  **Must NOT do**: Return user emails, add a Question status column, or duplicate answer mutations.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 6 | Blocked By: none

  **References**:
  - Pattern: `app/api/admin/catalog/route.ts` — admin API gate and response envelope.
  - Pattern: `lib/admin-dashboard.ts` — unanswered predicate `answers: { none: {} }`.
  - Contract: `prisma/schema.prisma` Question and Answer models — one Question may have many answers.
  - Guard: `lib/admin.ts` — allowlist authority.

  **Acceptance Criteria**:
  - [ ] Admin receives only sanitized records with bounded pagination.
  - [ ] Non-admin and anonymous calls do not execute the query.
  - [ ] `unanswered` means no Answer records; `answered` means one or more.

  **QA Scenarios**:
  ```
  Scenario: Admin reads unanswered results
    Tool: Vitest route test
    Steps: Mock an admin session and records with zero and one answers; request default parameters.
    Expected: Only the zero-answer record is returned, ordered newest first, with no email field.
    Evidence: evidence/admin-qa-inbox/task-1-api.txt

  Scenario: Unauthorized or malformed query
    Tool: Vitest route test
    Steps: Call without a session, as non-admin, and with invalid status/page.
    Expected: 401/403 before query for protected callers; malformed values resolve to safe defaults.
    Evidence: evidence/admin-qa-inbox/task-1-api-error.txt
  ```

  **Commit**: NO | Files: `lib/admin-questions.ts`, `app/api/admin/questions/route.ts`, related tests and types

- [x] 2. Add explicit, sanitized inbox types and test fixtures

  **What to do**:
  - Add readonly admin-inbox DTO and paginated response types alongside the established Q&A contracts.
  - Keep client data limited to displayed user names, not user ids unless an existing UI necessity is documented.
  - Add compact fixtures that cover unanswered, multiple answers, inactive product, long text, and missing image fallback.

  **Must NOT do**: Reuse Prisma model types as network DTOs or expose internal relations.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 1, 4 | Blocked By: none

  **References**:
  - Pattern: `types/index.ts` Question, Answer, QuestionListResponse.
  - Pattern: `types/index.ts` MyPostsData — cursor-safe public DTO style; use only if query implementation chooses cursor after repository pattern review.

  **Acceptance Criteria**:
  - [ ] Typecheck prevents any UI dependence on `email`, password, or unselected Prisma fields.
  - [ ] Fixtures represent Question with multiple answers without a fabricated status field.

  **QA Scenarios**:
  ```
  Scenario: DTO compilation
    Tool: TypeScript compiler
    Steps: Compile API and client using only the inbox DTO.
    Expected: No implicit Prisma-row leakage or type errors.
    Evidence: evidence/admin-qa-inbox/task-2-types.txt

  Scenario: Private-field regression
    Tool: Vitest
    Steps: Assert serialized API data has no email or password-like property.
    Expected: Sanitized object only.
    Evidence: evidence/admin-qa-inbox/task-2-types-error.txt
  ```

  **Commit**: NO | Files: `types/index.ts`, targeted tests

- [x] 3. Connect the existing admin shell and dashboard to the inbox

  **What to do**:
  - Add a Q&A item to `AdminNav`.
  - Turn the dashboard’s `미답변 Q&A` value into an accessible link to `/admin/questions?status=unanswered` without altering its real aggregate.
  - Preserve the existing three operational cards and analytics-placeholder boundary.

  **Must NOT do**: Add a fake count badge or duplicate navigation in child pages.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6 | Blocked By: none

  **References**:
  - Pattern: `components/admin/AdminNav.tsx` — single shared admin nav.
  - Pattern: `app/admin/page.tsx` — current live dashboard cells.
  - Data: `lib/admin-dashboard.ts` — source of the unread Q&A count.

  **Acceptance Criteria**:
  - [ ] The link is keyboard accessible and its destination preserves the unanswered filter.
  - [ ] Navigation renders exactly once through `app/admin/layout.tsx`.

  **QA Scenarios**:
  ```
  Scenario: Dashboard entry
    Tool: component/page test
    Steps: Render a nonzero unanswered count and inspect the Q&A card.
    Expected: Accessible link targets the unanswered inbox.
    Evidence: evidence/admin-qa-inbox/task-3-nav.txt

  Scenario: Navigation regression
    Tool: browser QA
    Steps: Visit all admin pages and inspect the shared menu.
    Expected: One Q&A item and no duplicate navigation.
    Evidence: evidence/admin-qa-inbox/task-3-nav-error.txt
  ```

  **Commit**: NO | Files: `components/admin/AdminNav.tsx`, `app/admin/page.tsx`, tests

- [x] 4. Build the responsive `/admin/questions` inbox UI

  **What to do**:
  - Add a protected server page under the existing admin layout and a client inbox component.
  - Default to unanswered; provide status tabs/select, debounced or explicit search, page controls, loading/empty/error/retry states.
  - Show product thumbnail with fallback, brand/name, active or inactive marker, customer display name, timestamps, question body, existing answer history, product link, and admin product-edit link.
  - Keep query state in the URL so refresh/back/forward preserve filters.

  **Must NOT do**: Show raw customer email, make inactive products disappear, or use a full-page reload for every input change.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5, 6 | Blocked By: 1, 2

  **References**:
  - Pattern: `components/admin/AdminProductCatalogClient.tsx` — admin list/filter/loading/error patterns.
  - Pattern: `components/admin/AdminInventoryProductThumbnail.tsx` — external image fallback.
  - Pattern: `app/admin/inventory/page.tsx` — server page within shared admin layout.

  **Acceptance Criteria**:
  - [ ] First visit clearly prioritizes unanswered questions.
  - [ ] Search and filters persist in the URL and pagination returns stable, bounded result pages.
  - [ ] Empty and request-failure states explain the next safe action.

  **QA Scenarios**:
  ```
  Scenario: Inbox triage on desktop and mobile
    Tool: browser
    Steps: Seed or use a local QA admin, unanswered and answered questions; filter, search product/author text, then navigate a second page.
    Expected: Correct records appear with product context and no horizontal overflow at 1280×900 and 390×844.
    Evidence: evidence/admin-qa-inbox/task-4-ui.png

  Scenario: Deleted/stale question
    Tool: browser plus mocked response or controlled local data
    Steps: Open an inbox item, remove it through its established owner flow, then reload the inbox.
    Expected: The record disappears and the inbox remains usable with a safe message.
    Evidence: evidence/admin-qa-inbox/task-4-ui-error.png
  ```

  **Commit**: NO | Files: `app/admin/questions/page.tsx`, `components/admin/AdminQuestionsInbox.tsx`, tests

- [ ] 5. Integrate answer creation and editing with the existing nested Q&A mutations

  **What to do**:
  - Add inline answer and answer-edit states in the inbox.
  - Use only existing product-scoped POST/PATCH endpoints and their required productId/questionId/answerId hierarchy.
  - Trim client input, limit UI to 2000 characters, disable double submits, render API failures safely, and refetch the affected current list after success.
  - Do not surface answer deletion in this MVP; it remains governed by the existing product-detail API/UI policy.

  **Must NOT do**: Add a second admin answer API, bypass product-parent validation, or permit edits to the customer’s question.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6 | Blocked By: 1, 4

  **References**:
  - Pattern: `components/product/QASection.tsx` — existing form state and error translation.
  - API: `app/api/products/[id]/questions/[questionId]/answers/route.ts` — admin-only POST.
  - API: `app/api/products/[id]/questions/[questionId]/answers/[answerId]/route.ts` — parent-chain-safe PATCH.

  **Acceptance Criteria**:
  - [ ] Valid answer creates through the existing endpoint and moves the item out of default unanswered results after refresh.
  - [ ] Valid edit updates the same answer through the existing endpoint.
  - [ ] 401, 403, 404, validation, and network failures keep content safe and recoverable.

  **QA Scenarios**:
  ```
  Scenario: Answer then edit
    Tool: browser and component test
    Steps: As an admin, answer one unanswered question, switch to answered, edit that answer.
    Expected: Exact nested API URLs are called; list refreshes and updated content renders.
    Evidence: evidence/admin-qa-inbox/task-5-answer.txt

  Scenario: Parent mismatch or deleted question
    Tool: Vitest route/component test
    Steps: Force a 404 from the existing nested endpoint while the form is open.
    Expected: No optimistic false success; a safe retryable error is shown.
    Evidence: evidence/admin-qa-inbox/task-5-answer-error.txt
  ```

  **Commit**: NO | Files: `components/admin/AdminQuestionsInbox.tsx`, component tests

- [ ] 6. Run the final verification wave and capture evidence

  **What to do**:
  - Run focused tests first, then full Vitest, TypeScript, lint, and production build.
  - Verify anonymous/non-admin API access, no private fields, dashboard link, unanswered/answered/all filters, search, pagination, answer/edit success, and mobile rendering.
  - Review every tracked diff for schema, checkout, customer Q&A, and secret-scope drift.

  **Must NOT do**: Claim customer notification delivery, payment integration, or a production deployment.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: none | Blocked By: 1–5

  **References**:
  - Commands: `package.json` scripts.
  - Security pattern: existing Q&A route test suites.

  **Acceptance Criteria**:
  - [ ] `npm run test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass.
  - [ ] Browser QA shows no console errors in the defined inbox flows.
  - [ ] No migration or external-service configuration is created.

  **QA Scenarios**:
  ```
  Scenario: Full quality gate
    Tool: npm/npx commands
    Steps: Run focused tests, then full test/typecheck/lint/build sequence.
    Expected: All commands exit successfully; pre-existing warnings are recorded but no new errors occur.
    Evidence: evidence/admin-qa-inbox/task-6-quality.txt

  Scenario: Authorization boundary
    Tool: browser and route test
    Steps: Visit inbox and API as anonymous/non-admin, then as allowlisted admin.
    Expected: Protected callers fail closed; admin gets only sanitized data and can complete the defined flow.
    Evidence: evidence/admin-qa-inbox/task-6-auth.txt
  ```

  **Commit**: YES | Message: `feat(admin): add Q&A inbox` | Files: all scoped source, tests, roadmap update if it reflects completed work

## Final Verification Wave

- [ ] F1. Plan Compliance Audit — confirm every Must Have/NOT Have item against the diff.
- [ ] F2. Code Quality Review — inspect query bounds, DTO sanitization, URL state, and mutation reuse.
- [ ] F3. Real Manual QA — execute the two browser form factors and authorization boundary.
- [ ] F4. Scope Fidelity Check — confirm no migration, external integration, customer-Q&A mutation change, or payment work entered the commit.

## Commit Strategy

- Keep Q&A inbox source, tests, and completion documentation in one focused commit after all quality gates pass.
- Do not stage `.env.local`, browser artifacts, screenshots outside `evidence/admin-qa-inbox/`, or unrelated existing untracked files.

## Success Criteria

- An administrator can triage unanswered product questions from one protected location, search and filter them, and create or edit answers through the existing protected API contracts.
- Customers receive no newly exposed private data or altered Q&A behavior.
- The dashboard count has a useful destination and remains based on real database state.
