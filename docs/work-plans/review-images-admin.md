# Work Plan: 리뷰 이미지 첨부(0~3장) + admin 구매 게이트 우회

> ⚠️ **작업 루트 = `e:\kamwoo\6.Programing\Potata\potata`** (**Potata\potata**, src/ 없음).
> 옆 동명 `Potato\potato`는 **다른 프로젝트 — 절대 사용 금지**. 모든 경로는 이 루트 기준 상대 경로.
> 브랜치: `feat/review-images-admin` (최신 main 기반 = 리뷰 PR1 #41 + PR2 #42 머지 완료).

---

## Overview

- **Objective**: 로그인 구매자(또는 admin)가 리뷰에 이미지 0~3장을 첨부·조회·수정·삭제한다. admin(`ADMIN_EMAILS`)은 미구매 상품에도 리뷰 작성 가능, **일반 유저는 구매 게이트 유지**.
- **Scope**:
  - **IN**: 이미지 0~3장 첨부(선택 — 별점만도 OK) / 조회(썸네일) / 수정 시 차집합 Storage 정리 / 삭제 시 전량 Storage 정리 / 업로드 후 DB 실패 시 보상 삭제 / magic-byte 검증 / `review-images` public 버킷 / admin 구매 게이트 우회 / `Review.imageUrls String[]` schema 추가 + `db push`.
  - **OUT**: 일반 유저 게이트 약화(admin만 우회) / objectURL 미리보기 / 이미지 편집·크롭 / 동영상 / 상품 이미지(ADR-005 외부 CDN, 무관) / 총합 용량 상한(15MB — 선택, 이번 미구현) / admin route `sniffImage` 공용화 마이그레이션(이번 PR은 복사 또는 신규 공용만, admin route 무수정).
- **Approach**: POST를 `request.json()` → `request.formData()` multipart로 전환하고, 동일 PR에서 UI(ReviewSection FormData)·테스트(formData 헬퍼)를 atomic 머지한다. Storage 업로드는 `$transaction` **밖**에서 수행 → 성공 시 `$transaction`(upsert + recompute) → DB 실패 시 신규 업로드분 보상 삭제. 수정 시 **차집합(기존∖신규)만** Storage 삭제(미변경 이미지 보존). 검증된 OOTD 다중이미지 패턴(`app/api/ootd/route.ts`)과 admin `sniffImage`(magic-byte)를 그대로 재사용.

---

## 🔴 단일 atomic PR 필수 (PR 분할 금지)

POST가 현재 `request.json()`(`app/api/products/[id]/reviews/route.ts:92`)이고 **main에 머지된 `ReviewSection`이 JSON으로 전송 중**(`components/product/ReviewSection.tsx:77-81`). POST를 multipart로 전환하면 즉시 main의 리뷰 제출이 깨진다. 따라서 **API(multipart 전환) + UI(ReviewSection FormData) + 테스트(formData 헬퍼)를 한 PR로 atomic 머지**한다. 여러 Wave로 구성하되 **단일 plan / 단일 PR**.

---

## Context

### Project Context (from docs/)
- **Product Goal (북극성)**: 한국→UAE 패션 커머스. 리뷰 작성(별점+코멘트+집계→BEST) 완료. 이번 = 참여형 콘텐츠 강화(이미지 UGC + admin 시딩).
- **ADR Constraints Applied (DO NOT RE-DECIDE)**:
  - **ADR-007**: Supabase Storage public 버킷, `lib/supabase-storage.ts` server-only REST(`import "server-only"`), service_role 서버 전용. 흐름(auth→MIME화이트리스트/크기/장수 검증→upload→getPublicUrl→imageUrls String[])+보상삭제. `next.config` remotePatterns **이미 등록**(`next.config.ts:18-23`, `ptosrqkdatrygksyuvpm.supabase.co/storage/v1/object/public/**` — review-images도 동일 프로젝트 public 버킷이므로 **추가 불필요, 확인 완료**). 테스트 `vi.mock("@/lib/supabase-storage")`.
  - **ADR-005**: 상품 이미지=외부 CDN URL — 이번 트랙 무관(review-images는 UGC).
  - **ADR-004**: `Order.items` Json — 구매 게이트 `hasPurchasedProduct`(`lib/reviews.ts:36-49`).
- **Aligned with Existing Plans**: `docs/work-plans/product-reviews.md`(리뷰 PR1+PR2 완료)의 직접 후속. 독립 신규 아님 — 기존 라우트/컴포넌트/테스트를 확장.

### Interview Summary (선결 — 전부 확정, 재인터뷰 없음)
- **이미지**: 최대 3장, **선택**(0장 가능). per-file 5MB, jpg/png/webp, **magic-byte 검증**(클라 MIME 불신).
- **버킷**: 신규 `review-images` public 버킷(ADR-007 패턴).
- **admin 우회**: `isAdmin(session.user.email)` 시 구매 게이트 스킵. 일반 유저는 게이트 유지.
- **schema**: `Review.imageUrls String[] @default([])` 추가(`OOTDPost.imageUrls`=`schema.prisma:143` 동형, 비파괴) + `db push`.
- **단일 atomic PR**: 위 근거.

### Research Findings (stale 재확인 완료 — 실측)
- **POST `request.json()`** — `route.ts:92`. → `request.formData()` 전환 시 main 리뷰 제출 즉시 파손 → 단일 PR 강제.
- **DELETE `select:{ id:true }`** — `route.ts:219`. → `imageUrls:true` 추가 필요(현재 Storage 정리 누락 = Metis HIGH gap 2).
- **GET select** — `route.ts:23-32`엔 `imageUrls` 없음, map(`route.ts:41-50`)에도 없음 → 추가 필요.
- **POST 게이트** — `route.ts:138`에 admin 우회 없음(`hasPurchasedProduct`만) → `isAdmin` 분기 추가.
- **supabase-storage 제네릭 코어** — `uploadImage`/`removeImagesByUrl`/`publicUrlToPath`(`:40-93`). Product 래퍼(`:119-131`) 패턴 동형으로 review 래퍼 추가.
- **admin `sniffImage`** — `app/api/admin/products/route.ts:23-37`(jpg `FF D8 FF` / png `89 50 4E 47 0D 0A 1A 0A` / webp `RIFF....WEBP`), `ALLOWED_TYPES`/`MAX_SIZE`=`:10-15`.
- **OOTD 라우트 선례** — `getAll("images")` File 필터(`ootd/route.ts:28`), 검증 루프(`:42-55`), 업로드 루프 트랜잭션 밖(`:69-75`), DB 실패 보상(`:90`).
- **OOTD UI 선례** — `WhatToWearClient.tsx:258-343`(files state·`onFileChange`·`MAX_IMAGES`/`ALLOWED`/`MAX_SIZE` 클라 사전검증·"N장 선택됨"·`fd.append("images", f)`).
- **OOTD 테스트 선례** — `ootd/route.test.ts:32-39`: 실 multipart round-trip 대신 `{ url, formData: async () => fd }` fake req 주입("jsdom 환경 Request(body:FormData)→formData() 불안정"). **단 OOTD fixture는 all-zero `Uint8Array`(`:27-29`)라 magic-byte를 통과 못 함** → reviews fixture는 **실제 시그니처 바이트** 필요(아래 W4 명시).
- **lib/reviews** — `recomputeProductRating`(tx)·`hasPurchasedProduct`(`:36-49`) 둘 다 POST import(`route.ts:7`). admin 우회는 `hasPurchasedProduct` 게이트를 감쌈.
- **StarRating** — `components/product/StarRating.tsx`(interactive `aria-label="별점 N점"`) — 무수정.

### Metis Review (gap → 해소 위치)
- **GAP — JSON→multipart 계약 전환 파급**: 단일 PR(W2 API + W3 UI + W4 테스트 동시) → atomic.
- **GAP — DELETE Storage 정리 누락**(현재 `select:{id:true}`): W2 TODO 6에서 `imageUrls:true` + `$transaction` 후 `removeReviewImagesByUrl(existing.imageUrls)`.
- **GAP — upsert update 차집합 삭제**(전량 삭제 금지): W2 TODO 5에서 기존 `review.imageUrls` 조회 → `$transaction` 성공 후 `차집합(기존∖신규)`만 Storage 삭제.
- **GAP — Storage I/O는 `$transaction` 밖 + DB 실패 보상**: W2 TODO 5 — 업로드 루프(트랜잭션 밖) → `$transaction` → catch 시 신규 업로드분 보상 삭제.
- **GAP — 부분 업로드 실패**(3장 중 일부): W2 TODO 5 — 업로드 루프 try/catch, 실패 시 이미 올린 분 정리 후 throw.
- **GAP — `ReviewSection.test` 케이스 ④가 `body: JSON.stringify(...)`를 정확히 단언**(`ReviewSection.test.tsx:213-222`): FormData 전환 시 **이 단언이 깨짐** → W4 TODO 9에서 `body: expect.any(FormData)`로 갱신(미갱신 시 green build 실패).
- **MISSING AC — 총합 용량 상한(15MB)**: 선택 사항 → 이번 OUT(scope 고정).

---

## Prerequisites
- [ ] 브랜치 `feat/review-images-admin` 체크아웃(생성됨, main 기반).
- [ ] `review-images` public 버킷 — Supabase 콘솔에서 생성 필요(ADR-007 `product-images`/`ootd-images` 동형 설정: public read, service_role write). 코드는 버킷명만 바인딩하며 버킷 실생성은 운영 작업(F8에서 명시).

---

## TODOs

### Wave 1 (병렬 — 공유 기반: schema·types·storage 래퍼·magic-byte 공용)
- [x] 1. schema에 `Review.imageUrls String[] @default([])` 추가 `category:ultrabrain`
- [x] 2. types에 `Review.imageUrls` 추가 + `CreateReviewRequest` 주석 갱신(multipart화) `category:quick`
- [x] 3. `supabase-storage`에 review 래퍼 2함수 추가(`uploadReviewImage`/`removeReviewImagesByUrl`) `category:quick`
- [x] 4. magic-byte 검증 공용 모듈 `lib/image-validation.ts` 신규(복사 추출) `category:ultrabrain`

### Wave 2 (W1 완료 후 — reviews 라우트 GET/POST/DELETE)
- [x] 5. POST를 multipart로 전환 + admin 우회 + 이미지 검증/업로드/차집합/보상 `category:ultrabrain`
- [x] 6. DELETE에 Storage 정리 추가(`imageUrls` 조회 → 삭제 후 전량 정리) `category:ultrabrain`
- [x] 7. GET select·map에 `imageUrls` 추가 `category:quick` (TODO 2 작업 중 tsc 통과 위해 선반영됨 — route 작업 시 확인)

### Wave 3 (W2 완료 후 — ReviewSection UI)
- [x] 8. `ReviewSection`을 FormData 전송 + 파일 input(0~3장) + 클라 사전검증 + 썸네일 렌더 `category:visual-engineering`

### Wave 4 (W2·W3 완료 후 — 테스트)
- [x] 9. `route.test.ts` multipart 전환 + storage/admin mock + 신규 케이스 `category:ultrabrain`
- [x] 10. `ReviewSection.test.tsx` FormData 단언 전환 + 이미지 UI 케이스 `category:writing`

### Wave 5 (전체 완료 후 — DB 반영)
- [x] 11. `npx prisma generate` + `npx prisma db push`(dev) `category:quick`

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|-----------|--------|
| 1 (schema) | None | 공유 필드 — 모든 후속의 SSoT |
| 2 (types) | None | 독립(런타임 무관, 컴파일 타임) |
| 3 (storage 래퍼) | None | 제네릭 코어 위 래퍼 — 독립 |
| 4 (magic-byte 공용) | None | admin route 복사 추출 — 독립(admin route 무수정) |
| 5 (POST) | 1, 2, 3, 4 | imageUrls 필드 + 타입 + 업로드/삭제 래퍼 + sniff 필요 |
| 6 (DELETE) | 1, 3 | imageUrls 필드 + remove 래퍼 필요 |
| 7 (GET) | 1, 2 | imageUrls 필드 + Review 타입 필요 |
| 8 (UI) | 2, 5 | Review 타입(썸네일) + POST multipart 계약 |
| 9 (route 테스트) | 5, 6, 7 | 3개 핸들러 최종 동작 검증 |
| 10 (UI 테스트) | 8 | 변경된 컴포넌트 검증 |
| 11 (db push) | 1 | schema 확정 후 |

---

## Parallel Execution Graph

```
Wave 1 (즉시 시작, 병렬):
├── Task 1: schema Review.imageUrls
├── Task 2: types Review.imageUrls
├── Task 3: supabase-storage review 래퍼
└── Task 4: lib/image-validation.ts (magic-byte 공용)

Wave 2 (W1 완료 후, 병렬 — 같은 파일 route.ts라 순차 편집 권장):
├── Task 5: POST multipart + admin + 이미지
├── Task 6: DELETE Storage 정리
└── Task 7: GET imageUrls

Wave 3 (W2 완료 후):
└── Task 8: ReviewSection UI

Wave 4 (W2·W3 완료 후, 병렬):
├── Task 9: route.test.ts
└── Task 10: ReviewSection.test.tsx

Wave 5 (전체 완료 후):
└── Task 11: prisma generate + db push
```

> ⚠️ Task 5/6/7은 모두 `app/api/products/[id]/reviews/route.ts` **단일 파일**을 편집한다. 병렬 위임 대신 **한 에이전트가 5→6→7 순차 편집**을 권장(편집 충돌 회피). 의존 그래프상 논리적 병렬이나 물리적 동일 파일.

**Critical Path**: Task 1 → Task 5 → Task 8 → Task 9 → F1~F9

---

## Category + Skills

| Task | Category | Category Reason | Skills Omitted (Why) |
|------|----------|----------------|----------------------|
| 1 | ultrabrain | schema 변경(비가역 영향·db push 동반) — 신중 | frontend-ui-ux: no UI |
| 2 | quick | 인터페이스 1필드 + 주석 | - |
| 3 | quick | 제네릭 코어 위 래퍼 ~6줄(Product 래퍼 동형) | - |
| 4 | ultrabrain | 보안 검증 로직(magic-byte) — 정확성 critical | frontend-ui-ux: no UI |
| 5 | ultrabrain | multipart 전환 + 권한 게이트 + Storage 트랜잭션 경계 + 보상 — 복잡·보안 | - |
| 6 | ultrabrain | 비가역(파일 삭제) + 트랜잭션 경계 | - |
| 7 | quick | select/map 1필드 추가 | - |
| 8 | visual-engineering | 파일 input + 썸네일 그리드 UI | - |
| 9 | ultrabrain | multipart 테스트 설계 + magic-byte fixture + mock | - |
| 10 | writing | 단언 전환 + UI 케이스(기존 패턴 답습) | - |
| 11 | quick | 명령 2개 실행 | - |

---

## Per-TODO 상세

### Task 1. schema `Review.imageUrls` 추가 `category:ultrabrain`
**Goal**: `prisma/schema.prisma`의 Review 모델에 `imageUrls String[] @default([])` 1줄 추가. `npx prisma generate` 시 타입 반영(W5에서 push).
**References**:
- `prisma/schema.prisma:176-190` — Review 모델. `comment String?`(:183) 아래, `createdAt`(:184) 위에 `imageUrls String[] @default([]) // Supabase Storage public URL 배열(최대 3장) — OOTDPost.imageUrls 패턴` 추가.
- `prisma/schema.prisma:143` — `OOTDPost.imageUrls String[] @default([])` 동형(복사 기준).
**Must NOT do**: 다른 필드/인덱스/`@@unique` 변경 금지(외과적 1줄). Product 모델·OOTDPost 무수정.
**QA Scenarios**:
- Happy: 추가 후 `npx prisma generate` → exit 0, `Review` 타입에 `imageUrls: string[]` 노출.
- Negative: `@@unique([userId, productId])`(:187)·`@@index`(:188-189) 그대로 유지 — diff에 이 줄 미포함.

### Task 2. types `Review.imageUrls` + 주석 `category:quick`
**Goal**: `types/index.ts`의 `Review` 인터페이스에 `imageUrls: string[]` 추가. `CreateReviewRequest` 주석에 multipart 전환 명시.
**References**:
- `types/index.ts:281-290` — `Review`. `updatedAt: string;`(:289) 아래에 `imageUrls: string[]; // 첨부 이미지 public URL 배열(0~3장)` 추가.
- `types/index.ts:292-297` — `CreateReviewRequest`. 본문 유지하되 주석 1줄 추가: `// NOTE: POST는 multipart/form-data로 전송 — rating/comment/images[]는 FormData로 파싱(이 타입은 의미 참조용).`
**Must NOT do**: `ReviewListResponse`(:299-303) 구조 변경 금지(`reviews: Review[]`가 자동으로 imageUrls 포함). 다른 인터페이스 무수정.
**QA Scenarios**:
- Happy: `npx tsc --noEmit` → GET map(Task 7)에서 `imageUrls` 채울 때 타입 에러 없음.
- Negative: `CreateReviewRequest`에 `images` 필드 추가 금지(FormData 파싱이라 타입 불필요 — 주석만).

### Task 3. supabase-storage review 래퍼 `category:quick`
**Goal**: `lib/supabase-storage.ts` 끝에 `REVIEW_BUCKET="review-images"` + `uploadReviewImage(userId, file)` + `removeReviewImagesByUrl(urls)` 추가(Product 래퍼 동형).
**References**:
- `lib/supabase-storage.ts:115-131` — Product 래퍼 블록. 그 아래에 동일 구조로:
  ```ts
  const REVIEW_BUCKET = "review-images";
  export function uploadReviewImage(userId: string, file: ImageFile): Promise<{ path: string; publicUrl: string }> {
    return uploadImage(REVIEW_BUCKET, userId, file); // path: ${userId}/${uuid}.${ext}
  }
  export function removeReviewImagesByUrl(publicUrls: string[]): Promise<void> {
    return removeImagesByUrl(REVIEW_BUCKET, publicUrls);
  }
  ```
- `lib/supabase-storage.ts:40-93` — 제네릭 코어(`uploadImage`/`removeImagesByUrl`) 재사용 — 무수정.
**Must NOT do**: 제네릭 코어(`:40-93`)·OOTD 래퍼(`:99-113`)·Product 래퍼(`:119-131`) 변경 금지. `import "server-only"`(:1) 유지 — service_role 클라 노출 금지.
**QA Scenarios**:
- Happy: `uploadReviewImage("u1", file)` → path `u1/<uuid>.jpg`, publicUrl `.../public/review-images/u1/<uuid>.jpg`.
- Edge: `removeReviewImagesByUrl([])` → no-op(제네릭 `:79` 빈 배열 가드).

### Task 4. magic-byte 공용 모듈 `lib/image-validation.ts` `category:ultrabrain`
**Goal**: admin route의 `sniffImage` + `ALLOWED_TYPES` + `MAX_SIZE`를 **복사**해 `lib/image-validation.ts` 신규 작성(DRY 신규 모듈). **admin route는 이번 PR에서 무수정**(회귀 위험 회피 — 추후 마이그레이션은 별도).
**References**:
- `app/api/admin/products/route.ts:10-15` — `ALLOWED_TYPES`(jpg/png/webp), `MAX_SIZE = 5*1024*1024`.
- `app/api/admin/products/route.ts:23-37` — `sniffImage(buf: ArrayBuffer): "jpg"|"png"|"webp"|null`(jpg `FF D8 FF` / png 8바이트 / webp RIFF+WEBP).
- export 시그니처: `export const ALLOWED_IMAGE_TYPES`, `export const MAX_IMAGE_SIZE`, `export function sniffImage(buf: ArrayBuffer)`. 추가로 `export const MAX_REVIEW_IMAGES = 3;`.
**Must NOT do**: admin route(`route.ts`) 수정 금지(공용화 마이그레이션은 OUT — admin 회귀 차단). 시그니처/바이트 검증 로직 변경 금지(정확히 복사). 한국어 주석 유지.
**QA Scenarios**:
- Happy: `sniffImage(jpgBuf)` → `"jpg"`, `sniffImage(pngBuf)` → `"png"`, `sniffImage(webpBuf)` → `"webp"`.
- Negative: `sniffImage(new Uint8Array([0,0,0]).buffer)` → `null`(위조/미지원 → 400 유발).
- Edge: 빈/짧은 버퍼 → `null`(length 가드).

### Task 5. POST multipart 전환 + admin 우회 + 이미지 처리 `category:ultrabrain`
**Goal**: `app/api/products/[id]/reviews/route.ts` POST를 multipart로 전환. 흐름: auth(session.user.id 유지) → params → `formData()` 파싱(rating·comment + `getAll("images")` File) → rating·comment 검증 유지 → 상품 존재 → **admin 우회 게이트** → 이미지 검증(≤3·5MB·sniff) → 기존 imageUrls 조회 → 업로드 루프(트랜잭션 밖) → `$transaction`(upsert에 imageUrls 포함 + recompute) → DB 실패 시 보상 → 수정 시 차집합 Storage 삭제 → revalidate.
**References**:
- `route.ts:71-192` — 현재 POST 전체. 아래 지점 변경:
  - import 추가: `import { isAdmin } from "@/lib/admin";`, `import { uploadReviewImage, removeReviewImagesByUrl } from "@/lib/supabase-storage";`, `import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, MAX_REVIEW_IMAGES, sniffImage } from "@/lib/image-validation";`
  - `:90-98` `request.json()` → `const form = await request.formData();` (try/catch 유지 — 파싱 실패 400). `rating = Number(form.get("rating"))`, `comment = form.get("comment")`(string|null), `files = form.getAll("images").filter((f): f is File => f instanceof File)`.
  - rating 검증(`:102-107`)·comment 검증(`:110-123`) **로직 유지**(form 값 기준으로 타입 가드 조정 — `comment`는 `string|null`).
  - 상품 존재(`:126-135`) 유지.
  - **게이트(`:138`)**: `if (!isAdmin(session.user.email) && !(await hasPurchasedProduct(session.user.id, productId)))` → 403. (admin은 우회, 일반 유저는 게이트 유지.)
  - **이미지 검증**(게이트 후): `files.length > MAX_REVIEW_IMAGES` → 400. 각 파일: `f.size > MAX_IMAGE_SIZE` → 400; `const buf = await f.arrayBuffer(); const ext = sniffImage(buf);` `ext == null` → 400. (0장 = 통과.)
  - **기존 imageUrls 조회**(차집합용): `const prev = await prisma.review.findUnique({ where: { userId_productId: { userId: session.user.id, productId } }, select: { imageUrls: true } });`
  - **업로드 루프**(트랜잭션 밖, 부분 실패 정리): `const uploaded: string[] = []; try { for each file → uploadReviewImage(session.user.id, {data:buf,contentType:f.type,ext}) → uploaded.push(publicUrl) } catch(e){ await removeReviewImagesByUrl(uploaded).catch(()=>{}); throw e }`
  - **`$transaction`**(`:150-168`): upsert `create`/`update` data에 `imageUrls: uploaded` 추가 + `recomputeProductRating(tx, productId)`.
  - **DB 실패 보상**: `$transaction`을 try/catch로 감싸 실패 시 `await removeReviewImagesByUrl(uploaded).catch(()=>{}); throw`.
  - **차집합 삭제**(성공 후): `const removed = (prev?.imageUrls ?? []).filter(u => !uploaded.includes(u)); await removeReviewImagesByUrl(removed).catch(()=>{});` (기존∖신규만 — 미변경 보존. 단 현재 정책상 매 제출 새 업로드라 기존 전량이 차집합 → 사실상 이전 이미지 정리. **전량 무조건 삭제 금지 — 반드시 차집합 연산 경유.**)
  - revalidate(`:171-172`)·catch P2002(`:178-186`) 유지.
**Must NOT do**:
  - 일반 유저 구매 게이트 약화 금지 — **admin만** 우회(`isAdmin(session.user.email)` AND 조건).
  - body `userId`/`productId` 신뢰 금지 — `session.user.id` + URL `[id]`만.
  - `$transaction` **안에서 Storage I/O 금지**(업로드/삭제는 트랜잭션 밖).
  - upsert 시 기존 이미지 **전량 무조건 삭제 금지** — 차집합(`prev ∖ uploaded`) 연산.
  - `import "server-only"` 우회/`SUPABASE_SERVICE_ROLE_KEY` 클라 노출 금지.
  - `lib/products.ts` `getProductById` 캐시 변경 금지.
**QA Scenarios**:
- Happy(구매자, 이미지 0장): rating=4, images 없음 → 201, `imageUrls:[]`, upload 미호출.
- Happy(구매자, 3장 정상 jpg): → 201, `imageUrls.length===3`, `uploadReviewImage` 3회.
- Happy(admin 미구매): `isAdmin` true & `hasPurchasedProduct` false → 201(우회).
- Negative(일반 유저 미구매): `isAdmin` false & 미구매 → 403(게이트 유지).
- Edge(4장): `files.length===4` → 400, 업로드 미호출.
- Edge(per-file 6MB): → 400, 업로드 미호출.
- Edge(magic-byte 위조: `.jpg` 이름이나 바이트 `00 00 00`): `sniffImage` null → 400.
- Edge(수정 차집합): 기존 2장 → 새 1장 제출 → upsert update, `removeReviewImagesByUrl(기존 2장)` 호출(차집합).
- Negative(DB 실패): `$transaction` reject → `removeReviewImagesByUrl(uploaded)` 보상 호출 후 500.
- Edge(부분 업로드 실패): 3장 중 2번째 실패 → 1번째 정리 후 throw → 500.

### Task 6. DELETE Storage 정리 `category:ultrabrain`
**Goal**: `route.ts` DELETE에서 삭제 대상 review의 `imageUrls`를 조회 → `$transaction`(delete + recompute) 성공 후 `removeReviewImagesByUrl(imageUrls)` 전량 정리.
**References**:
- `route.ts:217-220` — `findUnique` select `{ id: true }` → `{ id: true, imageUrls: true }`로 변경.
- `route.ts:229-234` — `$transaction`(delete + recompute) 유지. **트랜잭션 후** `await removeReviewImagesByUrl(existing.imageUrls).catch(() => {});` 추가(트랜잭션 밖 — Storage I/O 금지 준수).
- import: Task 5에서 추가한 `removeReviewImagesByUrl` 재사용.
**Must NOT do**: `$transaction` 안에서 Storage 삭제 금지. 소유 검증 로직(`userId_productId` where) 변경 금지 — 본인 행만 삭제. 404 분기(`:221-226`) 유지.
**QA Scenarios**:
- Happy(이미지 있는 본인 리뷰): delete + recompute + `removeReviewImagesByUrl([url1,url2])` 호출 → 200.
- Edge(이미지 없는 리뷰): `imageUrls:[]` → `removeReviewImagesByUrl([])` no-op → 200.
- Negative(타인/없음): `existing` null → 404, Storage 삭제 미호출.

### Task 7. GET imageUrls 노출 `category:quick`
**Goal**: `route.ts` GET의 select와 reviews map에 `imageUrls` 추가.
**References**:
- `route.ts:23-32` — `findMany` select에 `imageUrls: true,` 추가(`comment: true`(:28) 다음).
- `route.ts:41-50` — `rows.map`에 `imageUrls: r.imageUrls,` 추가(`comment: r.comment`(:47) 다음). `Review` 타입(Task 2)과 정합.
**Must NOT do**: orderBy·where·`user` join·Product aggregate(`:35-38`) 변경 금지. 응답 구조(`ReviewListResponse`) 변경 금지.
**QA Scenarios**:
- Happy: 이미지 2장 리뷰 → GET 응답 `reviews[0].imageUrls.length===2`.
- Edge: 이미지 없는 리뷰 → `imageUrls:[]`.

### Task 8. ReviewSection FormData + 파일 input + 썸네일 `category:visual-engineering`
**Goal**: `components/product/ReviewSection.tsx`를 (a) `handleSubmit` JSON→FormData 전송, (b) 파일 input(0~3장, 클라 사전검증, "N장 선택됨"), (c) 목록에 이미지 썸네일 렌더(next/image)로 확장.
**References**:
- `ReviewSection.tsx:77-81` — JSON fetch → FormData: `const fd = new FormData(); fd.append("rating", String(myRating)); if (myComment) fd.append("comment", myComment); files.forEach(f => fd.append("images", f)); fetch(url, { method:"POST", body: fd })`. **`headers` 제거**(브라우저가 multipart boundary 자동 설정 — Content-Type 수동 지정 금지).
- 파일 state: `const [files, setFiles] = useState<File[]>([]);` + `onFileChange`(클라 사전검증: 개수≤3·5MB·jpg/png/webp). 선례 `WhatToWearClient.tsx:264-282`(상수 `MAX_IMAGES=3`/`ALLOWED`/`MAX_SIZE` 로컬 선언) + input(`:333-342`, `accept="image/jpeg,image/png,image/webp" multiple`, "N장 선택됨").
- 폼(`:194-211` 코멘트 블록 아래)에 파일 input 추가(라벨 "사진 (선택, 최대 3장)").
- 목록 렌더(`:278-283` StarRating/comment 아래)에 `review.imageUrls?.length > 0` 시 썸네일 그리드: `import Image from "next/image"`, `<Image src={url} width={80} height={80} alt="리뷰 이미지" className="rounded-lg object-cover" />` (고정 width/height — next.config remotePatterns 이미 등록).
- 제출 성공 후 `setFiles([])` + `loadReviews()` 재fetch(`:102`).
**Must NOT do**:
  - **objectURL 미리보기 금지**(OUT — 카운트 "N장 선택됨"만).
  - 이미지 편집/크롭/드래그 정렬 금지(OUT).
  - 수동 `Content-Type` 헤더 금지(multipart boundary 파손).
  - StarRating(`StarRating.tsx`) 수정 금지.
  - 별점 미선택 가드(`:70-73`) 유지 — 이미지는 선택이나 별점은 필수.
**QA Scenarios**:
- Happy(이미지 0장): 별점만 선택 → 제출 → FormData에 images 없음 → 정상.
- Happy(2장 선택): "2장 선택됨" 표시 → 제출 → FormData에 images 2개 append.
- Edge(4장 선택): `onFileChange`에서 "사진은 최대 3장" 에러 → files 미설정.
- Edge(6MB): "각 사진은 5MB 이하" 에러.
- Happy(렌더): `imageUrls` 있는 리뷰 → 썸네일 `next/image` 렌더(alt="리뷰 이미지").
- Negative(비로그인): 폼 미노출(`:162` isLoggedIn 분기) 유지.

### Task 9. route.test.ts multipart 전환 + 신규 케이스 `category:ultrabrain`
**Goal**: `app/api/products/[id]/reviews/route.test.ts`를 multipart 기반으로 전환. storage/admin mock 추가. 이미지·admin·차집합·보상 케이스 추가.
**References**:
- `route.test.ts:51-77` — mock 블록. 추가: `vi.mock("@/lib/supabase-storage", () => ({ uploadReviewImage: uploadMock, removeReviewImagesByUrl: removeMock }))`, `vi.mock("@/lib/admin", () => ({ isAdmin: isAdminMock }))`. `vi.hoisted`에 `uploadMock`/`removeMock`/`isAdminMock` 추가. prisma mock에 `review.findUnique`(이미 있음 `:61`) 재사용 + `select:{imageUrls:true}` 응답.
- `route.test.ts:87-96` — JSON `makeRequest` → **multipart fake req 헬퍼**(OOTD `:32-39` 선례): `function postReq(fields, files: File[]) { const fd = new FormData(); fd.append("rating", ...); ...; files.forEach(f=>fd.append("images",f)); return { url, formData: async () => fd } as unknown as NextRequest; }`.
- **magic-byte fixture**(⚠️ OOTD all-zero `Uint8Array`는 sniff 실패 → 실제 시그니처 필수): `function jpgFile(){ return new File([new Uint8Array([0xFF,0xD8,0xFF,0xE0,...])], "a.jpg", {type:"image/jpeg"}) }`, png(`89 50 4E 47 0D 0A 1A 0A`), webp(`52 49 46 46 .. .. .. .. 57 45 42 50`). `vi.mock("@/lib/image-validation")`는 **하지 않음**(실제 sniff 검증) — 단 `uploadReviewImage`/`removeReviewImagesByUrl`만 mock.
- 기존 케이스 ②~⑪(`:128-252`, DELETE `:261-294`) — multipart 헬퍼로 변환(rating/comment를 fields로).
- **신규 케이스**: (a) 이미지 0장 → 201 `imageUrls:[]`; (b) 3장 정상 → 201, upload 3회; (c) 4장 → 400; (d) per-file 5MB 초과 → 400; (e) magic-byte 위조(바이트 `00 00 00`) → 400; (f) admin 미구매 → 201(isAdminMock true); (g) 일반 유저 미구매 → 403; (h) 수정 차집합 → `removeReviewImagesByUrl(기존)` 호출; (i) DB 실패(`transactionMock` reject) → `removeReviewImagesByUrl(uploaded)` 보상 호출 + 500; (j) DELETE 이미지 있는 리뷰 → `removeReviewImagesByUrl` 호출 + 200.
**Must NOT do**: 실 multipart round-trip 시도 금지(jsdom 불안정 — fake req `formData()`). magic-byte fixture를 all-zero로 만들기 금지(sniff 실패). `vi.mock("@/lib/image-validation")` mock 금지(실제 검증 보존).
**QA Scenarios**:
- Happy: `npm run test` → 기존 + 신규 전 케이스 green.
- Negative: fixture 바이트가 시그니처 불일치면 (e) 케이스에서 400 단언 — 의도된 위조 검증.

### Task 10. ReviewSection.test.tsx FormData 단언 전환 `category:writing`
**Goal**: `components/product/ReviewSection.test.tsx`에서 깨질 JSON body 단언을 FormData로 전환 + 이미지 UI 케이스 추가.
**References**:
- `ReviewSection.test.tsx:213-222` — 케이스 ④ POST 단언 `body: JSON.stringify({rating:4,comment:"테스트 코멘트"})` + `headers:{...}` → `expect.objectContaining({ method:"POST", body: expect.any(FormData) })`(headers 단언 제거 — multipart는 헤더 수동지정 안 함). **이 갱신 누락 시 green build 실패.**
- `:165-223` 케이스 ④ — FormData 제출 흐름 유지(별점·코멘트 입력 그대로).
- 신규 케이스(선택, 1개): 파일 input에 File 2개 change → "2장 선택됨" 텍스트 렌더 확인. `next/image` mock 필요 시 `vi.mock("next/image", () => ({ default: (p:any)=> <img {...p}/> }))`.
**Must NOT do**: 케이스 ①②③⑤(`:105-162`, `:226-262`) 로직 변경 금지(이미지 무관). `useSession`/`fetch` mock 구조(`:96-100`) 변경 금지.
**QA Scenarios**:
- Happy: `npm run test` → 케이스 ④ FormData 단언 통과, ①②③⑤ 회귀 없음.
- Edge: 이미지 2개 선택 → "2장 선택됨" 렌더(추가 케이스 시).

### Task 11. prisma generate + db push `category:quick`
**Goal**: schema 확정 후 Prisma 클라이언트 재생성 + dev DB에 `imageUrls` 컬럼 반영.
**References**: `CLAUDE.md` Commands — `npx prisma generate`, `npx prisma db push`(dev/CI 전용).
**Must NOT do**: 프로덕션 DB 대상 실행 금지(dev only). migration 파일 생성(`prisma migrate`) 금지 — 프로젝트는 `db push` 정책.
**QA Scenarios**:
- Happy: `npx prisma db push` → `Review.imageUrls` 컬럼 추가 성공, 기존 데이터 보존(`@default([])` 비파괴).
- Negative: 기존 Review 행의 다른 컬럼 손실 없음(additive only).

---

## Final Verification Wave

- [x] F1. `npx tsc --noEmit` → ✅ exit 0
- [x] F2. `npm run lint` → ✅ 0 errors, 0 신규 경고(잔존 3 전부 기존)
- [x] F3. `npm run test` → ✅ 155 passed/6 skipped. route.test 25(이미지 0/3/4장·5MB·magic-byte위조·admin미구매201·일반유저미구매403·차집합·보상·DELETE정리), ReviewSection.test 6.
- [x] F4. `npm run build` → ✅ exit 0, 39 pages, multipart·next/image 정상
- [x] F5. 게이트 분기: 단위테스트 (f)admin미구매→201·(g)일반유저미구매→403로 검증(by-test). 실통합은 F8 버킷 후.
- [x] F6. Storage 정합: 단위테스트 (h)차집합·(i)DB실패 보상·(j)DELETE 정리로 검증(by-test, storage mock). 실파일 검증은 F8 버킷 후.
- [x] F7. **Tier2 다중 적대검증** ✅: validator VALID/APPROVED(100/100, critical 0, admin route·lib/products 회귀 0). oracle "Ship it"(CRITICAL/HIGH 0) + L1 강화(contentType sniffed 파생) 반영.
- [ ] F8. ⚠️ `review-images` public 버킷 실생성 — **사용자 운영 선결**(Supabase 콘솔, product-images 동형). 미생성 시 실업로드 500(코드/테스트는 mock이라 무관).
- [ ] F9. commit + PR(squash) — 진행 중.

---

## Test Strategy
- **방식**: tests-after(기존 리뷰 트랙 패턴 답습 — 라우트/컴포넌트 변경 후 동일 PR 내 테스트 갱신·추가). 프레임워크: **Vitest + @testing-library/react + jsdom**.
- **route.test.ts**: multipart fake req(`formData: async()=>fd`) + 실제 magic-byte fixture(시그니처 바이트) + `vi.mock` storage(upload/remove)·admin(isAdmin). image-validation은 **실제 검증**(mock 금지).
- **ReviewSection.test.tsx**: FormData body 단언(`expect.any(FormData)`) + next/image mock(필요 시).
- **모든 새 동작에 검증 케이스**: 0/3/4장·5MB·위조·admin·게이트·차집합·보상·DELETE 정리.

## Success Criteria
- [ ] 구매자/admin이 리뷰에 이미지 0~3장 첨부 작성·수정·삭제·조회 가능(F5·F6 통과).
- [ ] 이미지 수정 시 **차집합만** Storage 정리(미변경 보존), 삭제 시 전량 정리, 업로드 후 DB 실패 시 보상 삭제(F3·F6).
- [ ] admin 미구매 작성 201 / 일반 유저 미구매 403(게이트 정확, F3·F5).
- [ ] 4장·5MB초과·magic-byte위조 모두 400(F3).
- [ ] `tsc`·`lint`·`test`·`build` 전부 green(F1~F4).
- [ ] Tier2 다중 적대검증(validator+oracle) 통과 — 권한 게이트·파일 업로드 보안 무결(F7).
- [ ] main 리뷰 제출 회귀 없음(단일 atomic PR — UI/API/테스트 동시 머지, F4).
```
