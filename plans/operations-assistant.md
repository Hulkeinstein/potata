# Operations Assistant Safe Mode

## TL;DR

> **Summary**: 관리자 대시보드에 실제 운영 이슈를 우선순위로 보여 주고, 기존 관리 화면으로만 안내하는 안전 모드 운영 어시스턴트를 만든다.
> **Deliverables**: 판정 가능한 이슈 계약, 재사용 데이터 집계 서비스, 대시보드 요약, 전체 이슈 화면, 테스트·desktop/mobile QA.
> **Effort**: medium
> **Parallel**: YES — 2 waves
> **Critical Path**: issue contract → service → dashboard/operations UI → verification.

## Context

### Original Request

운영자가 직접 모든 관리자 화면을 순회하지 않아도 문제가 있으면 알려 주고 관리하기 쉬운 기능을 만든다. 자동 변경은 하지 않는다.

### Interview Summary

- 첫 버전은 감지·우선순위·해결 경로만 제공하는 안전 모드다.
- 결제·주문·쿠폰 사용·포인트 사용·외부 서비스·자동 데이터 생성은 범위 밖이다.
- 기존 상품, 재고, Q&A, 혜택 관리자 화면을 재사용한다.

### Metis Review (gaps addressed)

- 외부 이미지 URL의 실제 로드 실패는 서버에서 신뢰성 있게 판정할 수 없으므로, 대표 이미지 URL이 비어 있는 경우만 이슈로 만든다.
- Size Guide의 실제 치수 데이터 부재는 승인 대기 상태이므로 경고로 만들지 않는다.
- 비활성 상품의 과거 문의는 미답변일 때만 Q&A 이슈로 포함한다.
- 활성·미발급 쿠폰 캠페인은 오류가 아닌 정보성 운영 확인 신호로 한정한다.

## Work Objectives

### Core Objective

실제 데이터에서만 도출된 운영 이슈를 심각도와 영향 범위로 정렬해 `/admin`과 전용 전체 보기에서 제공한다.

### Deliverables

- 안전한 운영 이슈 DTO와 순수 판정 함수
- 기존 Prisma 데이터를 재사용하는 admin 전용 issue loader
- `/admin` 상단 요약과 `/admin/operations` 전체 이슈 화면
- 기존 관리자 화면으로만 이동하는 해결 링크

### Definition of Done

- `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`가 통과한다.
- 이슈가 없을 때는 정상 빈 상태를 표시하고 가짜 경고를 만들지 않는다.
- 이슈는 `즉시 확인 → 주의 → 정보` 순으로, 같은 등급에서는 영향 수가 큰 항목부터 정렬된다.
- desktop 1280×900과 mobile 390×844에서 요약·전체 보기·해결 링크가 확인된다.

### Must Have

- 판매 중 상품의 전체 품절, 옵션 없음, 미답변 Q&A를 즉시 확인으로 표시
- 저재고, 재고가 남은 수동 품절, 대표 이미지 URL 누락을 주의로 표시
- 판매 중지 상품, 활성·미발급 쿠폰 캠페인을 정보로 표시
- 각 이슈의 원인, 영향 수, 기존 관리자 화면으로의 정확한 링크

### Must NOT Have

- migration, 새 mutation API, 자동 상품 수정·재고 조정·쿠폰 발급·답변 작성
- 외부 이미지 URL probe, Size Guide 데이터 부재의 오류 처리, 가짜 판매·매출 지표
- 고객 이메일·ID, 쿠폰 수령자, 포인트 사유, 감사 로그 노출
- 결제·주문·외부 서비스 설정 변경

## Verification Strategy

- Test decision: TDD with Vitest.
- QA policy: 각 task에 자동 테스트와 agent-executed browser QA를 포함한다.
- Evidence: `evidence/operations-assistant/`에 API·desktop·mobile 결과를 저장한다.

## Execution Strategy

### Parallel Execution Waves

| Wave | Tasks | Dependency |
| --- | --- | --- |
| 1 | 1 issue contract/classifier, 2 data loader and access boundary | existing admin services |
| 2 | 3 dashboard summary, 4 operations page, 5 verification | tasks 1–2 |

### Dependency Matrix

| Task | Blocks | Blocked by |
| --- | --- | --- |
| 1. Issue contract and classifier | 2–5 | — |
| 2. Safe data loader | 3–5 | 1 |
| 3. Dashboard summary | 5 | 1–2 |
| 4. Full operations page | 5 | 1–2 |
| 5. Verification and review | — | 1–4 |

## TODOs

- [x] 1. Define the safe operation-issue contract and pure classifier

  **What to do**:
  - Add a dedicated readonly DTO with `severity`, stable issue kind, one-sentence reason, numeric impact, and a link limited to the existing admin destinations.
  - Implement a pure classifier from minimal product/variant/question/campaign inputs.
  - Fix severity order: `immediate` for active all-unavailable products, active products with no variants, and unanswered Q&A; `warning` for stock 1–3, manual sold-out with stock remaining, and blank image URL; `info` for inactive products and active zero-grant campaigns.
  - Sort by severity then impact descending, with stable kind and target ordering as final tie-breakers.

  **Must NOT do**: Probe external image URLs, use Size Guide absence as an error, emit customer identity or campaign recipient data, or create a mutation.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2–5 | Blocked By: none

  **References**:
  - Pattern: `lib/admin-dashboard.ts` — existing real aggregate definitions.
  - Pattern: `lib/inventory.ts` — source of truth for available, sold-out, and manual sold-out semantics.
  - Contract: `types/admin-questions.ts` — sanitized admin DTO style.

  **Acceptance Criteria**:
  - [ ] Identical input always produces identical sorted issue DTOs.
  - [ ] Unknown, missing, or non-deterministic states produce no false issue.
  - [ ] TypeScript prevents the UI from accessing customer email/ID or benefit audit data.

  **QA Scenarios**:
  ```
  Scenario: True issue classification
    Tool: Vitest
    Steps: Pass fixtures for all-unavailable, no-variant, unanswered, low-stock, manual sold-out, blank-image, inactive, and zero-grant campaign.
    Expected: Exactly one correct severity and existing admin link per fixture.
    Evidence: evidence/operations-assistant/task-1-classifier.txt

  Scenario: False-alert exclusion
    Tool: Vitest
    Steps: Pass an external image URL, Size Guide absence, answered inactive-product question, and inactive campaign.
    Expected: No issue is created for those states.
    Evidence: evidence/operations-assistant/task-1-exclusions.txt
  ```

  **Commit**: NO | Files: `lib/operations-assistant.ts`, `types/operations-assistant.ts`, tests

- [x] 2. Build the admin-only operations issue loader from existing data

  **What to do**:
  - Query only Product/Variant availability and required fields, unanswered Question counts grouped by product state, and active CouponCampaign grant counts.
  - Reuse established admin-service query patterns, select only the fields required by Task 1, and feed normalized facts into the pure classifier.
  - If an API route is needed for client refresh, apply `auth()` then `isAdmin()` before data access and return only the Task 1 DTO; otherwise keep the read server-side.

  **Must NOT do**: Reimplement inventory adjustments, query or expose users/emails, write new models, or add external calls.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3–5 | Blocked By: 1

  **References**:
  - Pattern: `lib/admin-dashboard.ts:getAdminDashboardSummary` — parallel aggregate query style.
  - Pattern: `lib/admin-inventory.ts:listAdminInventory` — active-product inventory filtering.
  - Pattern: `lib/benefits/admin-service.ts:listAdminBenefits` — campaign/grant data boundary.
  - Guard: `lib/admin.ts` and `app/api/admin/questions/route.ts` — defense-in-depth admin authorization.

  **Acceptance Criteria**:
  - [ ] Loader uses only actual database facts and returns no issue when there are no matching facts.
  - [ ] A non-admin cannot obtain issue data through any new API path.
  - [ ] Each result link is one of the existing allowlisted admin routes.

  **QA Scenarios**:
  ```
  Scenario: Mixed operational state
    Tool: Vitest with Prisma mocks or local integration test
    Steps: Supply products, variants, unanswered questions, and campaigns across all supported states.
    Expected: Aggregate facts map to the Task 1 issues without user-private fields.
    Evidence: evidence/operations-assistant/task-2-loader.txt

  Scenario: Unauthorized access
    Tool: Vitest route test, if a route exists
    Steps: Call as anonymous and non-admin before the data query mock.
    Expected: 401/403 and zero loader invocation.
    Evidence: evidence/operations-assistant/task-2-auth.txt
  ```

  **Commit**: NO | Files: `lib/operations-assistant.ts`, optional admin route, tests

- [x] 3. Add the operations-assistant summary to the admin dashboard

  **What to do**:
  - Add an accessible dashboard section above current status with total issue count, a no-issue success state, and at most five highest-priority issue cards.
  - Render severity in Korean as `즉시 확인`, `주의`, `정보`; include reason, impact wording, and the existing admin route link.
  - Add one clear `전체 이슈 보기` link to `/admin/operations`; preserve existing dashboard metrics and analytics placeholders.

  **Must NOT do**: Add fake counts, duplicate AdminNav, or turn dashboard cards into write controls.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5 | Blocked By: 1–2

  **References**:
  - Pattern: `app/admin/page.tsx` — current dashboard layout, dark visual system, and Link cards.
  - Pattern: `components/admin/AdminNav.tsx` — shared admin navigation is rendered once by layout.

  **Acceptance Criteria**:
  - [ ] Zero issues show a positive, non-misleading empty state.
  - [ ] Five-item cap does not affect the complete issue count.
  - [ ] Links preserve existing inventory/Q&A filter allowlists.

  **QA Scenarios**:
  ```
  Scenario: Top-priority dashboard view
    Tool: component/page test
    Steps: Provide more than five mixed-severity issues.
    Expected: Count is exact, first five follow severity/impact order, and all links target existing admin pages.
    Evidence: evidence/operations-assistant/task-3-dashboard.txt

  Scenario: Healthy dashboard
    Tool: component/page test
    Steps: Provide an empty issue list.
    Expected: No warning card, no fake zero-value alarm, and a clear normal-state message.
    Evidence: evidence/operations-assistant/task-3-empty.txt
  ```

  **Commit**: NO | Files: `app/admin/page.tsx`, dashboard tests

- [x] 4. Build the `/admin/operations` complete issue view

  **What to do**:
  - Add an admin-protected page under the existing layout with severity sections or an equivalent accessible filter.
  - Render all Task 1 fields, keep wording concise, and provide a back link to the dashboard.
  - Support loading, safe request failure, and empty states without exposing raw database errors.
  - Ensure the mobile layout keeps severity, reason, impact, and resolution link readable without horizontal overflow.

  **Must NOT do**: Add bulk actions, severity editing, auto-dismiss, issue persistence, or a new support workflow.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5 | Blocked By: 1–2

  **References**:
  - Pattern: `app/admin/questions/page.tsx` and `components/admin/AdminQuestionsInbox.tsx` — protected list, empty/error states, URL patterns.
  - Pattern: `app/admin/inventory/page.tsx` — admin page responsive layout and management links.

  **Acceptance Criteria**:
  - [ ] Complete view contains every loader issue exactly once.
  - [ ] Issue cards make no mutation network call.
  - [ ] Inactive/uncertain states obey Task 1 exclusions.

  **QA Scenarios**:
  ```
  Scenario: Full issue list on desktop and mobile
    Tool: browser
    Steps: Use local QA data covering every supported issue, open the page at 1280×900 and 390×844.
    Expected: All cards are readable, ordered correctly, and each resolution link reaches its existing admin page.
    Evidence: evidence/operations-assistant/task-4-desktop-mobile.png

  Scenario: Safe failure and empty states
    Tool: component test and browser
    Steps: Simulate a safe loader failure, then use an empty result set.
    Expected: Retry/return guidance is shown without internal error or a false issue.
    Evidence: evidence/operations-assistant/task-4-error-empty.txt
  ```

  **Commit**: NO | Files: `app/admin/operations/page.tsx`, operations components, tests

- [x] 5. Verify no mutation boundary and complete quality review

  **What to do**:
  - Run focused and full Vitest, TypeScript, lint, production build, and diff check.
  - Execute browser QA with temporary local data only; remove all QA products, variants, questions, campaigns, and users afterward.
  - Verify non-admin navigation is blocked by middleware and any new API guard.
  - Reconcile roadmap completion state only after all gates pass.

  **Must NOT do**: Commit or push before all acceptance evidence is green, or retain QA fixtures/logs in the tracked diff.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: none | Blocked By: 1–4

  **References**:
  - Pattern: `plans/admin-qa-inbox.md` — security and browser verification boundary.
  - Pattern: `plans/inventory-operations-polish.md` — local fixture cleanup and admin QA.

  **Acceptance Criteria**:
  - [x] All quality commands pass with only the project’s known lint warnings.
  - [x] No migration, mutation route, payment, external-service, or private-data diff exists.
  - [x] QA fixture cleanup leaves the local database in its prior state.

  **QA Scenarios**:
  ```
  Scenario: Read-only safety probe
    Tool: browser dev logs and route/component tests
    Steps: Visit dashboard and operations list, follow all resolution links, and inspect network behavior.
    Expected: No POST/PATCH/DELETE call originates from the assistant UI.
    Evidence: evidence/operations-assistant/task-5-read-only.txt

  Scenario: Non-admin boundary
    Tool: browser and/or route test
    Steps: Visit the new page as a signed-out or non-admin local account.
    Expected: Existing admin protection redirects or rejects without issue details.
    Evidence: evidence/operations-assistant/task-5-auth.txt
  ```

  **Commit**: YES | Message: `feat(admin): add operations assistant` | Files: source, tests, plan, roadmap

## Final Verification Wave

- [x] F1. Plan Compliance Audit — verify every Must Have and Must NOT Have item against the diff.
- [x] F2. Code Quality Review — inspect query reuse, severity sort, DTO sanitization, and link allowlists.
- [x] F3. Real Manual QA — verify empty and populated desktop/mobile views plus non-admin boundary.
- [x] F4. Scope Fidelity Check — confirm no mutation, migration, payment, external-service, or fake-data work entered the change.

## Commit Strategy

- One commit after all quality gates: `feat(admin): add operations assistant`.
- Stage only source, tests, plan, and evidence. Exclude `.env.local`, QA fixtures, local logs, screenshots unrelated to this work, and dependency caches.

## Success Criteria

- 운영자는 `/admin`에서 우선 이슈와 전체 이슈 수를 확인하고 기존 관리 화면으로 한 번에 이동할 수 있다.
- 데이터가 없거나 판정할 수 없는 상태를 문제로 과장하지 않는다.
- 안전 모드가 데이터를 변경하지 않는다는 경계가 코드·UI·테스트에서 확인된다.
