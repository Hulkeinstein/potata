# 재고 운영 화면 탐색·이력 UX 보완 계획

## TL;DR

> **Summary**: 이미 구현된 재고 조정·저재고 필터를 재구현하지 않고, 운영자가 재고를 더 빠르게 찾고 안전하게 조정 이력을 확인하도록 화면 흐름만 보완한다.
> **Deliverables**: 관리자 내비게이션 일관성, 활성 검색 조건 요약·초기화, 필요할 때만 불러오는 이력, 이력 더 보기·시각 표시, 유형별 입력 안내·오류 표시.
> **Complexity**: medium
> **Critical Path**: UI 회귀 테스트 → 이력 API 응답 확인 → 재고 패널 UX → 관리자 재고 페이지 → 브라우저 QA

## Context

### Confirmed state

- `/admin/inventory`에는 상품/브랜드 검색, 전체·저재고·품절·수동 품절 필터, 페이지네이션이 있다.
- 옵션별 입고·정정·폐기 조정은 append-only 원장과 원자적 재고 변경으로 이미 보호된다.
- 현재 각 옵션 카드가 처음 보일 때 이력을 불러오며, 이력 더 보기·표시 시각·활성 조건 초기화가 없다.

### Scope

- **IN**: 재고 운영 화면의 탐색·이력·입력 피드백 UX.
- **OUT**: Prisma schema/migration, 재고 기준(저재고 1~3), 조정 transaction/API 보안, 판매 중지 정책, 주문·결제·발주·자동 재입고.

## Decisions

1. 기존 API의 cursor 기반 이력 목록을 그대로 사용하고, 카드의 `이력 보기`를 눌렀을 때만 요청한다.
2. 조정 후에는 해당 카드만 새 재고·상태·첫 이력 페이지로 갱신한다.
3. `입고`는 양수, `폐기`는 음수 기본값을 즉시 설정하며, 서버가 반환한 안전한 검증 메시지는 해당 폼 가까이에 표시한다.
4. 검색·필터가 활성화된 경우 요약과 단일 `초기화` 링크를 제공한다.
5. 기존 `AdminNav`를 재고 화면에도 넣어 운영 홈·상품·재고·혜택 이동을 일관되게 한다.

## TODOs

- [x] 1. 이력 조회·입력 피드백 회귀 테스트를 RED로 추가한다.

  **Files**: `components/admin/AdminInventoryAdjustmentPanel.test.tsx` (new), 기존 inventory test pattern.

  **Acceptance**:
  - 카드 최초 렌더는 이력 요청을 하지 않는다.
  - `이력 보기`는 첫 페이지를 요청하고, `더 보기`는 반환 cursor로 다음 페이지를 합친다.
  - `폐기` 선택 시 수량 기본값은 음수이고, 실패 응답의 안전한 메시지가 필드 가까이에 나타난다.

  **QA**: 단위 테스트에서 요청 횟수·cursor·텍스트·유형별 기본 수량을 명확히 검증한다.

- [x] 2. `AdminInventoryAdjustmentPanel`을 지연 이력 조회와 읽기 쉬운 조정 이력으로 보완한다.

  **Files**: `components/admin/AdminInventoryAdjustmentPanel.tsx`, 필요 시 작은 전용 formatter/helper 파일.

  **Acceptance**:
  - 접힌 기본 상태에서는 네트워크 요청이 없다.
  - 이력에 입고/정정/폐기 한글 라벨, 증감, 전후 수량, 사유, 로컬 표기 시각이 보인다.
  - 다음 cursor가 있을 때만 `더 보기`가 보이며 중복 행 없이 추가된다.
  - 조정 성공 후 해당 카드의 상태와 이력이 새 값으로 갱신된다.
  - 실패는 사용자 안전 메시지만 표시하고 내부 오류는 노출하지 않는다.

  **QA**: 로컬 관리자 브라우저에서 이력 접기/펼치기, 더 보기, 입고·폐기·실패 입력을 검증한다.

- [x] 3. 재고 목록의 운영 탐색을 보완한다.

  **Files**: `app/admin/inventory/page.tsx`, `components/admin/AdminNav.tsx` 재사용.

  **Acceptance**:
  - 재고 페이지에 공통 관리자 내비게이션이 보인다.
  - 검색어 또는 필터가 활성화되면 현재 조건과 결과 수가 보이고, `초기화`는 전체 목록 첫 페이지로 이동한다.
  - 기존 URL 기반 검색·필터·페이지네이션은 유지된다.

  **QA**: 저재고·품절·수동 품절 각각에서 검색, 조건 표시, 초기화, 이전/다음 링크를 확인한다.

- [x] 4. 전체 품질 검증과 실제 관리자 QA를 완료한다.

  **Acceptance**:
  - TypeScript, lint, 전체 Vitest, production build가 통과한다.
  - 로컬 PostgreSQL에서 재고 조정 idempotency와 음수 재고 차단 회귀가 유지된다.
  - desktop과 mobile에서 재고 목록·이력·조정·초기화 흐름이 console error 없이 동작한다.

  **Evidence**: `evidence/inventory-operations-polish/`에 자동 검증과 브라우저 QA 결과를 저장한다.

## Guardrails

- 재고 직접 덮어쓰기, 주문 재고 차감, 쿠폰·포인트·결제 관련 변경은 금지한다.
- 이력은 운영 감사 기록이므로 삭제·수정 기능을 추가하지 않는다.
- 기존 판매 중지 상품 제외 정책은 변경하지 않는다.

## Commit Strategy

검증이 모두 통과한 뒤 UI·테스트·계획·evidence만 한 커밋으로 기록한다. 로컬 환경 변수, 개발 서버 로그, 임시 스크린샷은 포함하지 않는다.

## Completion Evidence

- RED→GREEN: 서버 페이지의 함수 prop 전달과 중복 관리자 메뉴를 각각 재현한 뒤 제거했다.
- Focused UI tests: 재고 이력, 서버/클라이언트 경계, 이미지 대체 표시 7개 통과.
- Production build: `/admin/inventory`를 포함한 Next production build 통과.
- Browser QA: 관리자 재고 페이지에서 단일 관리자 메뉴, 필터·옵션·이력 보기, 외부 이미지 실패 시 `이미지 없음` 대체 표시를 확인했다.
