# 관리자 상품 일괄 상태 관리

## 목표 / 범위

2026-10-20 사용자 승인: 상품 여러 개 선택 → 실행 전 확인 → 판매 중지 또는 재노출. 기존 상품 목록·개별 상태 API·캐시 경계를 재사용하고 재고는 그대로 유지한다. 예상 8~14파일, 난이도 중간, 복잡도 medium. 계획 및 실행 승인됨. TDD/Vitest, 기존 Next/Prisma/npm/ESLint 유지.

## 탐색 / Metis 검토

- 기존 AdminProductCatalogClient는 개별 PATCH /api/admin/catalog/[id]/status를 사용한다. lib/admin-product-catalog.ts의 updateAdminProductStatus는 data:{isActive}만 쓴다.
- 새 전체 관리 페이지나 일반 상품 수정 경로는 만들지 않는다. 기존 상태 전용 writer를 단일/다중 입력에 공유한다. 개별 API 응답 계약 유지.
- Metis: transaction에서 update count 불일치 시 rollback해야 삭제 경합에도 부분 성공이 없다. 같은 상태도 처리 수에 포함된다. 마지막 명시적 상태 설정 우선은 기존과 동일하다.

## 확정 계약

- 현재 페이지 상품만 선택, 최대50. 전체 검색 결과 선택이나 페이지간 누적 선택 없음. '현재 페이지 전체 선택', 개별 checkbox, 선택 수, 선택 해제 제공.
- applied query/페이지 또는 렌더된 id+isActive snapshot 변경 시 선택/확인 초기화. name 변경도 확인 snapshot에 반영하도록 초기화한다. key 기반 subcomponent 등 effect 없는 기존패턴 우선.
- 확인 dialog: 선택 상품명 전부, 개수, 판매 중지/재노출 명시. '재고·가격·설명은 변경하지 않음, 재노출해도 재고0/수동품절 구매불가' 안내. 취소/Escape 쓰기0. 포커스 loop/복원, 스크롤/모바일 overflow 방어.
- 실행 중 ref lock, 체크박스/일괄/개별 상태 버튼 중복 요청 차단. 성공만 선택 해제·목록 refresh·처리N개 안내. 실패는 선택 유지, timeout/네트워크는 적용 여부 불명일 수 있으므로 목록 새로고침 후 확인 안내. 자동 재시도 없음.
- PATCH /api/admin/catalog/status: auth+isAdmin 선행, readJsonBody 상한 재사용. strict {ids:string[],isActive:boolean}, 1~50개, 중복/빈ID/과도길이/unknown key 거부. ID 최대200자, trim으로 ID를 바꾸지 않고 양끝공백 거부. 삭제상품 포함 시 전체404/rollback. 일반500 내부오류 비노출.
- 도메인 transaction updateMany where id in ids, data isActive만. count != ids.length면 throw/rollback. 단일 경로는 동일 writer 공유하며 기존 boolean/notfound 계약 유지. explicit boolean 설정으로 재요청도 toggle하지 않는다.
- 성공 commit 후 products 태그 expire0. cache 실패는 실제 DB 적용 가능성을 숨기지 않게 안전한 안내 또는 성공+refresh 경계로 명시한다. 응답은 처리 수이며 실제변경수라고 하지 않는다.
- ProductVariant/재고/수동품절/가격/설명/이미지 쓰기 금지. schema/migration/새deps/운영DB/외부Storage/commit/push/배포 제외. unrelated dirty ADR/roadmap/temp 보존.

## TODOs

- [x] 1. 상태 전용 batch 경계·writer·API + 실패 우선 테스트
  - 참조: lib/admin-product-catalog.ts, app/api/admin/catalog/[id]/status/route.ts/test, lib/request-body.ts.
  - 검증: 1/50성공, 0/51/duplicate/unknown/invalid 거부,401/403, missing rollback, DB실패, 같은값 replay, 단일API 회귀, cache호출.
  - 실제 QA: 로컬 DB disposable2상품과 옵션에 batch 중지/재노출 및 missing 포함 rollback 실행, 원래 상품/옵션 전체 지문 유지, fixture 정리.
- [x] 2. 기존 목록 선택·확인·실행 UI + 실패 우선 테스트
  - 참조: components/admin/AdminProductCatalogClient.tsx/test, 기존 dialog 패턴 rg role=dialog.
  - 검증: 전체/개별/해제/빈상태, 확인 전 fetch0, 취소0, 실행payload/lock, 실패선택유지, refresh/query/id변경 초기화, 기존개별/필터/편집/누락 기능 회귀.
  - 실제 QA: desktop/mobile 선택2→확인→취소, fixture중지→재노출, 재고와 수동품절 보존; focus/Escape/overflow.
- [x] 3. 전체 검증과 evidence/admin-bulk-product-status/verification.md 기록
  - focused/full Vitest, tsc, source ESLint, production build, diff-check; source250pureLOC이하. dev서버유지, 기존data지문/fixtures정리 명시.

## 실행 전략

1→2→3 단일 구현 담당으로 공유파일 충돌 방지. 부모는 계획·QA·검토, 구현 담당이 source/tests를 소유한다. 원래파일 증거 보존. 필요시 구현/QA 리뷰를 concurrency4슬롯 안에서 수행.

## Final Verification Wave

- [x] F1. Goal/제약 검토
- [x] F2. Code 검토
- [x] F3. Security 검토
- [x] F4. 실제 QA
- [x] F5. Git/기존 맥락 검토

완료 근거: evidence/admin-bulk-product-status/verification.md. 953tests/fullbuild63/63 및 실제 관리자 desktop/mobile fixture mutation 검증, 기존9상품/40옵션 지문 동일. 빌드 후 dev재시작/health200 확인. 기존 오류탭 최종reload는 URL정책에 막혀 사용자 직접열기 필요.

## 완료 기준

상품목록에서 명시적으로 선택한 상품만 확인 후 atomic 상태변경, 개별기능 유지, 재고 등 원본 동일, 로컬실DB/실제UI와 자동검증 증거. commit/push는 후속 승인 전 하지 않는다.
