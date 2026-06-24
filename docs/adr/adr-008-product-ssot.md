# ADR-008 — 상품 SSoT: 관리자 등록 상품은 DB가 진실의 원천

## Status

Accepted — `feat/admin-product-upload` 브랜치에서 도입 (관리자 상품 등록 트랙 PR1)

## Date

2026-06-24

## Context

관리자 상품 등록 트랙(운영자가 보호된 UI에서 신상품 + 이미지를 등록)을 시작하면서, 상품 데이터의 **진실의 원천(SSoT)** 이 충돌한다.

1. **product-detail 스킬이 seed.ts를 SSoT로 확립** — `.claude/skills/product-detail/SKILL.md:16`은 "직접 DB write 대신 `prisma/seed.ts`의 `PRODUCTS` 배열을 SSoT로 보고 항목을 추가/갱신한 뒤 `npx prisma db seed`로 반영한다. **seed.ts가 진실의 원천, DB는 파생물** — DB 리셋/재시드해도 콘텐츠가 보존된다"고 명시한다. 이는 버전관리·재현성을 위한 의도된 설계였다(ADR-005가 카탈로그를 "읽기 전용 MVP, 관리자 등록 없음"으로 둔 전제와 정합).

2. **관리자 UI는 런타임에 DB로 직접 write** — admin 등록 폼은 서버 런타임에 `prisma.product.create`로 DB에 상품을 만든다. 이 상품은 `seed.ts`에 존재하지 않는다. 서버리스 프로덕션에서는 코드 파일(`seed.ts`)을 런타임에 수정·커밋할 수 없으므로, admin 상품을 seed.ts에 써넣는 것은 불가능하다.

3. **"재시드 시 소실" 통념의 정정 (실측)** — `prisma/seed.ts:221`은 `deleteMany` 없이 `upsert(where:{id})`만 수행한다. 즉 `npx prisma db seed`를 다시 실행해도 admin이 만든 DB 상품은 **지워지지 않는다**(seed는 비파괴·멱등 upsert). admin 상품이 실제로 소실되는 경우는 **전체 DB 리셋**(`prisma migrate reset` / `db push --force-reset`)뿐이다. 따라서 충돌은 *빈번한 데이터 손실 버그*가 아니라 **개념적 SSoT 소유권** 문제다.

ADR-005는 "관리자 상품 등록 UI"를 향후 확장 트랙으로 예고했고(범위 외), ADR-007은 그 이미지 업로드 인프라를 선행 도입했다. 본 ADR은 ADR-005가 예고한 그 트랙이 도입되는 시점의 SSoT 소유권을 확정한다.

## Options Considered

### 결정: 관리자/런타임 상품의 진실의 원천

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. DB가 런타임 SSoT, seed.ts는 부트스트랩 전용 (채택)** | 운영 UI의 본질에 부합(런타임 등록은 DB가 진실), 서버리스에서 동작, seed 비파괴 upsert와 충돌 없음 | 전체 DB 리셋 시 admin 상품 소실 → DB 자체를 백업 대상으로 관리해야 함 |
| B. admin이 seed.ts 파일에 써넣기 | seed.ts 단일 SSoT 유지, 버전관리·리셋 보존 | 서버리스 프로덕션에서 파일 write/커밋 불가 → **구현 불가능** |
| C. 하이브리드(DB 등록분을 주기적으로 seed.ts로 역방출) | 양쪽 장점 일부 | export 잡·충돌 병합 복잡도 → MVP에 과함(YAGNI) |

### 부수 결정: 관리자 상품 `id` 생성 방식

`Product.id`는 `String @id`이며 `@default`가 없어(ADR-005 결정1) 생성 시 애플리케이션이 id를 직접 공급해야 한다.

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. `crypto.randomUUID()` (채택)** | 의존성 0(Node 내장), 충돌 사실상 불가, seed의 숫자 네임스페이스("1"~"9")와 명확히 분리 | id가 길다(상세 URL이 UUID) |
| B. 숫자 max+1 (product-detail 스킬 방식) | 짧은 id | admin과 스킬이 동시에 같은 숫자를 할당할 경쟁 → 충돌 위험 |
| C. `cuid()` | 짧고 정렬가능 | Prisma가 `@default` 없이 수동 호출용 cuid를 공개 API로 노출하지 않음 → 별도 의존성 필요(Ask First) |

## Decision

**옵션 A 채택 — 관리자/런타임 상품은 DB가 진실의 원천, seed.ts는 초기 부트스트랩 전용.**

- **소유권 분리(두 가지 상품 출처가 공존)**:
  - **큐레이션/시드 상품** — `prisma/seed.ts`의 `PRODUCTS`가 SSoT. product-detail 스킬이 관리하며, 버전관리되고 전체 DB 리셋에도 보존된다. 스킬의 기존 워크플로우(seed.ts 편집 → `db seed`)는 **그대로 유효**하다.
  - **관리자/런타임 상품** — admin UI가 `prisma.product.create`로 만든 상품은 **DB가 진실**이며 seed.ts에 존재하지 않는다. 전체 DB 리셋 시 소실되므로 **DB 자체가 백업 대상**이다.
- **seed의 비파괴성 보장**: seed는 `deleteMany` 없이 `upsert`만 한다(현 구현 유지). 따라서 `npx prisma db seed`는 admin 상품을 절대 건드리지 않는다. seed에 `deleteMany`/destructive 동기화를 **추가 금지**(불변 가드레일).
- **id 생성**: 관리자 상품의 `Product.id`는 `crypto.randomUUID()`로 서버에서 생성한다. 숫자 max+1 방식 금지(스킬과 경쟁). 신규 의존성 0.
- **product-detail 스킬 문서 정합**: SKILL.md의 "seed.ts가 진실, DB는 파생물" 서술은 **스킬이 관리하는 큐레이션 상품에 한정**됨을 명시하는 한 줄 주석을 추가한다(스킬의 동작 자체는 불변).

> 본 트랙의 다른 두 결정 — **admin 권한 게이트 = env `ADMIN_EMAILS` allowlist**(User 스키마 무변경), **상품 이미지 = 신규 `product-images` public 버킷 + Storage 헬퍼 일반화** — 은 아키텍처 SSoT가 아닌 구현 결정이므로 work-plan(`docs/work-plans/admin-product-upload.md`)의 결정표에 기록한다.

## Consequences

### 긍정

- **운영 UI 동작**: 관리자가 등록한 상품이 DB에 영속되어 카탈로그/상세에 즉시 노출(ISR `dynamicParams=true`로 신규 id 상세페이지 on-demand 생성 — ADR-005 결정3 재사용).
- **두 워크플로우 공존**: 코드로 큐레이션하는 product-detail 스킬과 런타임 admin 등록이 충돌 없이 병행. seed 비파괴 upsert가 이를 보장.
- **신규 의존성 0**: id는 Node 내장 `crypto.randomUUID()`, 권한은 env allowlist → 스키마·패키지 변경 없음.

### 제약 및 트레이드오프

- **전체 DB 리셋 시 admin 상품 소실**: seed.ts에 없으므로 `migrate reset`/`--force-reset` 시 복구 불가 → 운영자는 DB(Supabase) 자체를 백업으로 관리해야 한다. dev에서 리셋 시 admin 테스트 상품이 사라지는 것은 정상 동작.
- **id 가독성**: admin 상품 상세 URL이 UUID(`/product/<uuid>`)로 길다. 큐레이션 상품의 짧은 숫자 id와 혼재(수용 — 기능 영향 없음).
- **백필 부재**: 기존 seed 상품을 admin이 "DB에서 수정"하면 그 변경은 seed.ts에 반영되지 않아 재시드 시 seed 값으로 되돌아간다. admin은 **신규 등록**이 주 용도이며, 큐레이션 상품 수정은 스킬(seed.ts) 경로를 쓰는 것이 원칙(혼동 방지). 본 트랙 범위는 **등록(create)만**, 수정/삭제는 범위 외.

### ADR-005와의 관계

ADR-005는 카탈로그를 "읽기 전용 MVP, 관리자 등록 없음"으로 두고 관리자 등록 UI를 향후 트랙으로 예고했다. 본 ADR이 그 트랙을 도입하며, ADR-005의 **불변 결정은 유지**한다: `Product.id = String @id`(수동 공급 — 본 ADR의 randomUUID가 그 책임을 이행), 이미지 필드(`imageUrl`/`images String[]`), 상세 ISR. 본 ADR은 ADR-005의 "수동 id 관리는 애플리케이션 책임"(Consequences)을 admin 경로에서 구체화한다.

### ADR-007과의 관계

ADR-007(Supabase Storage)이 OOTD용으로 도입한 server-only + REST + service_role + public 버킷 + 보상 삭제 패턴을 본 트랙이 **재사용**한다(ADR-007이 "향후 관리자 상품 이미지 업로드도 이 인프라 재사용"으로 예고). 단, 버킷은 OOTD `ootd-images`와 분리된 신규 `product-images`를 쓰고, `lib/supabase-storage.ts`는 bucket을 파라미터화해 일반화한다(기존 OOTD 래퍼는 유지 — 무수정). next.config `remotePatterns`는 동일 Supabase 프로젝트라 변경 불필요.

### product-detail 스킬과의 관계

스킬의 seed.ts 기반 워크플로우와 가드레일("스키마 변경 금지", "외과적 변경")은 **그대로 유효**하다. 본 ADR은 스킬을 폐기하지 않으며, 스킬이 다루지 않는 *런타임 등록* 경로의 SSoT만 DB로 확정한다. SKILL.md의 전역적 "DB는 파생물" 서술에 "스킬 관리 상품 한정" 주석을 더한다.
