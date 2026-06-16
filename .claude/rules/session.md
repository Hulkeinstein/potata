# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·검증계층(테스트/CI)은 정착 완료. 현 단계 최우선 = 커머스 매출 경로(장바구니→체크아웃→주문) 완성.

---

## 지금 작업

**Plan**: `docs/work-plans/commerce-checkout-mvp.md`

**Objective**: 장바구니 → `/checkout` → `POST /api/orders`(로그인 필수, 서버 가격 재검증) → 주문 DB 저장(status=PENDING) → `/mypage/orders` 조회. 3-PR(A 백엔드 / B 체크아웃UI / C 주문조회).

**진행 상태**: PR A(task 1~7) 완료·머지(#17, main 493b007). **PR B(task 8~9, `/checkout` UI) 진행 중** → 이후 PR C(`/mypage/orders`).

**완료 기준 (DoD)**:
- PR A: 통합테스트(주문 생성→DB row, status PENDING, 서버 재계산 total) GREEN + `tsc`/`lint`/`test` exit 0 + CI green.
- 보안: 미인증 401, 클라 가격 조작 무시, IDOR 차단.

**확정 결정**: 결제 분리(status enum 선반영) · JSON 스냅샷 · 로그인 필수 · 서버 가격 재검증. 카탈로그는 dummy.ts(P3). PR A 머지 후 B→C.

---

## 최근 완료 (참고)

- 인증: signup→verify→login 정상(bcrypt+Prisma, 실 DB 검증됨) — #11/#12/2c47833.
- 워크플로우 인프라(vitest+CI+SSoT) #14, try-on 보안 가드 #15.
- DATABASE_URL `?pgbouncer=true` 적용(로컬). Vercel env·Resend 도메인은 roadmap "로그인 실유저 가용성" 참조.
