# ADR-009: Prisma migration baseline

- 상태: Accepted (로컬 기반만 준비)
- 날짜: 2026-08-21

## Context

Potata는 기능별 schema 변경을 개발 DB와 CI의 `prisma db push`로 반영해 왔다. 현재 `schema.prisma`에는 운영 데이터를 가진 DB가 존재할 수 있지만 migration 이력이 없다. 현재 schema 전체를 기존 DB에 initial migration으로 실행하면 이미 존재하는 enum·table·index와 충돌하므로 데이터 안전성을 보장할 수 없다.

## Decision

현재 `prisma/schema.prisma`를 empty PostgreSQL 기준으로 생성한 `00000000000000_baseline`을 migration 이력의 시작점으로 고정한다.

- 신규·빈 DB와 CI는 `prisma migrate deploy`로 baseline부터 적용한다.
- 기존 운영 DB에는 baseline SQL을 직접 실행하지 않는다.
- 기존 운영 DB는 backup/restore 확인과 schema drift 비교가 먼저다.
- drift가 없을 때만 별도 사용자 승인 후 baseline을 `migrate resolve --applied`로 기록한다.
- drift가 있으면 resolve/deploy를 중단하고 차이를 보존하는 migration 또는 backfill을 별도로 설계한다.
- seed는 migration과 분리하며 운영 DB에 자동 실행하지 않는다.

## Existing database approval procedure

이 문서가 기존 DB baseline 정책의 SSoT다. 아래 preflight는 대상 식별과 증거 수집
단계이며, write 단계인 `migrate resolve`는 마지막 별도 승인을 받기 전까지 실행하지
않는다. 명령 출력에는 연결 문자열이나 비밀값을 기록하지 않는다.

1. **대상 DB 신원 고정**: 운영 담당자가 project ref/instance ID, database name,
   PostgreSQL host, region, 환경명, 점검 시각(UTC)을 콘솔 화면과 함께 기록한다.
   승인된 대상과 하나라도 다르거나 연결 대상을 식별할 수 없으면 즉시 중단한다.

2. **backup 증거 확보**: 점검 직전의 timestamped backup ID, 생성 시각, 보존 기간,
   상태 `Completed`를 기록한다. 별도의 격리된 DB에 해당 backup을 복원하고 접속,
   핵심 table/row count, 앱 smoke test로 복원 가능성을 확인한다. backup 또는 restore
   rehearsal 증거가 없거나 복원이 실패하면 중단한다.

3. **CI artifact 확인**: 빈 PostgreSQL에서 `migrate deploy` → `migrate status` →
   schema parity → production build가 통과한 동일 commit SHA를 기록한다. 하나라도
   실패하면 운영 baseline 절차를 시작하지 않는다.

4. **migration history 읽기 전용 점검**: 승인된 read-only 연결로
   `_prisma_migrations`의 존재와 migration name, started/finished/rolled-back 시각,
   applied step 수를 조회해 결과를 보관한다. table이 이미 있고 history가 비어 있지
   않거나, baseline 이름이 부분/실패 상태로 존재하면 중단한다. baseline SQL은 직접
   실행하지 않는다.

5. **읽기 전용 schema 비교**:

   ```bash
   npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
   ```

   exit `0`과 empty diff만 통과다. exit `2`, 명령 오류, 또는 SQL 차이가 있으면
   resolve/deploy를 중단하고 차이를 보존할 reconciliation migration을 별도 설계한다.

6. **write 승인 checkpoint**: 위 증거 묶음과 정확한 대상 DB를 사용자에게 제시하고
   baseline 이력 등록에 대한 별도 명시적 승인을 받는다. 승인이 없으면 여기서 종료한다.

7. **승인 후 baseline 이력 등록**(운영 DB의 `_prisma_migrations`를 변경함):

   ```bash
   npx prisma migrate resolve --applied 00000000000000_baseline
   npm run db:migrate:status
   ```

8. 이후 migration은 staging의 backup 복원본에서 먼저 `migrate deploy`하고
   데이터·앱 smoke를 검증한 뒤 운영 승인을 받는다.

## Safety constraints

- 운영 DB에서 `prisma db push`, `migrate reset`, baseline SQL 직접 실행 금지.
- CI의 migration/schema parity와 운영 drift 검증 없이 `migrate resolve` 금지.
- 대상 불일치, backup/restore 증거 누락, non-empty migration history, partial baseline,
  drift exit `2`, SQL 차이 중 하나라도 있으면 즉시 중단.
- `DIRECT_URL`은 migration용 direct connection이며 비밀값을 commit하지 않는다.
- schema/migration 변경과 운영 apply는 Ask First 경계다.

## Verification

- baseline SQL은 Prisma `migrate diff --from-empty --to-schema-datamodel ... --script` 생성 결과다.
- baseline에는 `DROP`, `DELETE`, `TRUNCATE`가 없다.
- CI의 빈 PostgreSQL은 `npm run db:migrate:deploy` 후 `prisma migrate diff --exit-code`로 migration artifact와 현재 schema의 parity를 검증한다.
