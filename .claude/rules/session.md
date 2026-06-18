# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·검증계층(테스트/CI)·커머스 MVP(장바구니→주문→내역) 정착 완료. 다음 = 배포·실유저 가동(Vercel env·Resend) + UX/결제 확장.

---

## 지금 작업

**P3 카탈로그 DB화 진행 중** — plan `docs/work-plans/catalog-db.md`. dummy.ts 상품 8개 → Prisma `Product` 모델. **PR1(task 1~6: 스키마+seed+orders DB재검증+테스트+ADR) 실행 중**, PR1 머지 후 PR2(8화면 전환). 배포는 사용자 결정으로 보류(모든 시스템 구현 후). 결제 게이트웨이는 카탈로그 후 트랙.

**핵심 주의**: Product.id=String 유지("1"~"8" 시드), seed=DIRECT_URL, 상세=ISR, dummy PRODUCTS 제거는 PR2 마지막.

**미검증 잔여**: F5 수동 E2E(로그인→담기→체크아웃→주문→`/mypage/orders`) — 앱 실행 클릭 확인(`/verify`) 권장. 코드 경로는 단위+통합 테스트로 커버됨.

---

## 최근 완료 (참고)

- 인증 복구(#11/#12/2c47833) · 워크플로우 인프라 vitest+CI+SSoT(#14) · try-on 보안(#15) · 커머스 MVP A/B/C(#17·#18·#19).
