# Potata

한국 패션 상품을 UAE 사용자에게 소개하는 커머스·소셜 앱입니다. 상품 탐색과 검색, 장바구니·주문, 리뷰·Q&A, AI try-on, OOTD 피드와 팔로우 기능을 제공합니다.

## Stack

- Next.js 16 / React 19 / TypeScript
- Prisma / PostgreSQL (Supabase)
- Auth.js (`next-auth` v5) / Google OAuth / Credentials
- Supabase Storage / Resend / Replicate
- Vitest / Testing Library / GitHub Actions

## Local setup

```bash
npm ci
cp .env.example .env.local
# Windows PowerShell: Copy-Item .env.example .env.local
npx prisma generate
npm run db:migrate:deploy
npm run dev
```

`.env.local`의 placeholder를 실제 개발용 값으로 교체해야 DB 조회, 로그인, 이메일, 업로드, AI try-on이 동작합니다. 비밀값은 commit하지 않습니다.

## Quality gates

```bash
npx prisma generate
npx tsc --noEmit
npm run lint
npm run test
npm run build
```

`npm run build`는 카탈로그 페이지를 prerender하면서 DB를 조회하므로 유효한 `DATABASE_URL`이 필요합니다. DB 통합테스트는 CI 또는 `RUN_INTEGRATION=1`과 테스트 DB에서 실행합니다.

## Database migrations

- 신규·빈 DB/CI: `npm run db:migrate:deploy`
- 기존 운영 DB: baseline SQL을 실행하지 않습니다. CI의 migration/schema parity가 통과한 상태에서 backup/restore를 확인하고 `DIRECT_URL` 기준 schema drift를 읽기 전용으로 비교합니다.
- drift가 0일 때만 별도 승인 후 `npx prisma migrate resolve --applied 00000000000000_baseline`로 이력만 등록합니다.
- drift가 있으면 resolve·deploy를 중단하고 실제 DB 차이를 보존 migration으로 먼저 조정합니다.
- seed는 migration과 분리하며 운영 DB에 자동 실행하지 않습니다.

## Deployment readiness

> 로컬 준비는 완료되었고 기능 개발은 계속 진행합니다. 도메인/Resend 실발송, 운영 DB baseline 승인, Vercel·Supabase·Google·Replicate 설정과 실제 배포는 owner 접근·설정 및 별도 승인 대기 상태입니다. 현재 목록은 [Master roadmap의 External waitlist](docs/work-plans/roadmap.md)를 따르며, 운영 DB 절차는 아래 ADR-009가 계속 권위 있는 SSoT입니다.

### Locally verified

- 개발 전용 PostgreSQL에서 baseline migration과 seed 적용
- signup → preview verification → credentials login E2E 확인(실제 이메일 미발송)
- typecheck, lint, unit tests, DB-backed production build 실행
- CI가 ephemeral PostgreSQL에서 deploy → status → schema parity → build를 수행하도록 구성

### Values the operator must provide

- Vercel Production/Preview/Development별 `NEXT_PUBLIC_BASE_URL`과 `NEXTAUTH_URL`의 정확한 HTTPS origin
- 충분히 긴 `NEXTAUTH_SECRET`, Google OAuth client ID/secret, 운영 callback URL
- Supabase pooler `DATABASE_URL`(`pgbouncer=true`)과 migration용 direct `DIRECT_URL`
- `SUPABASE_URL`과 서버 전용 `SUPABASE_SERVICE_ROLE_KEY`(클라이언트 노출 금지)
- Resend API key와 검증된 도메인의 `EMAIL_FROM`(production 필수)
- Replicate `REPLICATE_API_TOKEN`, 운영 관리자 `ADMIN_EMAILS` allowlist

### External-console evidence required before deploy

- Vercel env scope와 deployment target, 운영 origin이 위 URL과 일치하는지 확인
- Supabase project ref/region/DB identity, timestamped backup, 격리 restore rehearsal 증거
- public Storage bucket `ootd-images`, `product-images`, `review-images` 존재 및 공개 범위 확인
- `next.config.ts`의 Supabase image hostname이 대상 project ref와 일치하는지 확인
- Resend sender domain이 Verified이고 `EMAIL_FROM` 주소가 그 도메인에 속하는지 확인
- Google OAuth 운영 callback, Replicate access, admin allowlist의 소유자 승인 확인
- GitHub main branch ruleset이 PR CI 성공을 merge 조건으로 요구하는지 확인
- production 배포 후 signup → 실제 email verify → login smoke test 승인

기존 운영 DB baseline 절차의 SSoT는 [ADR-009](docs/adr/adr-009-prisma-migration-baseline.md)입니다. 과거 문서의 `db push` 지시는 운영 적용 근거로 사용하지 않습니다. 운영 DB에는 baseline SQL을 실행하지 않으며 backup/restore, read-only history/drift 증거를 검토한 뒤 별도 승인된 `migrate resolve --applied`만 수행합니다.

실제 운영 비밀값과 외부 서비스 설정은 Vercel/Supabase/Resend/Google/Replicate 대시보드에서 관리합니다. 이 로컬 점검은 외부 설정이 완료되었다는 증거가 아닙니다.

## Project docs

- [Master roadmap](docs/work-plans/roadmap.md)
- [Architecture decisions](docs/adr)
- [Migration baseline decision](docs/adr/adr-009-prisma-migration-baseline.md)
- [Work plans](docs/work-plans)
- [Agent guidance](AGENTS.md)
