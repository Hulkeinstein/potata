# Handoff: 상품 상세 페이지 구현 skill (다음 세션)

> 작성: 2026-06-16 (세션 종료 handoff) · 다음 세션이 이 문서를 정독하고 착수.

---

## 직전 완료 (참고)

- **P3 카탈로그 DB화 완료** — PR1(#21): Prisma `Product` 모델 + seed(8개, id "1"~"8") + orders 가격 재검증 DB화 + ADR-005. PR2(#22): 8개 화면 client→server 전환(DB 조회), 상세 `/product/[id]` ISR, `lib/products.ts` 헬퍼(`getAllProducts`/`getProductById`), `data/dummy.ts` PRODUCTS 제거(TRENDS만 잔존). plan은 `docs/work-plans/archive/catalog-db.md`.
- 그 전: 인증 복구(#11/#12/2c47833), 워크플로우 인프라(#14), try-on 보안(#15), 커머스 MVP(#17·#18·#19), 문서 정리(#20).

---

## 다음 작업: 상품 상세 페이지 구현 skill 생성

**사용자 요청(원문 취지)**: "상품 상세 페이지 구현 skill을 만든다. 별도 명령(단계별 지시) 없이, **스킬 + 상세 정보만 주면 알아서 상세 페이지를 구현**하도록."

**즉**: `/plan`·`/start-work`처럼 Skill 도구로 호출하는 재사용 Claude Code skill(`.claude/skills/<name>/SKILL.md`)을 만든다. 입력으로 **상품 상세 정보**를 받으면, 그 정보로 상품 상세 페이지를 자동 구현한다.

### 현 코드 토대 (스킬이 활용할 것)
- `app/product/[id]/page.tsx` — 서버 컴포넌트 + ISR, `getProductById(id)` → `<ProductDetailClient product={...} />`.
- `components/product/ProductDetailClient.tsx` — 이미 상세 UI 존재(이미지 갤러리·브랜드/이름·가격/할인·사이즈/컬러 선택·장바구니/찜·detail/reviews/shipping 탭).
- `Product` 모델(Prisma): description?, images[], sizes[], colors[], rating?, reviewCount? 등 — 상세 콘텐츠 필드 이미 있음.
- `lib/products.ts`, `data/dummy.ts`(상품은 DB로 이전됨, TRENDS만 잔존).

### 다음 세션 인터뷰에서 확정할 미정 설계 (중요)
1. **스킬 출력의 본질** — 셋 중 무엇? (a) 기존 `ProductDetailClient`를 **확장/재사용**해 렌더(템플릿 기반), (b) 주어진 상세 정보를 **DB Product의 description/images 등 필드에 채움**(콘텐츠 주입), (c) 상품별 **커스텀 상세 섹션/레이아웃 컴포넌트를 생성**(코드 생성). → 가장 모호하므로 먼저 확정.
2. **"상세 정보" 입력 형식** — 마크다운? JSON? 자유 텍스트? 상품 id + 추가 콘텐츠 묶음?
3. **DB 연동 범위** — 상세 콘텐츠를 Product 테이블에 저장(스키마 확장 필요할 수도)? 아니면 UI/코드만 생성하고 DB는 안 건드림?
4. **스킬 위치/이름** — 프로젝트 로컬 `.claude/skills/product-detail/SKILL.md` (이 repo 한정) 가정.
5. **스킬 동작 형태** — 단발 생성? 아니면 OMO식(plan→실행) 내부 절차를 가진 스킬?

### 시작 절차 (다음 세션)
1. 이 handoff + `roadmap.md` "▶ 다음 작업" 확인.
2. 위 미정 설계 5가지를 사용자와 인터뷰로 확정 (특히 #1 출력 본질).
3. 스킬 설계 — `agent-skill-creator` 에이전트(이 환경에 존재, skill/agent 생성 전문) 활용 또는 `/plan` 으로 진행. 우리 workflow(인터뷰→설계→momus 리뷰→/start-work) 적용.
4. SKILL.md 작성 + 예시 입력으로 1개 상품 상세 페이지 자동 구현 검증.

### 선결 / 제약
- 선결 없음(독립). 단 상세 페이지가 DB `Product` 기반이므로 카탈로그 DB(완료)가 토대.
- 배포는 사용자 결정으로 보류(모든 시스템 구현 후). 결제·관리자 등록·이미지 업로드·검색·리뷰는 별도 후보(roadmap).
- main 직접 commit 금지(feature branch + PR). Prisma 스키마 변경 시 Ask-First.
