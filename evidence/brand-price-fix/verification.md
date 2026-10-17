# 브랜드 가격 표시 회귀 검증 — 2026-10-17

## 범위와 가설

- 브랜드 상품 카드의 AED 표시만 수정. DB·환율 정책·상품 데이터 변경 없음.
- H1: Brands 전용 `price * 0.003` / `price * 0.004`가 이미 AED인 값을 다시 환산한다.
- H2: 공통 `formatPrice` 자체가 단위를 변환한다. 구현은 `AED`+숫자 포맷뿐이므로 기각.
- H3: 상위 데이터 가격이 잘못됐다. 고정 `price=719`를 실제 BrandsContent에 전달해도 `2 AED`가 렌더되므로 이번 재현 원인으로 기각.

## RED → GREEN

명령:

`node node_modules/vitest/vitest.mjs run app/brands/BrandsContent.price.test.tsx --maxWorkers=1 --no-file-parallelism`

- 수정 전 7/7 실패. 관찰된 DOM: `2 AED`, 취소선 `3` (입력 price=719, originalPrice=779).
- 원가 미지정에도 가짜 취소선 가격이 나타남.
- Windows 제한 실행이 지연되어 동일 명령을 승인된 실행 환경에서 재실행해 RED 확인.

수정:

- 저장된 AED 가격을 기존 공통 `formatPrice`에 그대로 전달.
- 실제 originalPrice가 있고 현재 가격보다 높을 때만 해당 실제 원가 표시.
- absent/0/equal/lower 원가는 취소선 미노출, 현재 0 AED는 정상 표시.
- 언어 전환은 통화 금액을 바꾸지 않음.

GREEN 명령:

`node node_modules/vitest/vitest.mjs run app/brands/BrandsContent.price.test.tsx components/ui/DiscoveryLinks.test.tsx --maxWorkers=1 --no-file-parallelism`

- 2 files, 10 tests PASS (가격 7 + 기존 탐색 링크 3).
- 신규 fixture는 메모리 내 React 렌더만 사용. DB/Storage/세션 fixture 없음.
- 부모 CUA의 실제 `/brands` EN/KO에서 Kalix 판매가 `AED 719`, 실제 원가 `AED 779` 확인. 원가 없는 Nike ACG는 `AED 685`만 표시. `brands-en.png` 스크린샷은 로컬 증거이며 커밋 제외.
- 개발 DB 엔진은 당시 연결 불가 상태였으며 페이지는 기존 상품 캐시로 렌더됐다. 실제 DB read-back 또는 DB 복구 성공으로 주장하지 않는다. 상품 데이터·세션·재고를 수정하지 않았다.
- 전체 suite/build, roadmap/commit은 부모 최종 결과를 아래에 기록한다.

## 부모 최종 검증

- `npm test -- --maxWorkers=2`: 124 files / 685 tests PASS, 5 files / 11 guarded skips, exit 0. 제한된 sandbox 실행에서 파일 수집이 정상 시작되지 않아 중단하고 같은 명령을 승인된 로컬 환경에서 다시 실행했다. 중단 실행을 성공으로 계산하지 않았다.
- `npx tsc --noEmit`: exit 0.
- `npm run lint`: 오류 0, 기존 경고 3.
- `npm run build`: exit 0, 62개 페이지. 로컬 PostgreSQL 연결 불가로 cache revalidation 경고가 발생했다. 이는 코드 빌드 성공과 별개인 개발 환경 문제이며 운영 준비 통과가 아니다.
- 읽기 전용 독립 검토: 가격 delta, additive migration, auth/legal 정책 불변, 커밋 선별 범위 확인. 로드맵의 미추적 과거 증거 링크와 이전 배포 상태 혼동을 발견해 정정했다. 동시 5명 리뷰가 아닌 기존 번역 교차 리뷰·이번 독립 검토·부모 실제 QA를 합친 검증이다.
- 이번 실행에서 DB·Storage·외부 서비스 데이터 변경과 push/deploy 없음. 기존 Docker의 단순 시작을 시도했으나 엔진 준비는 확인되지 않았고 reset/볼륨 삭제/설정 변경은 하지 않았다.

## 자체 검토

- 변경 책임: BrandsContent 카드의 가격 표시. 공통 가격/환율 정책 변경 없음.
- 기존 carousel, metadata, 링크, 번역 dirty 변경 보존.
- 새 any/assertion/helper/외부 boundary 없음.
- 근사 순수 LOC: BrandsContent 150, 회귀 test 34 (250 이하).
- 임시 logger/debugger/서비스/파일을 추가하지 않음. 이 문서는 유지할 검증 기록.
