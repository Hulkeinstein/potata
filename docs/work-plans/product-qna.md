# Work Plan: 상품 상세 Q&A (문의/답변) 섹션

> ⚠️ **작업 루트**: `e:\kamwoo\6.Programing\Potata\potata` (**Potata\potata**, src/ 없음). 옆 `Potato\potato` 절대 금지.
> **브랜치**: `feat/product-qna` (생성됨, 최신 main 기반 = 리뷰 PR1#41+PR2#42+이미지#43 머지 완료).

## Overview
- **Objective**: 비작동 Q&A 탭 골격(`ProductDetailClient.tsx:295-311`)을 실작동시킨다. 로그인 유저가 질문 작성·조회·수정·삭제, admin이 답변 작성·수정·삭제. 질문 삭제 시 답변 cascade. 리뷰 트랙 패턴을 복제하되 **이미지·평점집계·upsert 3대 복잡도 제거**.
- **Scope**:
  - **IN**: Question/Answer 스키마(비파괴) + db push · 질문 API(GET 공개목록 include answers / POST 전체 로그인 / PATCH 본인 / DELETE 본인 or admin) · 답변 API(POST/PATCH/DELETE admin only) · QASection UI + ProductDetailClient 연동 · 테스트(route + component).
  - **OUT**: 이미지 첨부 · 평점/집계 · 구매 게이트 · 비공개 질문(isPrivate) · seller 권한 · isAnswered 플래그 · Product.questionCount 컬럼.
- **Approach**: JSON body(`request.json()` `{ content }`) — multipart 아님. `prisma.question.create`(upsert 아님 — 1인 N질문). 수정/삭제는 questionId(PK) 기반 + IDOR 방지(먼저 조회 후 `record.userId === session.user.id || isAdmin(email)` 명시 비교). 답변 admin-only는 라우트 최상위 `isAdmin` 게이트. `onDelete: Cascade`로 질문 삭제 시 답변 자동 삭제. 탭 라벨 카운트는 MVP 생략(QASection 내부 "N개 문의" 표시) — Product 스키마 무변경.
  - **왜 이 접근?** 리뷰 route.ts(366줄)를 통째로 복제하면 불필요한 multipart/magic-byte/Storage/recompute가 따라붙음(Metis Over-engineering 경고). Q&A는 텍스트 전용 + 평점 없음 → JSON body로 단순화가 정답.

## Context

### Project Context (from docs/)
- **Product Goal** (북극성): 한국→UAE 패션 커머스. 인증·커머스 MVP·카탈로그 DB·Google OAuth·리뷰(작성+이미지+admin) 완료. 이번 = **Q&A(참여형 콘텐츠 확장)** — 카탈로그 가치 확장 트랙.
- **ADR Constraints Applied (DO NOT RE-DECIDE)**:
  - **ADR-008(불변)**: 상품 SSoT = DB. Question/Answer도 DB 모델.
  - **ADR-004**: Order.items Json — 이번 트랙은 구매 게이트 안 씀(질문은 전체 로그인).
  - **ADR-003**: 하이브리드 테스트(vi.mock prisma/auth/isAdmin).
- **Aligned with Existing Plans**: `review-images-admin.md`(머지 완료) 패턴 복제. 리뷰와 독립 트랙(스키마 비파괴 추가, breaking change 없음).
- **Out-of-Scope (from Metis/선결)**: 이미지·평점·구매게이트·비공개·seller·isAnswered·questionCount 컬럼.

### Interview Summary
재인터뷰 없음 — 선결 결정 전부 확정(Clearance Checklist 전부 YES). 핵심 결정:
- **질문 작성 권한 = 전체 로그인 유저**: `session?.user?.id` 있으면 작성. 구매 게이트 없음(`hasPurchasedProduct` import 금지). Q&A는 구매 전 문의가 자연스러움.
- **답변 작성 권한 = admin only**: `isAdmin(session.user.email)` 게이트(비admin 403).
- **수정/삭제 범위**: 질문 = 작성자 본인 수정·삭제 + admin 삭제. 답변 = admin 작성·수정·삭제. 1인 N질문 → `@@unique` 없음 → questionId(PK) 기반, IDOR 방지(조회 후 명시 소유 비교).
- **PR 분할 2개**: 리뷰와 달리 multipart breaking change 없음 → PR 분할 안전. PR1 = 스키마+API+테스트, PR2 = UI+테스트. **분할 근거**: PR1만으로 API 계약·권한·cascade가 독립 검증 가능(Tier2 적대검증 집중), PR2는 UI를 안정된 API 위에 얹어 회귀 위험 격리.

### Research Findings
- **스키마(librarian)**: Question(1):Answer(N), `onDelete: Cascade`(질문 삭제→답변 cascade). N+1 방지 `include:{ answers:{ orderBy:{ createdAt:'asc' } }, user:{ select:{ name:true } } }`.
- **권한(librarian)**: 3계층 Auth→Permission→Action. 답변 admin-only는 POST 최상위 `isAdmin` 체크.
- **캐시(librarian)**: `revalidatePath('/product/${id}')` 각 mutation 후. (리뷰는 `revalidateTag("products",{})`도 호출했으나 Q&A는 Product 컬럼 무변경 → path만으로 충분.)
- **복제원본 실측**:
  - `ProductDetailClient.tsx:247`(탭 배열), `:259`(Review 카운트 — **미변경**), `:289-292`(Review 탭 — **미변경**), `:295-311`(Q&A placeholder → 교체 대상).
  - `reviews/route.ts:26-82`(GET userName 평탄화), `:93-101`(auth 게이트), `:104`(async params), `:146-155`(상품 존재 확인), Result `{success,data|error}`, `extractErrorMessage`.
  - `ReviewSection.tsx:18-20`(useSession/isLoggedIn), `:27`(editing), `:80-90`(loadReviews fetch). **제거**: StarRating·이미지(keepUrls/files/previews)·평점.
  - `schema.prisma:176-191`(Review), User 역관계 `:26`, Product 역관계 `:92`.
  - `types/index.ts:281-305`(Review/CreateReviewRequest/ReviewListResponse 타입 형태).
  - `lib/admin.ts:37-39`(`isAdmin(email)`).

### Metis Review
**Identified Gaps (addressed in plan)**:
- **Over-engineering**: 리뷰 route 통째 복제 → multipart/Storage/recompute 누수. → **해소**: JSON body, `@/lib/supabase-storage`·`@/lib/image-validation`·`recomputeProductRating`·`hasPurchasedProduct` import 금지(Must NOT do 명시).
- **Hidden Complexity ①**: 답변 admin-only는 리뷰에 없던 신규 게이트(복합키 트릭 불가). → 답변 route 최상위 `isAdmin` 명시.
- **Hidden Complexity ②**: 1인 N질문 → `@@unique` 없음 → upsert 불가. → questionId 기반 수정/삭제 + IDOR 소유검증.
- **Hidden Complexity ③**: `onDelete: Cascade` 누락 시 FK P2003(고아 Answer). → schema에 Cascade 명시 + 테스트로 검증.
- **탭 카운트**: Q&A는 집계할 평점 없음 → `Product.questionCount` 컬럼 비권장. → MVP 탭 라벨 카운트 생략, QASection 내부 표시. Product 스키마 무변경.

**Missing Acceptance Criteria (added to Final Verification)**:
- 질문 삭제 시 답변 cascade 실제 삭제 검증.
- IDOR: 타인 questionId 수정/삭제 시도 403/404.
- 답변 비admin POST 403.

## Prerequisites
- [ ] 작업 루트 `e:\kamwoo\6.Programing\Potata\potata` 확인, 브랜치 `feat/product-qna` 체크아웃.
- [ ] `.env.local`에 `ADMIN_EMAILS` 존재(admin 답변 테스트용 — 기존 리뷰 트랙에서 설정됨).

---

## PR 분할

| PR | 범위 | 근거 |
|----|------|------|
| **PR1** | 스키마(Question/Answer + 역관계) + db push + 질문/답변 API + route 테스트 | API 계약·권한 다층·cascade·IDOR를 UI와 독립 검증. Tier2 적대검증 집중 지점. breaking change 없음(비파괴 추가). |
| **PR2** | QASection UI + ProductDetailClient 연동 + component 테스트 | 안정된 PR1 API 위에 UI 적층. Q&A 탭만 교체(Review/Detail 탭 회귀 격리). |

---

## TODOs

### Wave 1 — PR1 공유 의존성 (병렬)
- [x] 1. Question/Answer Prisma 모델 + 역관계 추가 `category:ultrabrain`
- [x] 2. Q&A 타입 정의 (types/index.ts) `category:quick`

### Wave 2 — PR1 API (Wave 1 완료 후, 병렬)
- [x] 3. 질문 컬렉션 라우트 — GET 목록 / POST 작성 `category:ultrabrain`
- [x] 4. 질문 단건 라우트 — PATCH 수정 / DELETE 삭제 `category:ultrabrain`
- [x] 5. 답변 컬렉션 라우트 — POST 작성 (admin) `category:ultrabrain`
- [x] 6. 답변 단건 라우트 — PATCH/DELETE (admin) `category:ultrabrain`

### Wave 3 — PR1 테스트 (Wave 2 완료 후, 병렬)
- [x] 7. 질문 라우트 테스트 (GET/POST/PATCH/DELETE + IDOR + cascade) `category:ultrabrain`
- [x] 8. 답변 라우트 테스트 (POST/PATCH/DELETE admin 게이트) `category:ultrabrain`
- [x] 9. PR1 db push + 기계검증 (tsc/lint/test/build) `category:quick`

### Wave 4 — PR2 UI (PR1 머지 후 — skeleton)
- [x] 10. QASection 컴포넌트 작성 `category:visual-engineering` (+ GET viewerIsAdmin 선행 enable)
- [x] 11. ProductDetailClient Q&A 탭 연동 `category:visual-engineering`
- [x] 12. QASection component 테스트 `category:ultrabrain`

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 | None | 공유 스키마 먼저 |
| 2 | None | 독립 타입 |
| 3 | 1, 2 | Question 모델 + 타입 필요 |
| 4 | 1, 2 | Question/Answer 모델 + 타입 |
| 5 | 1, 2 | Answer 모델 + 타입 |
| 6 | 1, 2 | Answer 모델 + 타입 |
| 7 | 3, 4 | 질문 라우트 대상 |
| 8 | 5, 6 | 답변 라우트 대상 |
| 9 | 3,4,5,6,7,8 | PR1 전체 검증 |
| 10 | 9(PR1 머지) | API 계약 안정 후 |
| 11 | 10 | QASection 컴포넌트 필요 |
| 12 | 10 | QASection 대상 |

---

## Parallel Execution Graph

```
Wave 1 (즉시, 병렬):
├── Task 1: Question/Answer 모델 + 역관계
└── Task 2: Q&A 타입

Wave 2 (W1 후, 병렬 — 4 routes):
├── Task 3: questions/route.ts (GET/POST)
├── Task 4: questions/[questionId]/route.ts (PATCH/DELETE)
├── Task 5: questions/[questionId]/answers/route.ts (POST)
└── Task 6: questions/[questionId]/answers/[answerId]/route.ts (PATCH/DELETE)

Wave 3 (W2 후, 병렬):
├── Task 7: 질문 라우트 테스트
├── Task 8: 답변 라우트 테스트
└── Task 9: db push + 기계검증 → PR1

Wave 4 (PR1 머지 후, skeleton):
├── Task 10: QASection
├── Task 11: ProductDetailClient 연동
└── Task 12: component 테스트 → PR2
```

Critical Path: Task 1 → Task 3 → Task 7 → Task 9 (PR1) → Task 10 → Task 11 (PR2)

---

## Category + Skills

| Task | Category | Category Reason | Skills Omitted (Why) |
|------|----------|----------------|----------------------|
| 1 | ultrabrain | 스키마 설계(관계·Cascade·인덱스), 비가역 db push | frontend-ui-ux: no UI |
| 2 | quick | 타입 선언만, 로직 없음 | - |
| 3 | ultrabrain | 권한 게이트 + 입력 검증 + N+1 방지 쿼리 | - |
| 4 | ultrabrain | IDOR 방지 소유 검증(보안) | - |
| 5 | ultrabrain | admin-only 신규 게이트 | - |
| 6 | ultrabrain | admin 게이트 + IDOR | - |
| 7 | ultrabrain | 권한 다층 + cascade + IDOR 케이스 | - |
| 8 | ultrabrain | admin 게이트 검증 케이스 | - |
| 9 | quick | db push + 명령 실행 | - |
| 10 | visual-engineering | 폼/목록 UI, 디자인 일관성 | - |
| 11 | visual-engineering | 탭 연동(회귀 격리 주의) | - |
| 12 | ultrabrain | 권한 분기·fetch mock 검증 | - |

---

## Final Verification Wave

- [x] F1. `npx tsc --noEmit` → ✅ exit 0
- [x] F2. `npm run lint` → ✅ 0 errors (잔존 warning 전부 기존)
- [x] F3. `npm run test` → ✅ 202 passed/6 skipped (질문/답변 라우트 테스트 72케이스 포함)
- [x] F4. `npm run build` → ✅ exit 0 (questions 동적 라우트 빌드)
- [x] F5~F10. 권한·IDOR·cascade·경로정합 → 단위테스트로 검증(by-test): 질문 작성 201/401, 답변 admin 201/비admin 403, 질문 수정 본인200/타인403/admin타인403/404, 삭제 본인or admin/cascade(delete 단일호출), 답변 admin CRUD, IDOR·경로불일치 404.
- [x] F11. revalidate: 각 mutation 후 `revalidatePath` 호출 테스트 단언.
- [x] F12. 회귀: ProductDetailClient·lib/products·reviews route 미변경(git diff 부재 — validator/oracle 확인).
- [x] F13. **Tier2 다중 적대검증** ✅: validator VALID/APPROVED(100/100, critical 0, 의미 일치). oracle "차단 이슈 없음"(CRITICAL/HIGH 0, H1 미재현) + MEDIUM(경로-리소스 정합) 보완 반영 + L2/L3 content 길이 통일.

---

## Test Strategy
- **방식**: tests-after (ADR-003 하이브리드 — `vi.mock` prisma/auth/isAdmin, component는 useSession/fetch mock).
- **프레임워크**: Vitest + @testing-library/react + jsdom.
- **복제원본**: `app/api/products/[id]/reviews/route.test.ts`(auth/prisma/$transaction/isAdmin mock 20+케이스), `components/product/ReviewSection.test.tsx`(useSession/fetch mock).
- **신규 테스트 파일**:
  - `app/api/products/[id]/questions/route.test.ts`
  - `app/api/products/[id]/questions/[questionId]/route.test.ts`
  - `app/api/products/[id]/questions/[questionId]/answers/route.test.ts`
  - `app/api/products/[id]/questions/[questionId]/answers/[answerId]/route.test.ts`
  - `components/product/QASection.test.tsx`

## Success Criteria
- [ ] Q&A 탭에서 로그인 유저 질문 CRUD(작성·수정·삭제·조회), admin 답변 CRUD 동작.
- [ ] 질문 삭제 시 답변 cascade 삭제.
- [ ] tsc·lint·test·build 전부 green.
- [ ] 권한 다층(질문 게이트·답변 admin·삭제 소유/admin·IDOR) Tier2 다중 적대검증 통과.
- [ ] Review/Detail 탭·카운트 회귀 0.

---

## 상세 TODO (PR1 = 완벽본 / PR2 = skeleton)

### Task 1. Question/Answer Prisma 모델 + 역관계 추가 `category:ultrabrain`
**Goal**: `prisma/schema.prisma`에 Question/Answer 모델 추가(비파괴) + User/Product 역관계 추가. `npx prisma generate` 성공, `npx prisma validate` 통과.
**References** (WHY):
- `prisma/schema.prisma:176-191` — Review 모델 패턴(id cuid / userId+user relation onDelete:Cascade / productId+product relation onDelete:Cascade / createdAt / updatedAt / `@@index([productId])` `@@index([userId])`). **복제하되 rating/comment/imageUrls/`@@unique([userId,productId])` 제거** (Q&A는 평점 없음 + 1인 N질문).
- `prisma/schema.prisma:26` — User 모델 `reviews Review[]` 역관계 위치. 아래에 `questions Question[]` `answers Answer[]` 추가.
- `prisma/schema.prisma:92` — Product 모델 `reviews Review[]` 역관계 위치. 아래에 `questions Question[]` 추가.
**스키마 형태** (가이드):
```prisma
model Question {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  content   String   // 질문 본문 (서버에서 길이 검증)
  answers   Answer[] // 1:N — 답변 cascade는 Answer 측 onDelete로
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId]) // 상품별 질문 목록 조회
  @@index([userId])
}

model Answer {
  id         String   @id @default(cuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade) // 질문 삭제 → 답변 cascade
  userId     String   // 답변 작성 admin의 userId
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  content    String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([questionId])
}
```
**Must NOT do**:
- `@@unique([userId, productId])` 추가 금지(1인 N질문 허용 — upsert 안 함).
- rating/comment/imageUrls 필드 추가 금지(Q&A는 평점·이미지 없음).
- `Product.questionCount` 컬럼 추가 금지(GET에서 aggregate, Product 스키마 무변경).
- `onDelete: Cascade` 누락 금지(Answer.question 관계 — 누락 시 질문 삭제 FK P2003).
- 기존 Review/User/Product 다른 필드 수정 금지.
**QA Scenarios** (agent-executable):
- Happy: `npx prisma validate` → exit 0. `npx prisma generate` → exit 0, `@prisma/client`에 `Question`/`Answer` 타입 생성.
- Edge: schema에 `Answer.question` relation의 `onDelete: Cascade` 문자열 grep 존재 확인.
- Negative: `@@unique` 키워드가 Question/Answer 블록에 **없어야** 함(grep로 부재 확인).

### Task 2. Q&A 타입 정의 `category:quick`
**Goal**: `types/index.ts`에 Question/Answer/Q&A 응답 타입 추가. tsc 통과.
**References** (WHY):
- `types/index.ts:281-305` — Review/CreateReviewRequest/ReviewListResponse 패턴(userName 평탄화, ISO string date, productId/userId는 body 불포함 주석). 형태 복제, 평점·이미지 필드 제거.
**타입 형태** (가이드):
```ts
// Q&A 관련 타입
export interface Answer {
  id: string;
  questionId: string;
  userName: string;   // 답변 admin 표시용 (User.name)
  content: string;
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
}
export interface Question {
  id: string;
  userId: string;
  userName: string;   // 작성자 표시용 (User.name) — GET join select
  productId: string;
  content: string;
  answers: Answer[];  // include로 채움(최신 답변 asc)
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
}
// NOTE: POST는 JSON body — { content } 만. productId는 URL param, userId는 session만 신뢰.
export interface CreateQuestionRequest { content: string; }
export interface CreateAnswerRequest { content: string; }
export interface QuestionListResponse { questions: Question[]; questionCount: number; }
```
**Must NOT do**: rating/imageUrls/averageRating 필드 추가 금지. `userId`를 body 타입에 추가 금지(session만 신뢰).
**QA Scenarios**:
- Happy: `npx tsc --noEmit` → exit 0.
- Negative: `CreateQuestionRequest`에 `userId`/`productId` 필드 부재(grep 확인).

### Task 3. 질문 컬렉션 라우트 (GET 목록 / POST 작성) `category:ultrabrain`
**Goal**: `app/api/products/[id]/questions/route.ts` 생성. GET = 공개 목록(answers include, 인증 불필요). POST = 전체 로그인 유저 작성(201). 둘 다 Result `{success,data|error}`.
**References** (WHY):
- `app/api/products/[id]/reviews/route.ts:26-82` — GET 구조(async params `await params`, `findMany` select + `user:{select:{name}}` 평탄화 → `userName: r.user.name ?? ""`, createdAt `.toISOString()`, Result 200). **복제하되 평점/Product.rating 조회 제거**.
- `app/api/products/[id]/reviews/route.ts:93-104` — POST auth 게이트(`if (!session?.user?.id) 401`), URL param productId(body 불신).
- `app/api/products/[id]/reviews/route.ts:146-155` — 상품 존재 확인(FK P2003 선차단 400).
- `lib/auth` `extractErrorMessage` — catch 블록 에러 메시지.
- `next/cache` `revalidatePath` — mutation 후.
**구현 가이드**:
- GET: `prisma.question.findMany({ where:{productId}, orderBy:{createdAt:'desc'}, include:{ answers:{ orderBy:{createdAt:'asc'}, select:{id,questionId,content,createdAt,updatedAt, user:{select:{name}}} }, user:{select:{name}} } })`. count = `prisma.question.count({where:{productId}})` (Promise.all). N+1 방지 위해 단일 include 쿼리.
- POST: auth → URL productId → `await request.json()`(파싱 실패 try-catch 400) → content 검증(string, trim 비어있지 않음, 최대 2000자, 400) → 상품 존재 확인(400) → `prisma.question.create({ data:{ userId: session.user.id, productId, content } })` → `revalidatePath('/product/${productId}')` → 201.
**Must NOT do**:
- `hasPurchasedProduct` import/호출 금지(질문은 구매 게이트 없음 — 전체 로그인).
- `isAdmin` 게이트 금지(질문 작성은 전체 로그인 — admin 전용 아님).
- multipart `formData()` 사용 금지 — JSON `request.json()`.
- `@/lib/supabase-storage`·`@/lib/image-validation`·`recomputeProductRating` import 금지.
- body의 `userId`/`productId` 신뢰 금지(session.user.id + URL param만).
- `$transaction` 불필요(단일 create — 사용 금지).
- `revalidateTag("products",{})` 호출 금지(Product 컬럼 무변경 — path만).
**QA Scenarios**:
- Happy: 로그인 POST `{content:"사이즈 문의"}` → 201, 응답 data에 created question. GET → 200, questions 배열에 포함, `userName` 채워짐.
- Edge: `{content:"   "}`(공백만) → 400. content 2001자 → 400.
- Negative: 비로그인 POST → 401(`session.user.id` 없음). 없는 productId POST → 400(존재하지 않는 상품).

### Task 4. 질문 단건 라우트 (PATCH 수정 / DELETE 삭제) `category:ultrabrain`
**Goal**: `app/api/products/[id]/questions/[questionId]/route.ts` 생성. PATCH = 작성자 본인만 수정(200). DELETE = 본인 또는 admin 삭제(200, 답변 cascade). IDOR 방지.
**References** (WHY):
- `app/api/products/[id]/reviews/route.ts:93-101` — auth 게이트 패턴.
- `app/api/products/[id]/reviews/route.ts:104` — async params(여기선 `Promise<{ id: string; questionId: string }>`).
- `lib/admin.ts:37-39` — `isAdmin(session.user.email)`.
**구현 가이드**:
- 공통: auth(401) → `const { id: productId, questionId } = await params` → `prisma.question.findUnique({ where:{id:questionId}, select:{id,userId,productId} })`. 없으면 404. (productId 불일치 시에도 404 — 경로 정합.)
- PATCH: `await request.json()` content 검증(400) → **소유 검증**: `if (existing.userId !== session.user.id) return 403`(질문 수정은 admin도 불가 — 본인만) → `prisma.question.update({ where:{id:questionId}, data:{content} })` → revalidatePath → 200.
- DELETE: **소유 또는 admin**: `if (existing.userId !== session.user.id && !isAdmin(session.user.email)) return 403` → `prisma.question.delete({ where:{id:questionId} })`(답변 onDelete:Cascade로 자동 삭제) → revalidatePath → 200.
**Must NOT do**:
- 조회 없이 `update`/`delete` 직행 금지 — **먼저 findUnique로 소유 확인**(IDOR 방지). Prisma `where:{id,userId}` 단일 조건 의존도 금지(404/403 구분 + 명시 비교 권장).
- body `userId` 신뢰 금지.
- 질문 수정에 admin 우회 허용 금지(수정은 **본인만**, 삭제만 admin 허용).
- DELETE 시 답변 수동 삭제 루프 금지(Cascade로 자동 — 수동 시 이중 처리).
**QA Scenarios**:
- Happy: 본인 PATCH `{content:"수정됨"}` → 200. 본인 DELETE → 200 + 연결 답변 0건.
- Edge: admin이 타인 질문 DELETE → 200(삭제 허용). admin이 타인 질문 PATCH → 403(수정 불허).
- Negative: 타인(비admin) PATCH/DELETE → 403. 없는 questionId → 404. body에 userId 주입해도 무시(session만).

### Task 5. 답변 컬렉션 라우트 (POST 작성, admin) `category:ultrabrain`
**Goal**: `app/api/products/[id]/questions/[questionId]/answers/route.ts` 생성. POST = admin only 답변 작성(201). 비admin 403.
**References** (WHY):
- `app/api/products/[id]/reviews/route.ts:93-101` — auth 게이트.
- `lib/admin.ts:37-39` — `isAdmin` — POST 최상위 게이트(리뷰엔 없던 신규 패턴).
**구현 가이드**:
- POST: auth(401) → `if (!isAdmin(session.user.email)) return 403`(최상위 admin 게이트) → `const { questionId } = await params` → `await request.json()` content 검증(400) → 질문 존재 확인 `prisma.question.findUnique({where:{id:questionId},select:{id}})`(없으면 404) → `prisma.answer.create({ data:{ questionId, userId: session.user.id, content } })` → revalidatePath(`/product/${productId}`) → 201.
**Must NOT do**:
- 비admin 작성 허용 금지(답변은 admin only — 최상위 isAdmin 게이트 필수).
- body `userId`/`questionId` 신뢰 금지.
- multipart/이미지/recompute 금지.
- 질문당 답변 개수 제한 로직 추가 금지(MVP — N개 허용).
**QA Scenarios**:
- Happy: admin POST `{content:"답변드립니다"}` → 201.
- Edge: 없는 questionId → 404.
- Negative: 비admin 로그인 POST → 403. 비로그인 → 401. 공백 content → 400.

### Task 6. 답변 단건 라우트 (PATCH/DELETE, admin) `category:ultrabrain`
**Goal**: `app/api/products/[id]/questions/[questionId]/answers/[answerId]/route.ts` 생성. PATCH/DELETE = admin only(200). 비admin 403.
**References** (WHY):
- `app/api/products/[id]/reviews/route.ts:93-101` — auth 게이트.
- `lib/admin.ts:37-39` — `isAdmin`.
- Task 4 — 단건 라우트 findUnique → 검증 → mutation 패턴 복제(답변은 소유 대신 admin 게이트).
**구현 가이드**:
- 공통: auth(401) → `if (!isAdmin(session.user.email)) return 403` → `const { answerId } = await params` → `prisma.answer.findUnique({where:{id:answerId},select:{id}})`(없으면 404).
- PATCH: content 검증(400) → `prisma.answer.update({where:{id:answerId},data:{content}})` → revalidatePath → 200.
- DELETE: `prisma.answer.delete({where:{id:answerId}})` → revalidatePath → 200.
**Must NOT do**:
- 비admin PATCH/DELETE 허용 금지(admin only).
- 소유(userId) 기반 게이트로 대체 금지(답변은 작성자=admin이지만 게이트는 isAdmin로 통일 — 다른 admin도 편집 허용).
- body 신뢰 금지.
**QA Scenarios**:
- Happy: admin PATCH `{content:"수정 답변"}` → 200. admin DELETE → 200.
- Edge: 없는 answerId → 404.
- Negative: 비admin → 403. 비로그인 → 401.

### Task 7. 질문 라우트 테스트 `category:ultrabrain`
**Goal**: `route.test.ts`(컬렉션) + `[questionId]/route.test.ts`(단건) 작성. GET/POST/PATCH/DELETE + IDOR + cascade 케이스. `npm run test` green.
**References** (WHY):
- `app/api/products/[id]/reviews/route.test.ts` — `vi.mock("@/auth")` auth, `vi.mock("@/lib/prisma")` prisma, `vi.mock("@/lib/admin")` isAdmin mock 패턴, NextRequest 생성, status/JSON 단언(20+케이스 구조).
**테스트 케이스 필수**:
- GET: 목록 반환(answers include), 빈 목록.
- POST: 로그인 201 / 비로그인 401 / 공백 content 400 / 없는 productId 400 / body userId 무시(session 사용).
- PATCH: 본인 200 / 타인 403 / admin 타인 수정 403(수정 본인만) / 없는 questionId 404.
- DELETE: 본인 200 / admin 타인 200 / 타인 비admin 403 / 없는 questionId 404 / **cascade**: delete 호출 시 답변 함께 삭제(mock으로 question.delete 호출 단언, schema Cascade 신뢰).
**Must NOT do**: 실제 DB 연결 금지(prisma mock). isAdmin 실제 env 의존 금지(mock).
**QA Scenarios**:
- Happy: `npm run test -- questions/route` → 전 케이스 pass.
- Negative: IDOR 케이스(타인 PATCH 403)가 실제로 403 단언.

### Task 8. 답변 라우트 테스트 `category:ultrabrain`
**Goal**: `answers/route.test.ts` + `answers/[answerId]/route.test.ts` 작성. admin 게이트 케이스. green.
**References** (WHY):
- `app/api/products/[id]/reviews/route.test.ts` — isAdmin mock 패턴(admin true/false 분기).
**테스트 케이스 필수**:
- POST: admin 201 / 비admin 403 / 비로그인 401 / 공백 content 400 / 없는 questionId 404.
- PATCH/DELETE: admin 200 / 비admin 403 / 없는 answerId 404.
**Must NOT do**: isAdmin 실제 env 의존 금지(mock true/false).
**QA Scenarios**:
- Happy: `npm run test -- answers` → 전 케이스 pass.
- Negative: 비admin POST 403 단언.

### Task 9. PR1 db push + 기계검증 `category:quick`
**Goal**: `npx prisma db push`(dev DB 반영) → `npx prisma generate` → tsc/lint/test/build green. PR1 커밋.
**References** (WHY):
- `CLAUDE.md` Commands — `npx prisma db push`, `npx prisma generate`, 검증 명령.
**Must NOT do**: `prisma migrate`(이 프로젝트는 db push 사용). main 직접 commit 금지.
**QA Scenarios**:
- Happy: `npx prisma db push` → 성공(Question/Answer 테이블 생성). `npx tsc --noEmit` `npm run lint` `npm run test` `npm run build` 전부 exit 0.
- Negative: db push 후 기존 Review/User/Product 데이터 무손상(비파괴 추가 — 기존 row 영향 없음).

---

### Task 10. QASection 컴포넌트 작성 `category:visual-engineering` (skeleton)
**Goal**: `components/product/QASection.tsx` — 질문 목록(답변 중첩 표시) + 작성/수정/삭제 폼 + admin 답변 폼. ReviewSection UX 복제(이미지·평점 제거).
**References (방향)**: `ReviewSection.tsx:18-20`(useSession/isLoggedIn), `:27`(editing toggle), `:80-90`(loadReviews fetch). admin 판정은 클라에서 `isAdmin` 직접 호출 불가(서버 전용) → session.user.email 노출 여부 확인 후 결정(상세화 시 grep).
**DoD 방향**: 로그인 시 작성 폼, 본인 질문 수정/삭제 버튼, admin 답변 폼, 빈 상태("아직 문의가 없습니다"), "N개 문의" 카운트 내부 표시. fetch로 `/api/products/[id]/questions` 연동.
**영향범위**: `components/product/QASection.tsx`(신규). Review/Detail 무관.
> ⚠️ Wave 4 착수 직전 skeleton→완벽본: admin 클라 판정 방식(session.user.email vs 서버 prop) grep 확정, 폼 상태 구조 상세화, QA Scenarios 구체화.

### Task 11. ProductDetailClient Q&A 탭 연동 `category:visual-engineering` (skeleton)
**Goal**: `ProductDetailClient.tsx:295-311` placeholder → `<QASection productId={product.id} />` 교체.
**References (방향)**: `ProductDetailClient.tsx:289-292`(Review 탭 연동 패턴 — 동일 구조로 Q&A), `:295-311`(교체 대상 placeholder).
**DoD 방향**: Q&A 탭 클릭 시 QASection 렌더. import 추가.
**영향범위**: `ProductDetailClient.tsx`의 Q&A 탭 블록만.
**Must NOT do (확정)**: Review 탭(`:289-292`)·카운트(`:259`)·Detail 탭(`:269-287`)·탭 배열(`:247`) 미변경. 탭 라벨에 Q&A 카운트 추가 금지(MVP — 내부 표시).
> ⚠️ Wave 4 착수 직전: 라인 stale 재확인 후 완벽본.

### Task 12. QASection component 테스트 `category:ultrabrain` (skeleton)
**Goal**: `components/product/QASection.test.tsx` — 권한 분기·fetch mock. green.
**References (방향)**: `components/product/ReviewSection.test.tsx`(useSession/fetch mock 패턴).
**DoD 방향**: 비로그인=폼 숨김, 로그인=작성 폼, admin=답변 폼 표시, 목록 렌더. fetch mock.
> ⚠️ Wave 4 착수 직전: admin 판정 방식 확정 후 케이스 상세화.

---

## Rolling-wave 주석
- **PR1(Task 1~9)**: 완벽본 — Goal/References(파일:라인)/Must NOT do/QA Scenarios 완비.
- **PR2(Task 10~12)**: skeleton — PR1 머지 후 API 안정 + admin 클라 판정 방식 확정 시점에 완벽본화. 현재는 Goal + DoD 방향 + 영향범위만.
