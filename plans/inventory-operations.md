# 재고 운영 관리 계획

## TL;DR

> **Summary**: 옵션별 재고를 직접 덮어쓰지 않고, 관리자 조정만 append-only 이력으로 기록한다. 관리자 카탈로그에는 옵션당 1~3개 저재고 상태와 필터를 제공한다.
> **Deliverables**: 안전한 재고 조정 API·이력, 관리자 조정 UI, 저재고 조회·필터, 자동/통합/UI 검증.
> **Effort**: Medium
> **Parallel**: NO
> **Critical Path**: 조정 모델·트랜잭션 → 관리자 API → 조정 UI·저재고 조회 → 검증

## Context

### Original Request

- 상품 운영 개선으로 재고 입고·조정 이력과 재고 부족 표시를 추가한다.
- 재고 부족 기준은 옵션당 3개 이하로 한다.

### Interview Summary

- 상품은 `ProductVariant`의 size/color/stock/manual sold-out으로 옵션 재고를 관리한다.
- 고객 주문은 재고 조건부 차감과 Serializable transaction을 이미 사용한다.
- 이번 작업은 결제·예약 재고·발주·재입고 메일·환불 재고 복구를 다루지 않는다.

### Gap Review (addressed)

- 기존 관리자 상품 수정은 절대 재고값을 바로 저장해 주문 차감과 경합할 수 있다. 이 경로에서 재고 변경을 제거하고 별도 조정 API로 분리한다.
- 모든 조정의 전후 수량·사유·실행 관리자는 서버에서 하나의 transaction 안에 기록한다.
- 주문 차감은 이번 이력에 소급 기록하지 않으므로 화면명은 `관리자 재고 조정 이력`으로 제한한다.

## Work Objectives

### Core Objective

관리자가 옵션 재고를 입고·정정·폐기 방식으로 안전하게 조정하고, 부족 재고를 빠르게 찾도록 한다.

### Deliverables

- append-only `InventoryAdjustment` 모델과 additive Prisma migration
- 관리자 전용 조정 서비스·API·멱등성·동시성 보호
- 상품 편집의 재고 직접 수정 제거 및 조정 패널
- 제품/옵션별 관리자 조정 이력과 저재고 필터·상태

### Definition of Done

- [ ] 재고 조정은 관리자만 실행하고, 사유·관리자·서버 계산 전후 수량을 남긴다.
- [ ] 동일 멱등 키의 동일 요청은 한 번만 적용되며, 다른 요청은 충돌로 거절된다.
- [ ] 재고가 음수가 될 수 없고 주문 차감과 동시 실행해도 재고가 깨지지 않는다.
- [ ] 재고 0은 품절, 1~3은 저재고, 4 이상은 정상으로 구분된다.
- [ ] `npm test -- --run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`가 통과한다.

### Must Have

- 조정 유형: `RECEIVE`(양수), `CORRECTION`(양수 또는 음수), `DISPOSAL`(음수).
- 조정값은 절대 수량이 아닌 signed delta로 입력한다.
- 사유는 빈 값 불가, 최대 길이를 서버에서 제한한다.
- 수동 품절은 기존대로 유지하되 재고 조정 이력에는 포함하지 않는다.
- 저재고 판정은 수동 품절 여부와 무관하게 실제 물리 재고를 기준으로 한다. 화면 상태 표시는 수동 품절을 우선한다.

### Must NOT Have

- 결제·쿠폰·포인트·주문 상태를 변경하지 않는다.
- 재고 예약, 구매 주문/발주, 다창고, 자동 재입고 알림, 환불 자동 재입고를 추가하지 않는다.
- 조정 이력 수정·삭제 API를 만들지 않는다.
- 기존 주문 차감 행을 새 조정 이력에 소급 생성하지 않는다.

## Verification Strategy

- Test decision: Vitest RED→GREEN→refactor, PostgreSQL guarded integration test.
- QA policy: 관리자/비관리자·정상/오류·동시성·desktop/mobile 시나리오를 모두 agent가 실행한다.
- Evidence: `evidence/inventory-operations/`에 migration·integration·browser 결과를 남긴다.

## Execution Strategy

### Execution Waves

1. 모델·도메인 계약과 migration
2. 권한·멱등성·Serializable 조정 API
3. 관리자 UI와 저재고 조회·필터
4. 전체 회귀·동시성·브라우저 검증

### Dependency Matrix

| Task | Depends on | Blocks |
| --- | --- | --- |
| 1. 모델·계약 | 없음 | 2, 3, 4 |
| 2. 조정 API | 1 | 3, 4 |
| 3. UI·저재고 | 1, 2 | 4 |
| 4. 검증 | 1, 2, 3 | 없음 |

## TODOs

- [ ] 1. 재고 조정 데이터 계약과 migration 추가

  **What to do**: `InventoryAdjustment`에 variant·actor relation, 조정 유형, signed delta, 서버 계산 전후 재고, 사유, 생성 시각, actor-bound idempotency key와 request fingerprint를 추가한다. `[variantId, createdAt]`, `[actorId, createdAt]` index를 만들고 immutable audit row를 생성만 가능하게 한다.

  **Must NOT do**: `ProductVariant.stock` 기본값·수동 품절·주문 모델을 바꾸지 않는다.

  **References**:
  - `prisma/schema.prisma:300-312` — 현재 옵션 재고 모델
  - `lib/benefits/admin-service.ts` — 관리자 write의 reason/idempotency 관례
  - `prisma/migrations/20260826110000_product_variant_inventory/migration.sql` — 최근 additive inventory migration

  **Acceptance Criteria**:
  - [ ] 새 migration은 destructive SQL 없이 빈 DB와 로컬 개발 DB에 적용된다.
  - [ ] 유효/음수 final stock/idempotency 충돌을 도메인 단위 테스트가 구분한다.

  **QA Scenarios**:
  ```
  Scenario: 허용 조정 계약
    Tool: Vitest
    Steps: RECEIVE +5, CORRECTION -2, DISPOSAL -1을 파싱한다.
    Expected: 각 유형과 signed delta가 명확하게 저장 가능한 typed input이 된다.

  Scenario: 잘못된 조정 계약
    Tool: Vitest
    Steps: 빈 사유, 0 delta, DISPOSAL 양수, 음수 최종 재고를 입력한다.
    Expected: 경계에서 거절되고 stock은 변경되지 않는다.
  ```

  **Commit**: NO | Files: `prisma/schema.prisma`, `prisma/migrations/*`, `lib/inventory-*`

- [ ] 2. 관리자 전용 재고 조정 서비스와 API 구현

  **What to do**: `/api/admin/inventory-adjustments`에 `auth()`·`isAdmin`을 적용한다. 요청의 variant ID, type, delta, reason, idempotency key를 검증하고, Serializable transaction에서 현재 stock을 읽어 final stock을 계산한 뒤 조건부 update와 audit insert를 원자적으로 수행한다. P2034 경합은 제한 재시도 후 충돌 응답으로 종료한다. 동일 actor·payload 재시도는 기존 결과를 반환하고, 같은 key의 다른 payload는 거절한다.

  **Must NOT do**: `app/api/admin/catalog/[id]/route.ts` 또는 `updateAdminProduct`로 stock을 직접 저장하지 않는다.

  **References**:
  - `app/api/orders/route.ts:79-112` — 주문 재고 조건부 차감과 transaction
  - `app/api/admin/catalog/[id]/route.ts` — 기존 관리자 auth/validation 경계
  - `lib/inventory.integration.test.ts` — 실제 PostgreSQL 동시성 검증 패턴

  **Acceptance Criteria**:
  - [ ] 비관리자 요청은 fail-closed한다.
  - [ ] server-calculated before/after, actor, reason이 하나의 adjustment row에 남는다.
  - [ ] 재고 차감과 관리 조정이 동시에 실행돼도 음수 재고가 되지 않는다.

  **QA Scenarios**:
  ```
  Scenario: 입고와 replay
    Tool: Vitest + PostgreSQL integration
    Steps: stock 5 옵션에 RECEIVE +3을 같은 idempotency key로 두 번 보낸다.
    Expected: stock 8, adjustment row 1개, 두 번째 요청은 같은 결과를 반환한다.

  Scenario: 재고 부족/권한/충돌
    Tool: Vitest + PostgreSQL integration
    Steps: 비관리자 요청, DISPOSAL -6, 같은 key 다른 payload, 마지막 1개 주문과 -1 관리자 조정을 경쟁시킨다.
    Expected: 권한·유효성·멱등성 충돌은 거절되고 최종 stock은 0 이상이다.
  ```

  **Commit**: NO | Files: `app/api/admin/inventory-adjustments/*`, `lib/inventory-*`, tests

- [ ] 3. 관리자 재고 조정 UI와 저재고 탐색 추가

  **What to do**: 상품 편집 화면에서 절대 재고 number input을 제거하고, 옵션별 current stock·수동 품절 상태·delta input·유형·사유·저장 버튼·최근 조정 이력을 제공한다. 관리자 카탈로그 API와 UI에는 `all|low-stock|sold-out|active|inactive` filter를 추가하고, 옵션 1~3개가 하나라도 있으면 저재고 badge를 표시한다. 0은 품절, 수동 품절은 상태 우선 표기한다.

  **Must NOT do**: 고객 상품 상세의 기존 옵션 선택 UX나 수동 품절 동작을 바꾸지 않는다.

  **References**:
  - `components/admin/AdminProductEditForm.tsx:60-63` — 현 옵션별 재고 UI를 대체할 위치
  - `components/admin/AdminProductCatalogClient.tsx:71-74` — 현 합계 재고/상태 계산
  - `lib/admin-product-catalog.ts` — 관리자 목록 DTO/query

  **Acceptance Criteria**:
  - [ ] 관리자 목록이 옵션 1~3개의 상품을 저재고로 찾고 filter한다.
  - [ ] 관리자 편집 UI는 직접 재고 덮어쓰기를 제공하지 않는다.
  - [ ] 이력은 변조할 수 없는 server DTO만 보여 주고 페이지네이션한다.

  **QA Scenarios**:
  ```
  Scenario: 저재고 입고 운영
    Tool: Browser desktop/mobile
    Steps: stock 2 옵션을 low-stock filter로 찾고 RECEIVE +5, 사유 입력 후 저장한다.
    Expected: stock 7, 저재고 badge 제거, 이력에 actor/type/delta/before/after/reason이 보인다.

  Scenario: 품절과 수동 품절 구분
    Tool: Browser desktop/mobile
    Steps: stock 0 옵션과 stock 5 + manual sold-out 옵션을 연다.
    Expected: 전자는 품절, 후자는 수동 품절로 표시되며 물리 저재고 판정은 stock 기준으로 유지된다.
  ```

  **Commit**: NO | Files: admin catalog/edit components, catalog API/service, tests

## Final Verification Wave

- [ ] F1. Plan compliance audit — diff가 정의된 포함/제외 범위와 일치하는지 확인한다.
- [ ] F2. Code/security review — actor binding, immutable audit, server-trusted before/after, transaction·idempotency를 점검한다.
- [ ] F3. Real QA — local PostgreSQL에서 admin/비관리자와 desktop/mobile을 검증한다.
- [ ] F4. Quality gates — `npx prisma migrate status`, `npx tsc --noEmit`, `npm run lint`, `npm test -- --run`, `npm run build`를 실행한다.

## Commit Strategy

검증 후 `feat: 관리자 재고 조정 이력 추가` 한 커밋으로 모델·API·UI·테스트·계획을 함께 저장한다. `.env.local`, 로그, 브라우저 산출물은 제외한다.

## Success Criteria

- 관리자는 모든 옵션 재고 변동의 책임자·사유·전후 수량을 확인한다.
- 저재고 옵션을 3개 이하 기준으로 빠르게 찾아 보충한다.
- 주문과 관리자 조정이 동시에 일어나도 재고가 음수가 되지 않는다.
