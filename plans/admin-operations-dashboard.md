# 운영자 대시보드 계획

## TL;DR

> **Summary**: 고객 화면과 분리된 `/admin` 운영 허브를 만들고, 이미 구현된 상품·쿠폰·재고 기능을 하나의 관리자 메뉴로 연결한다. 실제 근거가 있는 운영 수치는 표시하고, 결제 데이터가 필요한 매출 지표는 연결 대기 카드로만 제공한다.
> **Deliverables**: Admin Home, shared admin navigation, Inventory Dashboard, live operation counts, future analytics placeholder cards, 테스트·모바일 QA.
> **Effort**: Medium
> **Parallel**: NO
> **Critical Path**: aggregate query → Admin Home/nav → Inventory Dashboard → verification

## Context

### Original Request

- 운영자만 접근하는 대시보드를 먼저 만든다.
- 지금까지 만든 운영 기능을 대시보드 안으로 정리한다.
- 판매 순위·판매량·누적 판매량·총수입 등 지표는 먼저 자리를 만들고, 나중에 실제 결제 데이터와 연결한다.

### Existing Features to Reuse

- `/admin/products`: 상품 검색·수정·판매 중지/재노출.
- `/admin/products/new`: 상품 등록.
- `/admin/products/[id]/edit`: 옵션 정보와 수동 품절, 최근 재고 조정 shortcut.
- `/admin/benefits`: 쿠폰·포인트 Pilot.
- `/api/admin/inventory-adjustments`: 관리자 재고 조정의 idempotency·감사·transaction 기반.

### Decisions

- `/admin`은 운영자 전용 Home, `/admin/inventory`는 재고 작업의 정식 화면이다.
- 기존 상품·쿠폰 URL은 유지하고 shared AdminNav로 연결한다. 기존 폼을 복제하지 않는다.
- live card에는 현재 DB로 사실 확인 가능한 운영 수치만 표시한다.
- 매출·순매출·총수입·판매 순위·누적 판매량·평균 주문 금액·전환율은 `결제 확정 데이터 연결 후 표시`로 명시하고 0 또는 예측 수치를 만들지 않는다.
- Q&A는 미답변 개수만 표시한다. `/admin/questions` inbox는 이번 범위에서 만들지 않으므로 CTA를 만들지 않는다.

## Work Objectives

### Deliverables

- 서버 전용 운영 요약 aggregate service와 안전한 DTO
- `/admin` Home과 shared AdminNav
- `/admin/inventory` 옵션별 재고·저재고·품절·수동 품절·조정 이력/입력 화면
- 연결 대기 분석 지표 카드와 실제 전환 조건 문구

### Live Metrics

- 전체/판매 중/판매 중지 상품 수
- 판매 가능한 옵션이 있는 상품 수, 전체 품절 상품 수
- 수동 품절 옵션 수, 재고 0 옵션 수, 재고 1~3 저재고 활성 옵션 수
- 활성 쿠폰 캠페인 수, 미답변 Q&A 수

### Future Analytics Cards

- 총매출, 순매출, 수금액, 판매량, 누적 판매량, 평균 주문 금액
- 상품/브랜드/카테고리 판매 순위
- 환불·할인·쿠폰 사용·고객 재구매·전환 퍼널·재고 소진율

각 카드는 현재 `결제 확정·환불·원가·웹 분석 데이터 연결 후 표시`라고 명시한다. PENDING 주문 합계나 0을 사용하지 않는다.

### Must NOT Have

- payment/order state, checkout, coupon redemption, points spend를 변경하지 않는다.
- 가짜 매출·순위·총수입·전환율을 표시하지 않는다.
- 별도 admin Q&A inbox, 고객/CRM, analytics report, order fulfillment를 추가하지 않는다.
- admin email, 내부 audit reason, raw database error를 dashboard DTO에 노출하지 않는다.

## Verification Strategy

- TDD: Vitest RED→GREEN→refactor.
- Manual QA: local DB에서 admin/비관리자 경계 및 desktop/mobile dashboard 흐름을 확인한다.
- Quality: typecheck, lint, full test, production build.

## TODOs

- [ ] 1. 운영 요약 aggregate와 관리자 권한 계약

  **What to do**: `lib/admin-dashboard.ts`에 한 번의 aggregate query 흐름으로 live metrics DTO를 만든다. inactive 상품은 low/sold-out 카드에서 우선 제외하고, available variant가 하나도 없는 active 상품만 전체 품절로 계산한다. server page와 필요한 API 모두 `auth()` + `isAdmin`으로 재검증한다.

  **References**:
  - `lib/admin-product-catalog.ts` — 상품 관리자 DTO/query
  - `lib/benefits/read-service.ts` — benefits read pattern
  - `app/api/admin/catalog/route.ts` — admin API fail-closed pattern

  **Acceptance Criteria**:
  - [ ] live count는 숨김/수동 품절/재고 0/저재고의 우선순위를 정확히 반영한다.
  - [ ] non-admin은 dashboard data를 읽지 못한다.
  - [ ] summary DTO에 email·reason·passwordHash가 없다.

  **QA Scenarios**:
  ```
  Scenario: 운영 수치
    Tool: Vitest
    Steps: active, inactive, sold-out, low-stock, manual-sold-out fixture를 만든다.
    Expected: 각 카드가 중복 없이 정확한 수를 반환한다.

  Scenario: 권한 경계
    Tool: route/page test
    Steps: non-admin과 unauthenticated 호출을 보낸다.
    Expected: 데이터 없이 login/forbidden 경계로 끝난다.
  ```

- [ ] 2. Shared AdminNav와 `/admin` 운영 홈 구현

  **What to do**: `/admin`에 operations summary cards, quick links, future analytics cards를 구현한다. `/admin/products`, `/admin/products/new`, `/admin/benefits`에 같은 AdminNav를 적용한다. 메뉴는 Home, Products, Inventory, Benefits만 제공한다. Q&A card는 count만 보여 주고 link/button을 만들지 않는다.

  **References**:
  - `app/admin/products/page.tsx` — 관리자 페이지 guard
  - `app/admin/benefits/page.tsx` — 관리자 page layout
  - `components/admin/AdminProductCatalogClient.tsx` — current product quick actions

  **Acceptance Criteria**:
  - [ ] 모든 운영 메뉴는 실제 구현된 경로로만 이동한다.
  - [ ] future analytics card는 숫자 대신 연결 조건을 읽을 수 있게 표시한다.
  - [ ] mobile에서 메뉴와 cards가 overflow 없이 동작한다.

  **QA Scenarios**:
  ```
  Scenario: 운영 홈 탐색
    Tool: Browser desktop/mobile
    Steps: admin으로 /admin을 열고 Products, Inventory, Benefits를 차례로 연다.
    Expected: 모든 link가 실존 페이지로 이동하고 console error가 없다.

  Scenario: 결제 전 분석
    Tool: Browser
    Steps: 분석 카드 영역을 확인한다.
    Expected: 매출/순위 수치가 표시되지 않고 연결 대기 사유가 보인다.
  ```

- [ ] 3. `/admin/inventory` 정식 재고 대시보드 구현

  **What to do**: 기존 `AdminInventoryAdjustmentPanel`과 adjustment API를 재사용해 `/admin/inventory`에서 상품·옵션별 stock, low-stock(1~3), sold-out(0), manual sold-out을 검색/필터/페이지네이션한다. 선택한 옵션에서 delta·type·reason 조정과 최근 조정 이력을 제공한다. 상품 edit 화면은 중복 write UI를 제거하고 inventory dashboard deep link 또는 recent summary만 유지한다.

  **References**:
  - `components/admin/AdminInventoryAdjustmentPanel.tsx` — 조정 form/history 재사용
  - `app/api/admin/inventory-adjustments/route.ts` — adjustment contract
  - `components/admin/AdminProductCatalogClient.tsx` — query string pagination pattern

  **Acceptance Criteria**:
  - [ ] 재고 1~3, 0, manual sold-out, active/inactive을 명확하게 filter·label한다.
  - [ ] stock 직접 덮어쓰기 없이 adjustment API만 재고를 바꾼다.
  - [ ] 조정 후 목록 수치와 이력이 새로고침 없이 갱신된다.

  **QA Scenarios**:
  ```
  Scenario: 저재고 보충
    Tool: Browser + local PostgreSQL
    Steps: stock 2 옵션을 low-stock filter로 찾고 RECEIVE +5와 사유를 저장한다.
    Expected: stock 7, 저재고 filter에서 사라지고 adjustment history에 1행이 보인다.

  Scenario: 품절과 수동 품절
    Tool: Browser
    Steps: stock 0 옵션과 stock 5/manual-sold-out 옵션을 각각 filter한다.
    Expected: 서로 다른 상태로 표시되고 고객 구매 규칙은 바뀌지 않는다.
  ```

- [ ] 4. 최종 검증과 roadmap 갱신

  **What to do**: migration/state를 local DB에서 적용·검증하고, 중복되지 않은 scope만 diff로 확인한다. roadmap의 다음 후보를 Admin Operations Dashboard 완료 상태로 갱신하고, 실제 결제·운영 배포·analytics data connection은 external/future waitlist로 유지한다.

  **Acceptance Criteria**:
  - [ ] migration status, typecheck, lint, full test, build가 통과한다.
  - [ ] admin과 non-admin desktop/mobile QA evidence가 있다.
  - [ ] roadmap가 완료된 상품/재고와 남은 analytics 결정을 혼동하지 않는다.

## Final Verification Wave

- [ ] F1. Goal/scope audit — 기존 상품·쿠폰·재고 기능을 재사용했고 중복 form/API가 없는지 확인한다.
- [ ] F2. Security audit — admin guard, actor-bound adjustment, no private dashboard DTO를 확인한다.
- [ ] F3. Real QA — local PostgreSQL 및 admin browser desktop/mobile을 실행한다.
- [ ] F4. Quality gates — `npx prisma migrate status`, `npx tsc --noEmit`, `npm run lint`, `npm test -- --run`, `npm run build`를 실행한다.

## Commit Strategy

검증 뒤 dashboard·inventory UI·summary query·tests·roadmap을 `feat: 운영자 대시보드 추가` 한 커밋으로 저장한다. secret, log, screenshot은 제외한다.
