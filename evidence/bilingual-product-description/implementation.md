# 상품 설명 한국어/영어 입력 및 표시

## 구현 범위
- `Product.descriptionKo` / `descriptionEn` nullable TEXT 추가. 기존 `description` 값은 migration에서 변경하지 않음.
- 상품 등록과 수정에 별도 한국어/영어 설명 입력. 관리자 UI는 기존 한국어 유지.
- API는 언어별 10,000자 제한 및 텍스트 타입 검사. 공백은 null, 미제공 수정 필드는 보존.
- 상품 상세는 Footer와 같은 LanguageProvider를 사용: 선택 언어 → 다른 언어 → 기존 원문 → 빈 안내.
- 다른 언어 fallback에는 실제 언어 표시, legacy는 언어 미지정 원문 표시. 자동 번역 없음.
- 상품명·브랜드·사용자 콘텐츠·옵션 데이터는 번역하지 않음.

## 자동 검증
- 최초 description 테스트는 구현 전 실패 확인.
- description helper / create API / product mapping / admin create form: 71 tests PASS.
- edit API / customer detail locale rendering: 7 tests PASS.
- admin edit form payload preservation: 1 test PASS.
- full regression: 109 files / 653 tests PASS, 5 files / 11 tests guarded skip. 이후 admin edit form 1 test 추가 및 단독 PASS.
- `npx prisma generate`: 개발 서버의 DLL 잠금 해제 후 PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: 0 errors, 기존 warnings 3.
- `npm run build`: exit 0, 62/62 pages. DB offline 캐시 재검증 오류가 로그에 있어 실제 DB 준비 완료 증거는 아님.

## 미검증 / 배포 경계
- migration 작성만 했으며 DB 적용하지 않음. 로컬 127.0.0.1:5432가 꺼져 있음.
- 새 Prisma client는 신규 열을 조회하므로 DB migration 적용 전 상품 DB 조회를 정상이라고 보장하지 않음.
- 관리자 실제 상품 생성·수정 저장 및 실제 고객 상품 상세 브라우저 QA는 DB 복구·migration 후 필요.
- 운영 DB·외부 서비스·commit·push·배포 변경 없음.
- 기존 oversized AdminProductForm은 설명 입력 책임만 공유 컴포넌트로 분리. 전체 폼/공통 types 재구성은 무관한 대규모 변경을 피하기 위해 수행하지 않음.

## 구조 점검
- 설명 선택/파싱, 설명 입력, 문구 사전은 각각 작은 단일 책임 단위.
- JSON/FormData 설명 필드는 경계에서 정규화 후 typed 결과만 저장.
- 변경된 설명 코드에는 `any` / 강제 type assertion / 타입 오류 억제 없음.
