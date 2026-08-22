# My Posts 구현 계획

## TL;DR
> **Summary**: 로그인 사용자가 `/mypage/posts`에서 자신의 OOTD·Reviews·Q&A를 탭별로 조회하고 제한된 필드를 직접 수정·삭제하며 공개 프로필과 원본 상품으로 이동할 수 있게 한다.
> **Deliverables**: 보호 페이지, 본인 전용 aggregate API, 탭/카드/edit/delete UI, 마이페이지 링크, API·UI·browser tests
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6 → Final Verification

## Context

### Original Request
- `/mypage`는 계정·주문 관리 중심으로 유지하고 `My Posts` 링크만 추가한다.
- 별도 페이지에서 로그인 사용자가 작성한 OOTD·리뷰·Q&A를 한곳에서 본다.
- `OOTD | Reviews | Q&A` 탭을 전환하고 각 유형을 수정·삭제한다.
- 공개 프로필로 이동할 수 있어야 한다.
- URL·계약·권한·빈 상태·모바일·테스트·migration 여부를 먼저 확정한 뒤 구현한다.

### Research Summary
- `User`는 이미 `ootdPosts`, `reviews`, `questions`, `answers` 관계를 가진다 (`prisma/schema.prisma:11-32`).
- OOTD는 owner DELETE만 있고 PATCH가 없다 (`app/api/ootd/[id]/route.ts`).
- Review는 product-scoped POST upsert/DELETE가 있고 이미지 유지 계약을 가진다 (`app/api/products/[id]/reviews/route.ts`).
- Question은 owner PATCH와 owner/admin DELETE가 있다 (`app/api/products/[id]/questions/[questionId]/route.ts`).
- 일반 사용자의 Q&A는 “내 질문”이며 Answer mutation은 admin-only라 범위 밖이다.
- `/mypage/:path*`는 이미 middleware 보호 범위다 (`middleware.ts`).
- 기존 모델과 `userId` 인덱스로 MVP 기능 구현이 가능하므로 schema/migration 변경은 필요 없다. 복합 정렬 index는 데이터 증가 후 별도 최적화한다.

### Metis Review (gaps addressed)
- OOTD edit 부재: 신규 owner-only PATCH를 추가하되 caption만 수정한다. 이미지·product tag 변경은 제외한다.
- Review editor 복제 위험: My Posts에서는 rating/comment만 수정하고 기존 `imageUrls`를 전부 `keepImageUrls`로 전달하여 이미지 업로드/삭제를 하지 않는다.
- Q&A 의미: 내 질문만 노출·수정·삭제하고 admin 답변은 `answerCount`로만 표시한다.
- nullable handle: handle이 있으면 공개 프로필 링크, 없으면 `/onboarding/handle?returnTo=/mypage/posts` 설정 CTA를 표시한다.
- cursor 보안: type과 session owner 범위에서 cursor를 검증하고 잘못된 cursor는 동일한 400 응답으로 처리한다.

### Competitive Research Approval (2026-08-22)
- 경쟁 서비스 조사 결과와 아래 권장안을 사용자가 승인했으며, 이를 최종 구현 기준으로 적용했다.
- 무신사: 공개 UX 분석에서는 마이페이지가 전체 메뉴 나열보다 핵심 메뉴를 먼저 보여주고, 주문처럼 “현재 상태”를 상단에 우선 배치하는 방향으로 단순화됐다. Snap은 단순 링크보다 기능을 설명하는 배너로 승격된 사례가 있다. Potata는 `/mypage`를 확장하지 않고 `My Posts` 단일 row만 추가하되, row subtitle로 “OOTD · Reviews · Q&A 관리”를 명확히 한다.
- 무신사 후기: 공개 웹 자료상 기존 작성 후기는 마이페이지의 `작성 가능한 후기` 경로 안에서 확인되어 발견성이 낮다는 사용자 경험이 보고됐다. Potata는 작성 가능/작성 완료를 섞지 않고 `My Posts > Reviews`를 독립 tab으로 노출한다.
- “490”: 정확한 서비스명은 확인되지 않았다. 패션 맥락상 에이블리의 남성 플랫폼 `4910(사구일공)`이 유력하나 동일 서비스라는 확정은 사용자 확인 전까지 금지한다.
- 4910: 공식 App Store 설명은 리뷰·게시글 사진 첨부와 서비스 내 활동 알림을 지원한다고 밝히며, 2026 UI 개편 보도는 모바일/웹에서 룩북·스타일 이미지를 SNS feed처럼 탐색하는 콘텐츠 중심 구성을 확인한다. 로그인 없는 공개 자료로는 마이페이지 접근 경로 및 edit/delete 동작을 검증하지 못했으므로 이를 경쟁사 사실로 단정하지 않는다.
- 계획 반영 권장안:
  1. OOTD tab은 4910의 콘텐츠 중심 탐색처럼 image-first grid를 유지하고, Review/Q&A는 상품 context를 먼저 보여주는 list card로 분리한다.
  2. `/mypage`에는 메뉴를 늘리지 않고 My Posts 한 row만 둔다. 콘텐츠 count badge는 aggregate API를 추가 호출하므로 MVP에서 제외한다.
  3. tab 상태는 URL에 보존해 모바일 back navigation 후 같은 분류로 복귀한다.
  4. mobile edit/delete는 card 본문을 가리지 않는 하단 action row 또는 overflow menu를 사용하며 삭제 confirm을 유지한다.
  5. 공개 프로필 이동은 page header의 단일 CTA로 제공하고, handle이 없으면 설정 CTA로 대체한다.
  6. Review/Q&A 카드에는 원본 상품 링크를 유지해 작성 콘텐츠와 구매 context를 끊지 않는다.

## Work Objectives

### Core Objective
본인 작성 콘텐츠를 단일 관리 surface에서 안전하게 조회·수정·삭제할 수 있게 하되 기존 공개 feed, 상품 상세 editor, admin 답변 권한을 변경하지 않는다.

### URL and Navigation
- Page: `/mypage/posts`
- Tabs: `/mypage/posts?tab=ootd|reviews|questions`; missing/invalid value defaults to `ootd` and URL is normalized on the next tab action.
- API: `GET /api/users/me/posts?type=ootd|reviews|questions&cursor=<id>`
- Source links: Review/Question → `/product/{productId}`; public profile → `/profile/{handle}`.
- `/mypage` receives one `My Posts` menu row only. Navbar/global navigation remains unchanged.

### Data Contract
```ts
type MyPostItem =
  | { type: "ootd"; id: string; caption: string | null; imageUrls: string[]; createdAt: string; likeCount: number; commentCount: number }
  | { type: "review"; id: string; productId: string; productName: string; productImageUrl: string | null; rating: number; comment: string; imageUrls: string[]; createdAt: string; updatedAt: string }
  | { type: "question"; id: string; productId: string; productName: string; productImageUrl: string | null; content: string; answerCount: number; createdAt: string; updatedAt: string };

type MyPostsResponse = {
  success: true;
  data: { items: MyPostItem[]; nextCursor: string | null };
};
```
- 각 type은 `createdAt desc, id desc`, `take: 13`으로 조회하고 12개를 반환한다.
- cursor는 같은 type과 `session.user.id` 소유 row인지 확인한 뒤 `skip: 1`에 사용한다.
- query/body의 userId·handle은 받지 않는다.
- product/user의 email, passwordHash 등 불필요한 필드는 select하지 않는다.

### Edit/Delete Contract
- OOTD: `PATCH /api/ootd/[id]` JSON `{caption}`; trim 후 empty는 `null`, 최대 2000자, owner-only. 기존 DELETE 재사용.
- Review: 기존 `POST /api/products/[productId]/reviews` multipart에 `rating`, `comment`, 현재 `imageUrls` 전체를 `keepImageUrls`로 전달; 새 이미지 업로드/기존 이미지 제거 없음. 기존 DELETE 재사용.
- Question: 기존 owner PATCH `{content}`와 DELETE 재사용.
- 모든 edit/delete는 confirm 또는 명시적 edit mode를 거치고 성공 시 현재 tab row를 갱신/제거한다. 실패 시 기존 row를 유지하고 inline error + retry를 제공한다.

### Definition of Done
- 미로그인은 `/login?callbackUrl=/mypage/posts`로 이동한다.
- 세 탭 모두 본인 데이터만 최신순으로 표시하며 타인 데이터가 섞이지 않는다.
- 탭 URL, loading/error/retry/load-more/empty state가 동작한다.
- OOTD caption, Review rating/comment, Question content 수정과 세 유형 삭제가 owner 권한으로 동작한다.
- desktop과 390×844에서 탭과 action이 겹치지 않고 최소 44px touch target을 유지한다.
- 공개 프로필/handle 설정 CTA와 product source 링크가 올바르다.
- typecheck, lint, 전체 tests, production build가 통과한다.

### Must NOT Have
- 운영 DB migration/apply, schema 변경, db push/reset
- Review 이미지 또는 OOTD 이미지/product tag 편집
- admin Answer 수정·삭제 권한 변경
- 타 사용자 ID를 받는 aggregate API
- Navbar/global navigation 변경, badge/follow notification/profile redesign
- 외부 서비스·운영 DB·배포·commit·push

## Verification Strategy
- Test decision: TDD, Vitest + Testing Library + route unit tests.
- Browser QA: in-app browser에서 실제 localhost desktop/390×844, 로그인 QA fixture 사용.
- Evidence: `evidence/my-posts/` 아래 API/UI/gates/browser/safety 결과를 저장하되 비밀값과 DB URL은 기록하지 않는다.

## Execution Strategy

### Parallel Execution Waves
- Wave 1: Task 1 contracts/tests, Task 3 OOTD PATCH/tests
- Wave 2: Task 2 aggregate API, Task 4 My Posts page/UI, Task 5 mypage navigation
- Wave 3: Task 6 integration/browser QA and quality gates

### Dependency Matrix
| Task | Blocked By | Blocks |
|---|---|---|
| 1 | - | 2, 4 |
| 2 | 1 | 4, 6 |
| 3 | 1 | 4, 6 |
| 4 | 1, 2, 3 | 6 |
| 5 | - | 6 |
| 6 | 2, 3, 4, 5 | Final |

## TODOs

- [x] 1. My Posts contract와 failing-first test 고정

  **What to do**: `types/index.ts`에 discriminated union/response type을 추가하고 aggregate route 및 UI test에서 위 계약, 12개 pagination, tab 이름을 먼저 RED로 고정한다.
  **Must NOT do**: `any`, raw Prisma model 노출, schema 변경.
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2,4 | Blocked By: -
  **References**:
  - `types/index.ts:162-175` — OOTD feed DTO naming pattern.
  - `types/index.ts:345-415` — Review/Q&A response mapping pattern.
  - `app/notifications/page.test.tsx` — fetch/loading/error/empty UI test pattern.
  **Acceptance Criteria**:
  - [ ] invalid type, unauthenticated, self-only mapping, stable cursor, three item variants가 test 이름과 assertion에 명시된다.
  - [ ] UI tests가 URL tab, empty/error/retry, edit/delete success/failure를 커버한다.
  **QA Scenarios**:
  ```
  Scenario: 계약 RED 확인
    Tool: npx vitest
    Steps: 신규 route/UI test만 실행
    Expected: 구현 부재로 명확히 실패하며 import typo가 실패 원인이 아님
    Evidence: evidence/my-posts/task-1-red.txt
  Scenario: 타입 경계
    Tool: npx tsc --noEmit
    Steps: union variant 누락 시 exhaustive mapper가 실패하는지 확인
    Expected: 누락 variant가 compile error
    Evidence: evidence/my-posts/task-1-types.txt
  ```
  **Commit**: NO

- [x] 2. 본인 전용 aggregate GET API 구현

  **What to do**: `app/api/users/me/posts/route.ts`에서 auth, type allowlist, owner-scoped cursor validation, type별 Prisma select/map, take+1 pagination, sanitized error를 구현한다.
  **Must NOT do**: query userId 수용, 다른 사용자 row 존재 노출, mutation 추가.
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4,6 | Blocked By: 1
  **References**:
  - `app/api/notifications/route.ts` — recipient-scoped cursor/list response.
  - `app/api/ootd/route.ts:99-154` — take+1 feed mapping.
  - `prisma/schema.prisma:161-269` — source models and relations.
  **Acceptance Criteria**:
  - [ ] 401/400/200/500 cases and three variants pass route tests.
  - [ ] Prisma where always contains `userId: session.user.id` and cursor is same owner/type.
  - [ ] response contains only declared contract fields.
  **QA Scenarios**:
  ```
  Scenario: 각 탭 본인 데이터 조회
    Tool: Vitest
    Steps: three type queries with owned fixtures
    Expected: correct union items + nextCursor
    Evidence: evidence/my-posts/task-2-api.txt
  Scenario: 타인 cursor/invalid type
    Tool: Vitest
    Steps: foreign cursor and type=answers
    Expected: identical safe 400; no data leak
    Evidence: evidence/my-posts/task-2-api-errors.txt
  ```
  **Commit**: NO

- [x] 3. OOTD owner caption PATCH 추가

  **What to do**: 기존 `app/api/ootd/[id]/route.ts`에 PATCH를 추가해 auth→body parse→caption validation→post existence/ownership→update 순서를 유지한다. 테스트를 RED→GREEN으로 추가한다.
  **Must NOT do**: imageUrls, products, userId 수정; storage 호출; admin override.
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,6 | Blocked By: 1
  **References**:
  - `app/api/ootd/[id]/route.ts:7-40` — owner-only delete gate.
  - `app/api/products/[id]/questions/[questionId]/route.ts:8-95` — owner-only PATCH validation pattern.
  **Acceptance Criteria**:
  - [ ] 401, malformed JSON/invalid caption 400, missing 404, foreign owner 403, owned update 200.
  - [ ] empty/whitespace caption is persisted as null; >2000 is rejected.
  **QA Scenarios**:
  ```
  Scenario: caption 수정
    Tool: Vitest
    Steps: owner PATCH with trimmed caption
    Expected: only caption updated and response returns normalized value
    Evidence: evidence/my-posts/task-3-ootd-patch.txt
  Scenario: IDOR 차단
    Tool: Vitest
    Steps: foreign post PATCH
    Expected: 403 and update not called
    Evidence: evidence/my-posts/task-3-ootd-patch-errors.txt
  ```
  **Commit**: NO

- [x] 4. `/mypage/posts` server wrapper와 My Posts client UI 구현

  **What to do**: server page에서 auth redirect와 handle select를 수행하고 client에 전달한다. client는 URL tab, tab별 독립 items/cursor, skeleton/error/retry/load-more, responsive cards, inline edit forms, delete confirmation, source/profile links를 제공한다.
  **Must NOT do**: 전체 page를 한 파일 250 pure LOC 이상으로 만들기; product Review/QA components를 그대로 import해 page-scoped state를 결합하기.
  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6 | Blocked By: 1,2,3
  **References**:
  - `app/mypage/orders/page.tsx:21-48` — server auth/back link/header.
  - `app/notifications/page.tsx` — client list/error/retry pattern.
  - `app/profile/[handle]/page.tsx:89-113` — OOTD grid/empty pattern.
  - `components/product/ReviewSection.tsx:127-181,452-479` — review mutation contract.
  - `components/product/QASection.tsx:99-162,429-486` — question mutation contract.
  **Acceptance Criteria**:
  - [ ] semantic tablist/tab/tabpanel and query synchronization work with back/forward.
  - [ ] OOTD is 2-column mobile/3-column wider grid; Review/Q&A cards are single-column.
  - [ ] edit/delete pending disables duplicate actions; failure preserves row and displays retryable error.
  - [ ] handle exists → public profile link; null → handle setup CTA.
  - [ ] each empty state has correct CTA: OOTD `/what-to-wear`, others `/shop`.
  **QA Scenarios**:
  ```
  Scenario: 세 탭 조회·수정·삭제
    Tool: Testing Library
    Steps: mocked API responses, tab switch, edit submit, delete cancel/success/failure
    Expected: correct calls and local row update without cross-tab state loss
    Evidence: evidence/my-posts/task-4-ui.txt
  Scenario: 모바일/빈/오류
    Tool: Testing Library + browser
    Steps: empty responses, 500 retry, 390px viewport
    Expected: CTA/retry visible, no horizontal action overlap
    Evidence: evidence/my-posts/task-4-ui-edge.txt
  ```
  **Commit**: NO

- [x] 5. `/mypage`에 My Posts 링크만 추가

  **What to do**: `MY_MENU`에 `/mypage/posts` 링크 한 줄을 추가하고 접근성/route test를 만든다.
  **Must NOT do**: Navbar, global menu, mock stats, public profile page 변경.
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6 | Blocked By: -
  **References**:
  - `app/mypage/page.tsx:21-26,100-123` — menu data/render pattern.
  **Acceptance Criteria**:
  - [ ] 로그인 마이페이지에 My Posts link가 정확히 한 번 보이고 href가 `/mypage/posts`다.
  - [ ] 기존 menu와 logout behavior가 유지된다.
  **QA Scenarios**:
  ```
  Scenario: 마이페이지 진입
    Tool: Testing Library/browser
    Steps: authenticated page에서 My Posts 클릭
    Expected: `/mypage/posts` 이동
    Evidence: evidence/my-posts/task-5-nav.txt
  Scenario: 미인증 직접 접근
    Tool: browser
    Steps: `/mypage/posts` 직접 열기
    Expected: callbackUrl 포함 login redirect
    Evidence: evidence/my-posts/task-5-auth.txt
  ```
  **Commit**: NO

- [x] 6. Local integration fixture와 전체 회귀 검증

  **What to do**: 로컬 개발 DB에 QA 사용자 두 명의 OOTD/Review/Question 최소 fixture를 준비해 본인 격리, 세 탭, edit/delete, pagination, desktop/mobile을 검증하고 생성 fixture만 정리한다.
  **Must NOT do**: 기존 사용자 데이터 삭제, 운영/외부 DB, 실제 email/storage upload, deployment/push.
  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final | Blocked By: 2,3,4,5
  **References**:
  - `evidence/ootd-comments-notifications/task-8-e2e.txt` — two-user local QA/cleanup pattern.
  - `.github/workflows/ci.yml` — authoritative quality gates.
  **Acceptance Criteria**:
  - [ ] User A sees only A items; User B items never appear or mutate.
  - [ ] all edit/delete flows update browser and DB as declared.
  - [ ] desktop + 390×844 screenshots and browser log contain no new errors.
  - [ ] fixtures created by this task are cleaned; pre-existing QA users are not removed.
  **QA Scenarios**:
  ```
  Scenario: two-user isolation and mutations
    Tool: in-app browser + local API
    Steps: A/B fixtures, A login, three tabs, edits/deletes, B exclusion
    Expected: owner-only data/actions and correct refreshed rows
    Evidence: evidence/my-posts/browser-e2e.txt
  Scenario: quality gates and safety
    Tool: PowerShell
    Steps: typecheck, lint, related/full tests, build, diff/secret scan
    Expected: all commands pass; no env/secret/schema/migration/external changes
    Evidence: evidence/my-posts/quality-gates.txt
  ```
  **Commit**: NO

## Final Verification Wave
- [x] F1. Plan Compliance Audit — every Must Have/Must NOT Have and URL/contract checked.
- [x] F2. Code Quality Review — strict types, files under 250 pure LOC, no duplicated unsafe editor logic.
- [x] F3. Real Manual QA — localhost desktop/mobile, owner isolation, all tabs/actions.
- [x] F4. Scope Fidelity Check — only My Posts, owner caption edit, tests/docs/evidence; no external/production/push.

## Commit Strategy
- 이 작업에서는 commit/push하지 않는다. 사용자가 이후 요청하면 API, UI, tests/docs 단위로 검토 가능한 commit을 만든다.

## Success Criteria
- 사용자 관점에서 `/mypage` → My Posts → 세 탭 → edit/delete → source/public profile 이동이 끊김 없이 동작한다.
- API가 session owner만 신뢰하고 cursor/IDOR 경계를 test로 고정한다.
- schema/migration/외부 서비스 없이 기능이 완성되고 전체 gate가 통과한다.
