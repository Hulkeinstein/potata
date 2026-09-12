# MUSINSA-inspired unified signup onboarding

## Goal

신규 이메일·Google 사용자가 인증 직후 홈으로 빠지지 않고 하나의 공통 프로필 온보딩을 완료하게 한다. 기존 가입·핸들 API를 재사용하고 기존 사용자는 방해하지 않는다.

## Research baseline (2026-09-01)

- MUSINSA 현재 가입 첫 단계: 통합계정 안내 → 필수 만 14세 이상/서비스 약관 → 선택 마케팅 개인정보/광고 수신 → 휴대폰 또는 Toss 본인인증.
- MUSINSA FAQ: 등록된 생년월일은 생일 쿠폰 등 실제 혜택에 사용됨.
- Potata 적용 원칙: 인증 수단 선택, 필수/선택 분리, 가입 후 프로필 완성만 차용한다.
- Potata 제외: 한국 전용 휴대폰/Toss 본인인증, 생년월일·성별·전화번호. 실제 목적 없이 수집하지 않는다.

## UAE legal baseline (official sources; counsel review required before publication)

- UAE PDPL, Federal Decree-Law No. 45 of 2021: consent must be clear, provable, written/electronic, and as easy to withdraw as to give; processing must be purpose-limited and data-minimized; data subjects have access/correction/restriction/erasure/objection rights; cross-border processing and security obligations apply.
- UAE Consumer Protection Law No. 15 of 2020 as amended and Cabinet Resolution No. 66 of 2023: UAE e-commerce suppliers must disclose legal identity/licensing/address, accurate product and contracting/payment/warranty information, protect consumer data, and provide Arabic consumer information (other languages may accompany it).
- Modern Technology-Based Trade Law No. 14 of 2023: online traders need the appropriate licence, secure infrastructure, accurate offers, data protection, and digital invoices when trading starts.
- UAE Child Digital Safety framework (2025/2026): under-13 personal-data processing requires verifiable guardian consent and targeted advertising is prohibited; social features may carry additional age-verification duties. Potata must choose an age policy with UAE counsel before public signup.
- These sources establish obligations, not final Potata legal wording. Business identity, licence, controller contact, processors/hosting countries, retention periods, complaint channel, refund/shipping policy, and actual age policy are owner/counsel inputs.

### Official references

- https://www.uaelegislation.gov.ae/en/legislations/1972/download
- https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws
- https://www.uaelegislation.gov.ae/en/legislations/1455/download
- https://www.uaelegislation.gov.ae/en/legislations/2157/download
- https://u.ae/en/information-and-services/business/ecommerce/
- https://u.ae/en/information-and-services/social-affairs/children/Childrens-digital-safety

## Current-state evidence

- 이메일 signup은 name/handle/email/password를 이미 받지만 인증 전에 User와 handle을 생성한다.
- Google OAuth는 email/name/avatar를 upsert한 뒤 항상 홈으로 이동하며 handle은 null이다.
- `/onboarding/handle`은 skip 가능 단일 필드 화면이고 공통 완료 상태/guard가 없다.
- 실제 사용 중인 선택 프로필은 `UserSettings.preferredSize`, `aiCoordinatorEnabled`다.

## Product decisions

### Required in common onboarding

- 표시 이름: trim, 기존 Google 이름 prefill, 유효 길이 제한.
- 고유 handle: 영소문자/숫자/underscore 3–20자, 실시간 availability + transaction unique 방어.
- 현재 Terms of Service 및 Privacy Notice의 특정 published version 확인. 각각 별도 링크와 요약을 제공하고 bundled consent를 금지한다.
- public launch age gate는 counsel-approved 기준을 적용한다. 승인 전에는 local/dev에서만 기능 검증하고 production signup은 release gate로 둔다.

### Optional

- 선호 사이즈: 기존 Settings 계약/allowlist 재사용.
- AI Coordinator 표시: 기존 boolean 설정 재사용. 마케팅 opt-in으로 표현하지 않는다.
- 키(cm)·몸무게(kg): AI 스타일/핏 추천 목적의 선택 정보. 비워도 가입 가능하며 Settings에서 수정·삭제할 수 있고, 합리적 범위와 숫자 형식을 server에서 검증한다.
- avatar: Google 값을 기본으로 보여주고, 온보딩과 Settings에서 동일한 owner-scoped API로 업로드·교체·삭제한다. 전용 public Storage bucket 설정 전에는 업로드가 fail-closed한다.
- 마케팅 이메일 수신: 기본 false, 서비스 이용과 분리, 거부해도 가입 가능, Settings에서 쉽게 철회. 실제 발송 시스템과 policy가 준비되기 전에는 저장만 가능하고 발송하지 않는다.

### Completion and compatibility

- `User.onboardingCompletedAt DateTime?`를 명시적 완료 SSoT로 추가한다.
- migration에서 기존 사용자 중 name+handle이 있는 계정은 완료 처리한다.
- handle-null 기존 계정은 기존 서비스 접근을 갑자기 막지 않고 banner/fallback을 유지한다.
- migration 이후 생성되는 신규 사용자만 온보딩 완료 전 보호 write/개인화 화면 진입을 제한한다.
- 임시 lorem ipsum 또는 타사 약관 복사 금지. 정책 문서는 Potata 사실관계와 owner 입력을 바탕으로 작성하고 counsel-approved 상태 전에는 `DRAFT/NOT_FOR_PRODUCTION` release gate를 유지한다.

## Target flow

### Email

1. `/signup`: provider 선택 + email/password만 수집한다.
2. signup은 미인증 계정을 만들되 handle을 예약하지 않는다.
3. 이메일 인증 완료 → 기존 안전 경계대로 `/login?verified=1`.
4. credentials 로그인 → server completion guard → `/onboarding/profile`.
5. 이름/handle 필수 + 선택 설정 저장 → 원래 same-origin 목적지 또는 홈.

### Google

1. `/signup`의 Google 버튼은 account chooser와 onboarding callback을 사용한다.
2. `syncOAuthUser`는 `{ userId, created, needsOnboarding }`을 반환한다.
3. 기존 사용자의 직접 수정한 name/avatar는 매 로그인마다 덮어쓰지 않는다.
4. 신규/미완료 계정 → `/onboarding/profile`; 완료 계정 → 원래 목적지.

## Implementation tasks

### 1. Lock behavior with RED tests

- email signup API: handle을 받거나 예약하지 않음, 미인증 재시도 멱등.
- verify→login→onboarding redirect 계약.
- Google 신규 user `needsOnboarding=true`, 완료 user false, 동일 email 병합.
- Google 재로그인 시 완료 profile name/handle 보존.
- onboarding GET/PATCH auth, validation, unique race, owner scope, transaction.
- safe `returnTo`: 상대 경로만 허용하고 onboarding/auth loop와 외부 URL 거부.
- 기존 완료 user와 legacy handle-null user compatibility.

### 2. Add additive migration

- `User.onboardingCompletedAt DateTime?` 추가.
- `UserSettings.heightCm`, `UserSettings.weightKg` nullable 필드를 additive로 추가하고 값이 없으면 저장/추정하지 않는다.
- `LegalDocumentVersion`(type, version, locale, contentHash, publishedAt, status)과 append-only `UserConsent`(user, document version, action GRANT/WITHDRAW, occurredAt, source)를 추가한다.
- 선택 마케팅 동의는 별도 purpose/version/action으로 저장하며 필수 약관과 결합하지 않는다.
- 기존 name+handle 사용자를 migration SQL에서 완료 처리.
- DROP/DELETE/TRUNCATE 금지.
- 빈 DB migrate deploy, local DB status/diff parity, rollback/restore 경계 문서화.

### 3. Create typed onboarding domain contract

- `lib/onboarding.ts`: required fields parser, preferred-size parser 재사용, safe returnTo parser, completion predicate.
- client/server가 공유하는 DTO를 한 곳에 둔다.
- `any`, raw Prisma error, arbitrary userId body 입력 금지.

### 4. Implement owner-scoped onboarding API

- `GET /api/users/me/onboarding`: session id 기준 name/avatar/handle/settings/completion 반환.
- `PATCH /api/users/me/onboarding`: name+handle+settings(선택 height/weight 포함)+정확한 legal document version들을 한 transaction으로 저장하고 완료 timestamp 기록.
- handle P2002는 409의 고정 메시지; 내부 오류 비노출.
- 완료 후 handle 변경은 기존 정책대로 금지하며 이름/설정 수정은 Settings/My Page 경로에 맡긴다.
- consent timestamp를 client에서 신뢰하지 않고 server time으로 기록한다. IP/raw user-agent는 필요성·보존정책 승인 전 수집하지 않는다.

### 5. Create policy surfaces and release gate

- `/legal/terms`, `/legal/privacy`, `/legal/marketing`을 Arabic/English 우선으로 제공하고 Korean은 보조 번역으로 둔다.
- 각 전문 화면은 실제 본문·문서 버전·draft/non-production 상태와 온보딩 복귀 동선을 제공한다. 빈 placeholder 페이지나 링크만 있는 화면은 금지한다.
- Privacy Notice에는 controller identity/contact, purposes/legal bases, data categories, processors/recipients, cross-border transfers, retention, rights/withdrawal, security/contact/complaint 절차를 포함한다.
- Terms에는 account rules, acceptable use, content licence/moderation, suspension, IP, pre-launch/non-sale status를 포함한다. 판매 전환 시 contracting/payment/shipping/returns/warranty/invoice 조항을 별도 승인으로 추가한다.
- `LEGAL_DOCS_PRODUCTION_READY` 같은 fail-closed release validation을 두어 승인된 문서 version과 사업자 필수값이 없으면 production 신규 signup을 열지 않는다.
- 법률 문구는 official-source grounded draft로 생성하되 화면에 draft 상태를 명확히 하고 counsel 승인을 production 전 acceptance로 둔다.

### 6. Refactor signup into focused components

- 큰 `app/signup/page.tsx`에서 provider chooser와 email credentials form을 분리한다.
- 이메일 signup에서 name/handle을 제거하고 ‘프로필은 인증 후 설정’ 안내.
- Google에 `prompt=select_account`, callback `/onboarding/profile`.
- Apple 준비중 상태는 그대로 유지.

### 7. Build `/onboarding/profile`

- Google name/avatar 또는 email 기본값 prefill.
- 필수 name+handle, 선택 preferred size+AI setting.
- 선택 height(cm)/weight(kg)는 수집 목적을 인접 안내하고 빈 값·삭제를 지원한다.
- 단계는 한 페이지로 유지하고 필수/선택을 시각적으로 명확히 구분.
- skip 버튼 제거; 완료 전 이탈 시 다음 로그인에서 재진입.
- 무신사처럼 필수 동의와 선택 마케팅을 별도 행으로 표시하고, ‘모두 동의’가 선택 거부권을 흐리지 않도록 각각 변경 가능하게 한다.
- 각 필수 문서는 새 탭/모달로 전문 확인 가능하고 document version을 화면에 표시한다.
- mobile 390px, keyboard, focus, error summary, loading/retry 지원.
- 기존 `/onboarding/handle`은 safe returnTo를 보존해 새 페이지로 redirect.

### 8. Add server completion guard

- DB를 읽는 server helper로 completion 판단; JWT handle을 SSoT로 사용하지 않는다.
- onboarding/auth/public pages를 제외해 redirect loop 방지.
- 신규 미완료 사용자의 My Page, posting, social/benefit write 진입을 onboarding으로 보낸다.
- 각 API write는 자체 auth/completion 재검증하여 middleware 우회를 막는다.
- 기존 legacy handle-null 사용자는 강제 전환하지 않는 compatibility flag/created-at boundary를 사용한다.

### 9. Clean duplicate legacy UX

- `HandleSetupBanner`는 legacy fallback으로만 유지하거나 공통 profile CTA로 변경.
- My Posts의 handle 설정 링크는 `/onboarding/profile`로 통합.
- social-graph/roadmap/session 문서의 비강제 정책을 신규 사용자 공통 onboarding 정책으로 갱신.

### 10. Verification

- Focused RED→GREEN tests.
- Full typecheck, lint, Vitest, production build.
- Local PostgreSQL migration status + schema diff.
- Browser E2E:
  - 신규 Google → 계정 선택 → profile onboarding → home.
  - 완료 Google → 바로 home.
  - 신규 email → verify → login → profile onboarding.
  - refresh/back/direct API/duplicate handle/DB failure.
  - 필수 동의 누락 차단, 선택 마케팅 거부 가입 성공, 정확한 version 기록, 철회 후 signup 상태 유지.
  - height/weight blank 성공, 유효 범위, 경계/비수치 거부, Settings clear-to-null, owner scope.
  - Terms/Privacy/Marketing 전문 본문·version·draft 표시·온보딩 복귀를 desktop/mobile에서 확인.
  - production legal readiness 누락 시 fail-closed, dev QA는 명시적 preview mode에서만 허용.
  - desktop 1280×900, mobile 390×844, console errors 0.
- QA fixture 삭제; 운영 DB/외부 메일 추가 발송/배포/commit/push는 별도 승인 전 금지.

## Acceptance criteria

- 신규 Google 사용자가 handle 없이 홈에 들어갈 수 없다.
- 신규 email 사용자의 handle은 인증 전에 선점되지 않는다.
- 이메일·Google 모두 동일한 profile UI/API를 사용한다.
- 표시 이름과 handle 저장은 원자적이며 타인 계정 수정이 불가능하다.
- 선택 설정은 가입 실패 원인이 되지 않으며 목적이 명확하다.
- 기존 완료 사용자는 추가 온보딩 없이 로그인한다.
- 약관·개인정보 전문과 versioned consent evidence가 있으며 선택 마케팅 거부가 가입을 막지 않는다.
- 사업자/법률 필수 입력 또는 counsel 승인 전 production signup은 열리지 않는다.
- 모든 quality gate와 two-path browser E2E가 통과한다.

## Required owner/counsel input before production

- 법인/상호, 사업자·e-commerce licence 정보, UAE 주소, 고객지원/개인정보 연락처.
- 적용 관할/자유구역(DIFC/ADGM 여부 포함)과 대상 국가.
- Supabase/Vercel/Resend/Google 등 processor 목록, 저장 위치·국외 이전 근거, 실제 retention schedule.
- 공개 가입 최소 연령과 guardian-consent/age-assurance 방식.
- 판매 개시 시 배송·반품·환불·보증·결제·세금·invoice 정책.
- UAE-qualified counsel의 Arabic/English 문구 및 release 승인.

## Deferred

- phone/Toss identity verification.
- birthday, gender, country/language, style/category/brand preferences.
- Apple login, marketing automation. (avatar upload는 구현 완료, 실제 Storage bucket 생성·운영 검증만 external waitlist.)
