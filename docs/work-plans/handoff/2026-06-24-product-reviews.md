# Handoff — 상품 리뷰 작성 (다음 작업)

> 기준 커밋일: 2026-06-24. 작업 디렉터리: `e:\kamwoo\6.Programing\Potata\potata` (루트 `app/`·`components/`·`lib/`·`prisma/` — **`src/` 없음**. 옆 동명 `Potato\potato`와 혼동 금지). 다음 브랜치: `feat/product-reviews`(생성됨, 최신 main 기반).

---

## 1. 직전 세션 완료 (#35~40, 전부 main 머지)

**관리자 상품 등록 + 배지 자동화** 트랙 완결:
- **#35** 권한 게이트(env `ADMIN_EMAILS` allowlist + `isAdmin` + middleware `/admin`) + `createProduct`(randomUUID) + **ADR-008**(상품 SSoT=DB, seed=부트스트랩).
- **#36** Storage 일반화(`lib/supabase-storage` bucket 파라미터화 + 신규 `product-images` 버킷) + `POST /api/admin/products`(검증·업로드·보상 삭제·revalidate).
- **#37** `/admin/products/new` 등록 폼(필드+이미지, 동기 useRef 제출 잠금).
- **#38 fix** middleware Edge `node:crypto` 회귀 제거 → 순수 정규화 유틸 `lib/normalize.ts` 분리(+ `lib/auth` 재노출).
- **#39** 정가+할인율→판매가 자동 계산. NEW(등록 1주일·`createdAt`)·BEST(별점≥4.8 & 리뷰≥100) 자동 파생.
- **#40** HOT 자동화: `Product.viewCount` + `POST /api/products/[id]/view`(atomic, public) + 상세 클라 fire-and-forget 트래킹(useRef+sessionStorage) + `getHotProductIds`(별도 unstable_cache, 조회 시 `revalidateTag("hot-products")`) → 상위 4개 HOT.

배지 3종(NEW/BEST/HOT) 전부 데이터 기반 자동. 각 PR Tier1(tsc/lint/test/build) + Tier2(validator/oracle) 통과.

> ⚠️ **운영 주의**: ① 배포(실유저)는 별도 — Vercel 환경변수 6종 + `ADMIN_EMAILS` 미설정이라 현재 Vercel 빌드 빨강(코드 무관). ② admin은 Google 로그인 + `ADMIN_EMAILS` 일치 이메일만. ③ admin UI 진입은 `/admin/products/new` 직접 URL(네비 링크 없음).

---

## 2. 다음 작업: 상품 리뷰 작성

### 경위
roadmap P2b 항목. **BEST 배지가 `rating`/`reviewCount` 기반**(#39)인데 현재 그 값은 **시드값뿐**(admin 등록 상품은 null) → 리뷰 기능이 실제 평점/리뷰수를 채워 BEST를 의미있게 만든다. 검색·결제보다 데이터 가치가 직접적.

### 현 실태 (cross-check 실측)
- **`Review` 모델 없음**(`prisma/schema.prisma` — Product에 `rating Float?`/`reviewCount Int?`만).
- **UI 골격 이미 존재(비작동)**: `components/product/ProductDetailClient.tsx`에 **"Review" 탭**(246-258행) + **"Write a Review" 버튼**(293·299행) + 빈 상태 "No reviews yet. Be the first to review!"(297행) + `productRating`/`productReviewCount` 표시(42-43·109행). → **이 UI에 실데이터·작성 폼을 연결**하는 게 핵심(신규 컴포넌트 최소).

### 선결 결정 (다음 세션 `/plan`에서 확정)
1. **Review 스키마**(🟡 Ask First): `rating Int(1~5)` + `comment String?` + `userId`/`productId`(FK, onDelete Cascade) + `createdAt`. `@@unique([userId, productId])`(1인 1상품 1리뷰) 여부. `@@index([productId])`(목록).
2. **rating/reviewCount 집계 방식**: 리뷰 작성/삭제 시 `Product.rating`(평균)·`reviewCount`(개수)를 **재집계(denormalized)** → BEST 배지(#39, `toAppProduct`) 자동 연동. `$transaction`으로 리뷰 insert + 집계 원자적. (HOT처럼 캐시 분리 불필요 — Product 컬럼 직접 갱신.)
3. **리뷰 권한**: 전체 로그인 유저 vs **구매자만**(Order.items에 productId 있는 유저). 후자가 신뢰도↑이나 Order JSON 스냅샷 조회 필요.
4. **수정/삭제 범위**: MVP = 작성+조회(+본인 삭제?). 수정은 추후 가능.

### 재사용 패턴 (신규 발명 금지)
| 필요 | 차용 원본 |
|------|-----------|
| 인증 게이트 + `{success,data\|error}` + `extractErrorMessage` | `app/api/wishlist/route.ts` / `app/api/ootd/route.ts` |
| 작성 + 집계 원자성(`$transaction`) | `app/api/orders/route.ts`(주문 트랜잭션) |
| 리뷰 작성 폼 UI | 기존 `ProductDetailClient` Review 탭(293·299행 "Write a Review" 연결) |
| 단위테스트(prisma mock) | `app/api/admin/products/route.test.ts` / `lib/products.test.ts` |
| 집계→배지 | `lib/products.ts` `toAppProduct`(isBest = 별점≥4.8 & 리뷰≥100) |

---

## 3. 시작 절차 (다음 세션)
1. `session.md` "지금 작업" + 본 handoff 정독.
2. **프로젝트 코딩 workflow 준수**(`CLAUDE.md` Git Policy: 100줄+ → `/plan` 선행, feat 브랜치+PR+squash, schema/의존성 Ask First) + `~/.claude/rules/coding-workflow.md`(plan→momus→실행→Tier2 적대검증).
3. 현재 브랜치 `feat/product-reviews`(생성됨)에서 시작.
4. `/plan`으로 **선결 결정 4가지 확정**(특히 Review 스키마 Ask First + 권한) → PR 분할(스키마+작성/조회 API → UI 연결) → 구현 → Tier1+Tier2.

## 4. 불변 가드레일 (CLAUDE.md)
- `.env*` commit 금지 / 클라 시크릿 금지. main 직접 commit 금지(feat+PR+squash).
- `session.user.id`만 신뢰(요청 body userId 불신). try-catch는 라우트 핸들러 최상위만.
- schema 변경 Ask First → 승인 후 `prisma db push`. 집계 갱신은 `$transaction`(경쟁/원자성).
- BEST 배지 기준이 reviewCount≥100이라, 리뷰가 충분히 쌓여야 BEST 표시됨(인지 — 필요 시 #39 임계값 조정).
