# potata 세션 컨텍스트

> 시점 주의: 작성자 관점 표현 금지. 독자(작업 재개 시점) 관점으로 기술.

---

## 북극성 골

potata = 한국→UAE 패션 커머스. 인증·검증계층(테스트/CI)·커머스 MVP·카탈로그 DB까지 정착 완료. 다음 = 배포·실유저 가동(Vercel env·Resend) + 상세페이지/관리자/결제 등 확장.

---

## 지금 작업

**`product-detail` 스킬 구현 완료 — PR 미생성(브랜치 `feat/product-detail-skill`)**. 인터뷰로 설계 확정: (1) 출력=DB 콘텐츠 주입(기존 `ProductDetailClient` 템플릿 재사용, 새 컴포넌트/스키마 변경 없음) (2) 입력=자유 텍스트/마크다운 (3) 동작=plan→실행→검증 내부 절차. 산출물: `.claude/skills/product-detail/SKILL.md` + 검증 헬퍼 `prisma/check-product.ts`. 메커니즘=자유텍스트 파싱→`prisma/seed.ts` PRODUCTS에 항목 추가/갱신(SSoT)→`npx prisma db seed`(upsert)→DB 재조회 검증. 임시 상품(id 99)으로 end-to-end 검증 후 정리 완료(tsc·lint·seed·DB 조회 OK).

**다음 단계**: 커밋·PR 생성(사용자 요청 시) → 머지 후 실제 신상품 1개를 스킬로 등록해 운영 검증. 그 후 다음 트랙 선택.

**참고**: 배포는 보류(사용자 결정 — 모든 시스템 구현 후). 그 외 후보 = 관리자 상품 등록·이미지 업로드·검색·리뷰·결제 (roadmap 참조).

---

## 최근 완료 (참고)

- 인증 복구(#11/#12/2c47833) · 워크플로우 인프라 vitest+CI+SSoT(#14) · try-on 보안(#15) · 커머스 MVP A/B/C(#17·#18·#19) · 문서정리(#20) · 카탈로그 DB화 PR1·PR2(#21·#22) · 상품 상세 skill(브랜치 `feat/product-detail-skill`, PR 대기).
