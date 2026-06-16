# ADR-004 — Order는 관계형 OrderItem 대신 JSON 스냅샷으로 저장한다

## Status

Accepted — `feat/commerce-checkout` 브랜치에서 구현 완료 (`docs/work-plans/commerce-checkout-mvp.md` PR A 참조)

## Date

2026-06-15

## Context

potata 커머스 MVP(P2)에서 주문(Order) 데이터 모델을 설계할 때 다음 제약이 존재했다:

1. **카탈로그 미정규화** — 상품 카탈로그가 P3까지 `data/dummy.ts`에 관리되며 DB `Product` 모델이 없다. 관계형 `OrderItem` 테이블을 도입하려면 `Product` FK가 필요하지만 현 단계에서 걸 수 없다.
2. **주문의 불변성 요건** — 주문은 "구매 시점의 가격·상품 정보 불변 기록"이어야 한다. 상품 가격이나 정보가 나중에 변경되더라도 주문 내역은 구매 당시의 상태를 보존해야 한다.
3. **MVP 화면 단순성** — 주문 조회 화면(`/mypage/orders`)은 단순 목록 표시이며, join이나 복잡한 쿼리가 불필요하다.
4. **서버 가격 신뢰 문제** — 클라이언트 cart-store의 가격은 신뢰할 수 없다. 서버에서 `productId`로 `data/dummy.ts`를 재조회해 가격을 재계산해야 한다(Zero Trust).
5. **결제 분리 필요** — MVP 범위에서 결제 게이트웨이 연동은 제외한다. 단, 추후 결제 PR에서 재마이그레이션을 최소화하기 위해 `OrderStatus` enum(`PENDING`/`PAID`/`CANCELLED`)을 미리 선반영한다.

기존 인증 시스템(NextAuth v5 JWT)이 확립되어 있으며, 비회원 주문은 현 단계 범위 외로 결정됐다.

## Options Considered

### 결정 1: 주문 항목 저장 방식

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 관계형 OrderItem 테이블** | 항목 단위 쿼리·집계 용이, 정규화된 구조 | `Product` FK 불가(카탈로그가 DB 아님), 구매 시점 스냅샷 보존 별도 처리 필요, MVP 화면에서 join이 불필요한 복잡도 추가 |
| **B. JSON 스냅샷 (채택)** | Product FK 불필요, 구매 시점 불변 기록 의미론적 정확, 조회 시 join 불필요, 스키마 단순 | 항목 단위 집계·필터 쿼리 어려움(예: "특정 상품이 포함된 주문 전체" 검색), JSON 역직렬화 필요 |
| **C. 하이브리드** | 관계형 + 스냅샷 병행 | 양쪽 복잡도 합산, MVP 규모에서 명백한 과잉 |

### 결정 2: 인증 요건

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 로그인 필수 (채택)** | 기존 `auth()` 게이트 패턴 재사용, 구현 단순, `userId NOT NULL`로 주문 소유 명확 | 비회원 주문 불가 |
| **B. 비회원 허용** | 전환율 향상 가능 | 세션 토큰·이메일 기반 조회 등 복잡한 식별 로직 필요, MVP 범위 초과 |

### 결정 3: 결제 처리 시점

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 결제 즉시 연동** | 완전한 커머스 플로우 | 결제 게이트웨이 연동 공수 크고 MVP 범위 초과 |
| **B. 결제 분리 + status enum 선반영 (채택)** | MVP 내에서 주문 저장 완성, 추후 결제 PR 재마이그레이션 최소화, enum 선반영으로 코드 변경 없이 상태 전이 가능 | 현재 `PENDING` 주문만 누적(결제 완료 없음) |

### 결정 4: 서버 가격 재검증

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 클라이언트 가격 신뢰** | 서버 재조회 불필요, 구현 단순 | 클라이언트 조작 가능 — 1원 결제 등 보안 취약 |
| **B. 서버 가격 재검증 (채택)** | 클라이언트 가격 조작 불가(Zero Trust), 주문 스냅샷 가격 = 서버 기준 신뢰 가격 | `productId`별 서버 재조회 필요, P3에서 카탈로그 DB화 시 재검증 소스 변경 필요 |

## Decision

**4가지 결정 모두 B 채택(채택 명시 옵션). 구현됨(기록).**

### 결정 1 — Order 항목 = JSON 스냅샷

`Order.items` 컬럼(`Json` 타입)에 `OrderItemSnapshot[]`을 저장한다. 관계형 `OrderItem` 테이블은 만들지 않는다.

스냅샷 필드: `productId / name / brand / price / imageUrl / size? / color? / quantity`.
`price`는 서버 재조회 값(클라이언트 입력 무시).

이유:
- `Product` FK 불가(카탈로그 미정규화) — 관계형 구조의 전제 조건 미충족.
- 주문은 구매 시점 상태의 불변 기록 — 스냅샷이 의미론적으로 정확.
- MVP 화면(단순 목록)에서 join 불필요 — right-sized 원칙.

### 결정 2 — 로그인 필수

`POST /api/orders`에 `await auth()` 게이트를 설치한다(미인증 401). `Order.userId`는 NOT NULL.

이유:
- 기존 `auth()` 게이트 패턴(try-on, verify 라우트) 재사용 — 코드베이스 일관성.
- 비회원 주문은 MVP 범위 외로 명시적 제외(게스트 식별 로직 불필요).

### 결정 3 — 결제 분리 + OrderStatus enum 선반영

`POST /api/orders`는 주문을 `status = PENDING`으로 DB에 저장하는 것까지만 담당한다. 결제 게이트웨이 연동은 추후 PR로 분리한다.

`OrderStatus` enum(`PENDING` / `PAID` / `CANCELLED`)을 현재 Prisma 스키마에 선반영해 추후 결제 PR에서 추가 마이그레이션 없이 상태 전이가 가능하도록 한다.

이유:
- 결제 게이트웨이 연동은 MVP 범위 초과.
- enum 선반영으로 추후 재마이그레이션 최소화.

### 결정 4 — 서버 가격 재검증 (Zero Trust)

`POST /api/orders`에서 클라이언트가 보낸 가격/합계를 일체 신뢰하지 않는다. 각 `productId`로 `data/dummy.ts` PRODUCTS를 서버에서 재조회한 뒤 다음 공식으로 재계산한다:

```
subtotal = Σ(serverPrice × quantity)
shipping = subtotal > 50_000 ? 0 : 3_000
total    = subtotal + shipping
```

단위: AED 정수(Int). `Decimal`/`Float` 금지.

존재하지 않는 `productId`는 400으로 거부한다. `CreateOrderRequest`에는 `price` 필드를 포함하지 않는다.

이유:
- 클라이언트 조작(가격 1원 입력 등) 방지 — 보안 필수 요건.
- 스냅샷 가격 = 서버 기준 신뢰 가격 보장.

## Consequences

### 긍정

- **스냅샷 불변성**: 상품 가격·정보가 나중에 변경되어도 과거 주문 내역은 구매 당시 상태 보존.
- **스키마 단순성**: `OrderItem` 테이블 없이 `Order` 단일 모델로 완결. join 없이 주문 조회.
- **보안 강화**: 서버 가격 재검증으로 클라이언트 가격 조작 불가.
- **결제 확장 용이**: `OrderStatus` enum 선반영으로 추후 결제 PR 재마이그레이션 최소화.
- **구현 일관성**: 기존 `auth()` 게이트, `prisma.$transaction`, `extractErrorMessage` 패턴 재사용.

### 제약 및 트레이드오프

- **항목 집계 한계**: JSON 스냅샷이라 `items` 내 특정 상품이 포함된 주문 전체 집계/필터가 어렵다(예: "상품 A를 구매한 주문 수"). 분석 필요 시 별도 ADR로 `OrderItem` 정규화 재검토.
- **재검증 소스 변경**: P3에서 카탈로그 `Product` DB화 시 서버 재검증 소스(`data/dummy.ts`)를 변경해야 한다. 재검증 함수를 `getProductById` 단일 지점으로 추상화해 변경 범위를 최소화하는 것으로 완화.
- **PENDING 주문 누적**: 결제 연동 전까지 모든 주문이 `PENDING` 상태로 누적된다. 결제 PR 이전까지 수용.
- **비회원 주문 불가**: 로그인 필수 결정으로 비회원 전환율 최적화는 추후 별도 검토 필요.
