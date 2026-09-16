# Resend 실메일 검증 계획

## TL;DR

> **Summary**: 도메인이 없는 현재 단계에서는 Resend sandbox를 사용해 계정 소유자의 수신함으로 인증 메일 1건만 실제 발송하고, 가입·인증·Credentials 로그인까지 검증한다.
> **Deliverables**: 안전한 로컬 설정 확인, 단일 실발송, 수신·인증·로그인 증거, 식별 가능한 테스트 데이터 정리, 다음 도메인 검증 경계 기록.
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: secret preflight → actual send → inbox proof → verify/login → cleanup.

## Context

### Original Request

로드맵의 첫 외부 준비 활동인 실메일 검증을 시작하기 위한 계획을 만든다.

### Interview Summary

- 결제와 배포는 아직 보류한다.
- 첫 발송은 고객·대량 발송이 아닌 운영자 본인에게 한 건만 보낸다.
- 도메인이 없는 현재 상태에서도 Resend의 테스트 발신자로 계정 소유자의 수신함에 실제 발송할 수 있다.

### Metis Review (gaps addressed)

- 가입 API는 미인증 사용자와 인증 코드를 저장한 후 발송하므로, 실패해도 로컬에 테스트 흔적이 남을 수 있다. 사전에 식별 가능한 테스트 계정을 정하고 종료 시 해당 로컬 데이터만 정리한다.
- Resend message ID는 발송 접수 근거일 뿐 수신 증거가 아니다. 수신함에서 제목·발신자·코드를 확인하고 실제 인증까지 완료해야 한다.
- `EMAIL_DELIVERY_MODE=preview`는 외부 발송을 건너뛰므로 실발송 전에 비워야 한다.
- production의 `EMAIL_FROM` fail-closed 정책은 유지한다. 이번 단계는 로컬 development sandbox로 한정한다.

## Work Objectives

### Core Objective

실제 이메일 한 건이 Resend를 통해 수신함에 도착하고, 그 코드로 Potata 가입 인증과 Credentials 로그인이 완료되는지 안전하게 확인한다.

### Deliverables

- secret을 노출하지 않는 로컬 실발송 준비 상태
- 한 개의 식별 가능한 로컬 테스트 가입 흐름
- Resend 대시보드 접수·수신함 도착·코드 인증·로그인 증거
- 기존 사용자와 운영 DB를 건드리지 않는 cleanup 결과

### Definition of Done

- preview가 아닌 Resend API 호출 1회가 성공한다.
- 수신함에서 Potata 인증 메일과 6자리 코드를 확인한다.
- 해당 코드로 인증한 뒤 Credentials 로그인까지 성공한다.
- 로컬 테스트 사용자와 인증 코드만 정리되고, 운영 DB·배포·도메인 DNS·다른 사용자 데이터는 변경되지 않는다.

### Must Have

- Resend dashboard에서 생성한 **Sending access** API key를 `.env.local`에만 보관한다.
- 도메인이 없으면 Resend 계정 소유자의 이메일 주소만 수신자로 사용한다.
- 한 번의 가입 발송만 허용하고, 재발송은 실패 복구가 필요할 때만 한 번 사용한다.
- 실발송이 끝난 뒤에는 실제 코드 인증과 로그인까지 확인한다.

### Must NOT Have

- API key, 인증 코드, 수신자 이메일을 채팅·Git·테스트 fixture·추적 로그에 기록하지 않는다.
- 운영 DB, Vercel, DNS, Resend 도메인, 결제, 대량/고객 발송을 변경하지 않는다.
- `EMAIL_FROM` fallback을 production에 사용하거나 preview 성공을 실발송 성공으로 취급하지 않는다.

## Verification Strategy

- Test decision: 기존 `lib/email.test.ts`와 signup/verify/login E2E를 회귀 검증한다.
- External QA: 실제 발송·수신은 agent가 API 결과와 로컬 흐름을 확인하고, 수신함 확인은 사용자가 본인 메일함에서 확인한다.
- Evidence: secret·코드·이메일 주소를 제외한 성공/실패 상태만 `evidence/resend-live-email-verification/`에 저장한다.

## Execution Strategy

| 순서 | 작업 | 의존 |
| --- | --- | --- |
| 1 | 설정·경계 preflight | 사용자 제공 API key/수신 주소 |
| 2 | 실발송 준비 상태 확인 | 1 |
| 3 | 가입으로 메일 1건 발송 | 2 |
| 4 | 수신·코드 인증·로그인 | 3 |
| 5 | 테스트 데이터 정리·증거 | 4 |
| 6 | 회귀·범위 검토 | 1–5 |

## TODOs

- [ ] 1. Secret·수신 대상 preflight

  **What to do**:
  - 사용자가 Resend dashboard에서 발급한 Sending access API key를 Git ignore된 `.env.local`에 직접 넣는다.
  - `EMAIL_DELIVERY_MODE`가 preview가 아니도록 비우고, development 환경에서만 sandbox fallback을 사용한다.
  - 테스트 수신자는 Resend 계정 소유자의 수신 가능한 주소로 한정하고, 식별 가능한 새 로컬 테스트 가입 정보를 준비한다.
  - agent는 값 자체를 읽거나 출력하지 않고 존재 여부·Git ignore 상태만 확인한다.

  **Must NOT do**: API key·수신자·인증 코드를 채팅, source, 테스트, Git에 기록하지 않는다.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2–6 | Blocked By: user-provided local secrets.

  **References**:
  - `lib/email.ts` — preview와 production fail-closed 경계.
  - `.env.example` — 추적하지 않는 환경 변수 계약.
  - [Resend API key permissions](https://resend.com/docs/dashboard/api-keys/introduction) — Sending access 범위.

  **Acceptance Criteria**:
  - [ ] `.env.local`은 Git ignore 상태이며 key 값이 추적 diff에 없다.
  - [ ] preview mode가 비활성이고 실발송 경로가 선택된다.
  - [ ] 수신 대상이 sandbox 테스트 제한에 맞는다.

  **QA Scenarios**:
  ```
  Scenario: Safe preflight
    Tool: local environment inspection
    Steps: Verify required variable presence and Git ignore without reading values.
    Expected: Missing input is reported without leaking it; no source or DB change occurs.
    Evidence: evidence/resend-live-email-verification/preflight.txt

  Scenario: Preview guard
    Tool: existing unit test
    Steps: Run the email module's preview and production boundary tests.
    Expected: Preview never calls Resend; production missing sender remains fail-closed.
    Evidence: evidence/resend-live-email-verification/preview-guard.txt
  ```

  **Commit**: NO | Files: no tracked file changes expected.

- [ ] 2. Confirm local database and server readiness

  **What to do**:
  - Start only the existing local PostgreSQL and development server using the protected local environment.
  - Confirm local session and signup endpoints respond before any external email call.
  - Choose a unique test account identifier that is not an existing user and keep it out of logs/evidence.

  **Must NOT do**: use the operating database, alter migrations, or reuse a real customer account.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3–6 | Blocked By: 1.

  **References**:
  - `README.md` — local development baseline and verified auth flow.
  - `app/api/auth/signup/route.ts` — test signup writes a pending local user before mail dispatch.

  **Acceptance Criteria**:
  - [ ] Local DB is reachable and development app is healthy.
  - [ ] No existing account is selected as the test subject.

  **QA Scenarios**:
  ```
  Scenario: Local readiness
    Tool: local HTTP request
    Steps: Open the local signup page and confirm it loads before entering test data.
    Expected: No missing DB/auth secret error.
    Evidence: evidence/resend-live-email-verification/local-ready.txt

  Scenario: Safe abort
    Tool: local environment inspection
    Steps: Stop before signup if DB or Resend preflight is unavailable.
    Expected: No external mail and no new test account are created.
    Evidence: evidence/resend-live-email-verification/local-abort.txt
  ```

  **Commit**: NO | Files: no tracked file changes expected.

- [ ] 3. Execute one actual verification-email send

  **What to do**:
  - Submit exactly one local signup for the prepared test account.
  - Verify that the app reports email dispatch success and Resend accepts the send request.
  - If it fails before acceptance, stop and record the sanitized failure category; do not keep retrying.

  **Must NOT do**: use resend loops, send to an arbitrary recipient, or treat a local `devCode` as delivery proof.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4–6 | Blocked By: 2.

  **References**:
  - `app/api/auth/signup/route.ts` — transaction then email-send sequence and user-facing error.
  - `lib/email.ts` — actual Resend send boundary.
  - [Resend sandbox recipient restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain) — account-owner-only test delivery.

  **Acceptance Criteria**:
  - [ ] Resend accepts one non-preview message request.
  - [ ] No duplicate send is made without a diagnosed failure.

  **QA Scenarios**:
  ```
  Scenario: One real send
    Tool: local browser/API + Resend dashboard
    Steps: Complete signup once, then inspect the corresponding message status in Resend.
    Expected: Dispatch is accepted and app reaches the verification screen.
    Evidence: evidence/resend-live-email-verification/send-accepted.txt

  Scenario: Rejection handling
    Tool: local browser/API
    Steps: Use an intentionally unavailable preflight only in a separate local check.
    Expected: App reports a safe setup failure; no secret appears in the response.
    Evidence: evidence/resend-live-email-verification/send-rejected.txt
  ```

  **Commit**: NO | Files: no tracked file changes expected.

- [ ] 4. Verify inbox delivery, code, and Credentials login

  **What to do**:
  - User confirms the mail arrived in the designated inbox and that sender, subject, and 6-digit code are present.
  - Use the received code once in the local verification screen.
  - Sign in with the same credentials and verify the authenticated state.

  **Must NOT do**: ask the user to paste the email body, code, password, or API key into chat.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 5–6 | Blocked By: 3.

  **References**:
  - `app/api/auth/verify/route.ts` — code verification and verified-user transition.
  - `app/api/auth/[...nextauth]/route.ts` and login UI — existing Credentials session flow.

  **Acceptance Criteria**:
  - [ ] User confirms inbox arrival independently of Resend acceptance.
  - [ ] The exact received code verifies successfully.
  - [ ] Credentials login produces an authenticated session.

  **QA Scenarios**:
  ```
  Scenario: End-to-end verification
    Tool: local browser
    Steps: Enter the received code, follow the login path, and inspect the authenticated navigation state.
    Expected: Verification succeeds once and the account can log in.
    Evidence: evidence/resend-live-email-verification/verify-login.txt

  Scenario: Invalid code guard
    Tool: existing auth route/component tests
    Steps: Run the invalid-code scenario without using the real code.
    Expected: Invalid values are rejected without verifying the account.
    Evidence: evidence/resend-live-email-verification/invalid-code.txt
  ```

  **Commit**: NO | Files: no tracked file changes expected.

- [ ] 5. Clean up only the local test fixture and record sanitized evidence

  **What to do**:
  - Identify the unique local test user and its verification records using the prepared identifier.
  - Remove only that local test data after successful verification; preserve all pre-existing local users and data.
  - Store status-only evidence without email address, code, password, API key, or message identifier.

  **Must NOT do**: delete broad tables, operate on production data, or retain sensitive screenshots/logs.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6 | Blocked By: 4.

  **References**:
  - `prisma/schema.prisma` — User and VerificationCode relations.
  - `plans/admin-qa-inbox.md` — local QA fixture cleanup convention.

  **Acceptance Criteria**:
  - [ ] The exact local test fixture is gone.
  - [ ] Existing local accounts and all operating data remain unchanged.
  - [ ] Evidence contains only pass/fail status and timestamps at a human-readable level.

  **QA Scenarios**:
  ```
  Scenario: Exact fixture cleanup
    Tool: local Prisma read-only checks
    Steps: Compare the unique test identifier before and after cleanup.
    Expected: Only the intended test user and verification rows are removed.
    Evidence: evidence/resend-live-email-verification/cleanup.txt

  Scenario: Scope guard
    Tool: local database count checks
    Steps: Verify no unrelated user/product/order/coupon data was targeted.
    Expected: No broad deletion and no production connection.
    Evidence: evidence/resend-live-email-verification/scope-guard.txt
  ```

  **Commit**: NO | Files: no tracked file changes expected.

- [ ] 6. Run regression checks and update only readiness evidence

  **What to do**:
  - Run focused email/auth tests and the existing typecheck/lint baseline.
  - Verify `git diff` has no secret, source, migration, or accidental environment change.
  - Update roadmap status only if the live flow is fully confirmed; otherwise preserve it as external waitlist with the failed prerequisite noted in non-sensitive evidence.

  **Must NOT do**: change production settings, commit secrets, or claim delivery based only on API acceptance.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: none | Blocked By: 1–5.

  **References**:
  - `lib/email.test.ts` — preview/production boundary tests.
  - `docs/work-plans/roadmap.md` — external readiness sequencing.

  **Acceptance Criteria**:
  - [ ] Email/auth regression tests, typecheck, and lint have no new failure.
  - [ ] Tracked diff contains no secret or unrelated product change.
  - [ ] Roadmap accurately records whether real inbox delivery was confirmed.

  **QA Scenarios**:
  ```
  Scenario: Regression baseline
    Tool: npm test, typecheck, lint
    Steps: Run focused email/auth tests followed by project quality commands.
    Expected: No new error; existing lint warnings remain unchanged.
    Evidence: evidence/resend-live-email-verification/regression.txt

  Scenario: Secret scan
    Tool: git diff check and tracked-file scan
    Steps: Inspect staged and unstaged tracked changes before any commit decision.
    Expected: No API key, recipient, code, password, or local environment file is tracked.
    Evidence: evidence/resend-live-email-verification/secret-scan.txt
  ```

  **Commit**: NO by default | Files: status-only roadmap/evidence only if completion is verified.

## Final Verification Wave

- [ ] F1. Plan Compliance Audit — confirm sandbox-only single-send boundary and no code/config secret change.
- [ ] F2. Security Review — confirm secrets, code, and personal email details are absent from tracked artifacts.
- [ ] F3. Delivery QA — require both Resend acceptance and user-confirmed inbox arrival before success.
- [ ] F4. Scope Fidelity Check — confirm no production DB, deployment, DNS, payment, or customer-impacting operation occurred.

## Commit Strategy

- No code commit is expected.
- If and only if verification completes, commit a status-only roadmap/evidence update after a secret scan. Otherwise leave the roadmap as external waitlist and do not commit a partial claim.

## Success Criteria

- Potata sends exactly one real verification email to the authorized sandbox recipient.
- The recipient confirms inbox arrival, verifies the code, and signs in successfully.
- No secret, customer data, production resource, or unrelated local fixture is changed or exposed.
