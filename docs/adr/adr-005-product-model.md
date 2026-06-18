# ADR-005 — Product 모델 설계 (P3 카탈로그 DB화)

## Status

Accepted — `feat/catalog-db` 브랜치에서 구현 완료 (`docs/work-plans/catalog-db.md` PR1 참조)

## Date

2026-06-16

## Context

potata P3 목표는 `data/dummy.ts` 기반 인메모리 카탈로그를 Prisma `Product` 모델로 DB화하는 것이다. 설계 시 다음 제약이 존재했다:

1. **기존 참조 문자열 id** — `cart-store`, `wishlist-store`, `Order.items` JSON 스냅샷(ADR-004)이 상품 id를 문자열("1"~"8")로 참조한다. 이 값들은 Prisma `Json` 타입 컬럼에 이미 저장된 주문 데이터에 각인되어 있다.
2. **이미지 자산** — `data/dummy.ts`는 검증된 외부 CDN URL(kream, unsplash)을 사용 중이다. Supabase Storage 파일 업로드는 별도 트랙이 필요하다.
3. **ISR vs SSG** — 기존 상세페이지는 `generateStaticParams`로 빌드 타임 정적 생성된다. DB 전환 시 런타임에 상품이 추가되면 재배포 없이는 반영이 안 된다.
4. **관계형 정규화** — MVP 카탈로그는 읽기 전용(관리자 등록 없음)이며 사이즈·색상·이미지 목록은 단순 조회용이다.

ADR-004(Order JSON 스냅샷)는 이미 구현·머지되어 불변이다. 본 ADR은 ADR-004가 `## Consequences` 제약 항목에서 예고한 "P3 카탈로그 DB화 시 재검증 소스 변경"의 후속 결정을 기록한다.

## Options Considered

### 결정 1: Product.id 타입

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. String @id (채택)** | 기존 cart/wishlist/Order.items 문자열 참조와 호환, 시드 id 그대로 유지 | autoincrement 없어 수동 id 관리 필요 |
| **B. cuid (Prisma 기본 권장)** | 충돌 없는 글로벌 유니크 id | 기존 "1"~"8" 참조 전부 교체 필요, 기 저장 주문 데이터 깨짐 |
| **C. Int autoincrement** | 정수 PK, 일반적 패턴 | 기존 문자열 참조와 타입 불일치, 기 저장 주문 데이터 깨짐 |

### 결정 2: 이미지 저장 방식

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 외부 URL (채택)** | dummy.ts 기존 CDN URL 그대로 시드, 즉시 전환 가능 | 외부 CDN 의존, URL 만료 가능성 |
| **B. Supabase Storage 업로드** | 자체 관리, 영속성 보장 | 업로드 인프라·관리 UI 필요, MVP 범위 초과 |

### 결정 3: 상세페이지 렌더링 전략

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. ISR, revalidate=3600, dynamicParams=true (채택)** | 재배포 없이 신규 상품 반영, 기존 정적 경로 보존 | 첫 미스 시 revalidation latency |
| **B. generateStaticParams 빌드타임 SSG 유지** | 빌드 타임에 모든 경로 정적 생성 | DB 전환 후 런타임 추가 상품은 재배포 전까지 404, `dynamicParams=false`이면 신규 상품 접근 차단 |
| **C. 전체 SSR (no-cache)** | 항상 최신 데이터 | 캐싱 이점 없음, DB 부하 증가 |

### 결정 4: sizes/colors/images 정규화 여부

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. String[] 스칼라 배열 (채택)** | 스키마 단순, 별도 테이블·join 불필요, MVP 읽기 전용 카탈로그에 충분 | 항목 단위 쿼리(예: "사이즈 S 상품 전체") 어려움 |
| **B. 1:N 정규화 테이블** | 항목 단위 필터·집계 가능, 확장성 | 테이블 3개 추가·join 복잡도, 읽기 전용 MVP에 과잉 |

## Decision

**4가지 결정 모두 옵션 A 채택. 구현됨(기록).**

### 결정 1 — Product.id = String @id, 기존 id 값 유지

`Product.id`는 `String @id` 타입으로 선언하고, 시드 데이터는 `data/dummy.ts`의 기존 id("1"~"8")를 그대로 사용한다. `autoincrement` / `cuid()` / `uuid()` 기본값은 적용하지 않는다.

이유:
- `cart-store`, `wishlist-store`, `Order.items` JSON 스냅샷(ADR-004)이 문자열 id를 하드 참조. Int 전환 시 기 저장 주문 데이터 전체 파손.
- 시드 id와 참조 id를 동기화함으로써 DB 전환 전후 데이터 연속성 보장.

### 결정 2 — 이미지 = 외부 URL (imageUrl String, images String[])

`imageUrl`(대표 이미지)과 `images`(갤러리, `String[] @default([])`) 필드에 외부 CDN URL을 그대로 저장한다. Supabase Storage 파일 업로드는 도입하지 않는다.

이유:
- `data/dummy.ts` CDN URL은 이미 동작이 검증된 에셋. 즉각 시드 가능.
- Storage 인프라·업로드 UI 구축은 MVP 목표 범위 외 — YAGNI 원칙 적용.
- 향후 관리자 상품 등록 트랙에서 별도 도입.

### 결정 3 — 상세페이지 ISR (revalidate=3600, dynamicParams=true)

상품 상세페이지(`/products/[id]`)에 `export const revalidate = 3600`과 `export const dynamicParams = true`를 적용한다. `generateStaticParams`는 빌드 타임 초기 경로 사전 생성에 계속 사용하되, 런타임 미생성 경로도 허용한다.

이유:
- DB 전환 후 런타임에 상품이 추가되어도 재배포 없이 1시간 이내 반영.
- 빌드 타임 정적 생성(`generateStaticParams`) 유지로 기존 경로 첫 요청 성능 보존.
- 상품 데이터는 자주 변경되지 않아 3600초 revalidate가 충분.

### 결정 4 — sizes/colors/images 정규화 회피 (String[] 스칼라 배열)

`sizes`, `colors`, `images` 필드는 Prisma `String[]` 스칼라 배열로 선언한다. 별도 `ProductSize` / `ProductColor` / `ProductImage` 테이블은 만들지 않는다.

이유:
- MVP 카탈로그는 읽기 전용 — 항목 단위 필터·집계 쿼리 불필요.
- 1:N 정규화는 테이블 3개 추가·join 복잡도 상승 — YAGNI 원칙 적용.
- 스칼라 배열로 Prisma 스키마와 타입 단순성 유지.

## Consequences

### 긍정

- **데이터 연속성**: String id 유지로 기 저장 장바구니·주문 데이터 파손 없음.
- **스키마 단순성**: 정규화 테이블 없이 `Product` 단일 모델로 카탈로그 완결.
- **즉시 전환**: 외부 URL 시드로 Storage 인프라 없이 dummy.ts → DB 전환 가능.
- **무중단 신규 상품 반영**: ISR로 재배포 없이 신규 상품 상세페이지 접근 가능.

### 제약 및 트레이드오프

- **수동 id 관리**: `@default(cuid())`가 없으므로 시드·신규 상품 등록 시 id 중복 방지는 애플리케이션 책임.
- **외부 CDN 의존**: URL 만료 시 이미지 깨짐. 향후 자체 Storage 이전 필요.
- **항목 단위 쿼리 한계**: String[] 배열이라 "사이즈 S를 가진 상품 전체" 같은 DB 단위 필터 불가. 필요 시 별도 ADR로 정규화 재검토.
- **ISR revalidation latency**: 상품 정보 변경 후 최대 1시간 캐시 유지. 즉각 반영 필요 시 `revalidatePath` 호출 또는 캐시 purge 메커니즘 추가 필요.

### ADR-004와의 관계

ADR-004(Order JSON 스냅샷) **불변** — 기 저장된 `Order.items` JSON 스냅샷 구조는 변경하지 않는다. 본 ADR이 변경하는 것은 `POST /api/orders`의 **서버 가격 재검증 소스**뿐이다: `data/dummy.ts` PRODUCTS 조회 → `prisma.product.findUnique` 조회. ADR-004가 예고한 "P3 카탈로그 DB화 시 재검증 소스 변경" 사항이 본 ADR로 이행된다.

### ADR-003과의 관계

ADR-003 하이브리드 테스트 전략이 Product에도 적용된다. 단위테스트는 `vi.mock("@/lib/prisma")`로 Prisma mock 사용, 통합테스트는 CI의 실 Postgres에서 `Product` upsert 후 조회하는 방식으로 배선을 검증한다.

### 향후 확장 트랙 (본 ADR 범위 외)

- 관리자 상품 등록 UI + Supabase Storage 이미지 업로드
- 상품 수 대폭 증가 시 `sizes`/`colors` 정규화 재검토
- 결제 게이트웨이 연동 시 실재고 연동
