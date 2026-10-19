# 브랜드 발견 카드 검증

2026-10-19. 기존 Reels형 몰입 보기의 연속 스크롤 안에만 브랜드 카드를 추가했다. 일반 격자는 기존 상품 목록을 유지한다.

## 기존 데이터·기능 재사용

- Prisma에는 Brand 모델/brandId가 없고 Product.brand 문자열만 있다. getAllProducts는 활성 상품만 제공한다.
- BrandsContent의 mock 에디토리얼은 재사용하지 않았다. 정확한 상품 brand 문자열(앞뒤공백 제거)로 그룹화하여 실상품 2개 이상/검색명 길이 2–100인 브랜드만 후보로 삼는다.
- 대표 상품은 현재 카테고리의 첫 2–3개다. 모바일 2개, 넓은 화면 최대 3개. 없는 로고·브랜드 소개·개인화·선정·광고 주장을 만들지 않았다.
- 기존 `/search?q=...`는 상품명/브랜드/카테고리 부분검색이다. CTA도 '브랜드 이름으로 검색'으로 표시하며 exact 브랜드 전용 페이지라고 주장하지 않는다.
- 상품 순서는 그대로이며 6개 상품 뒤에 카드 하나, 뒤에 실제 상품이 남을 때만 삽입한다. 한 브랜드는 피드에서 한 번만 나온다.
- 관심 없음은 이 탭의 sessionStorage에 브랜드명만 저장하며 카드만 숨긴다. 상품/찜/계정/서버 데이터는 바꾸지 않는다.
- product/brand discriminated union, 안정된 feedId, 별도 마지막 productId 및 사진 map을 사용한다. 브랜드를 가짜 Product로 만들지 않았다.

## RED → GREEN

- 새 도메인 모듈 부재의 import 오류는 동작 RED로 인정하지 않았다.
- 상품 전용 초기 builder에서 3개 실제 assertion RED: 여섯 상품 뒤 product 대신 brand 기대, 브랜드 개수 1 기대, 대표 상품 ID 기대.
- UI 4개 RED: Next item/브랜드 heading/관심 없음/저장된 브랜드 복원이 없음을 확인했다.
- 구현 후 focused 최신 46 tests PASS (기존 피드 포함). 새 grid focus가 오래된 brand feedId를 대체하는 회귀, 사라진 브랜드의 canonical 복원도 포함한다.

## 자동·실제 검증 진행

- focused 46 tests PASS, 최종 전체 133 files / 788 tests PASS, 6 files / 14 guarded skip.
- TypeScript/대상 lint PASS. 전체 lint 오류 0·기존 경고 3. production build 62 routes exit 0, DB 오류 없음. `git diff --check` PASS.
- 독립 UI QA는 실제 DB 9상품에서 `1..6 → brand:AMOU → 7..9 → end`와 대표 제품 3/5, 가격 AED179/95를 확인했다. 최종 QA 기록은 qa.md에 분리한다.
- native 중간 드래그에서 브랜드 top -455.2/다음 제품 top 388.8, 놓은 후 제품7에 snap 및 역방향 브랜드 복원 확인.
- 검토에서 grid focus의 오래된 brand feedId 보존과 관심 없음 후 다음 브랜드로 슬롯을 채우는 문제를 발견했다. 첫 문제는 productId/feedId를 함께 갱신하여 수정했다. 두 번째는 슬롯 후보를 먼저 고정하고 숨긴 후보 슬롯 자체를 건너뛰어 다른 브랜드를 대신 넣지 않도록 수정했다.
- 숨김 후 실제 UI 재검증: 브랜드 0개 / 9상품과 종료, 현재 상품7, 새로고침 후에도 동일. 상품6→브랜드→상품7의 순서는 숨김 전 유지된다.
- 중간 수정과 전체 검증이 겹친 실행에서 옛 builder와 새 회귀 assertion 2개가 섞여 실패했으며 파일 편집 중 parsing error도 관찰했다. 이를 최종 결과로 사용하지 않고 소스 동결 후 전체를 재실행했다.

## 경계·한계

새 DB/API/admin/추천엔진/추적/analytics/패키지/운영 변경/commit/push/배포 없음. 기존 미커밋 파일과 dirty ADR를 보존했다. 실제 iPhone Safari/Android 기기 및 live 다중사진 native 축 분리는 이전과 동일하게 미검증. 사용자 개발 서버는 최종 검증 후 유지하며 별도 QA contexts만 정리한다.

## 최종 판정과 정리

Goal/Context PASS, Code/Security PASS(발견된 anchor·숨김 대체 문제 수정 후 재검토), 독립 실제 QA PASS. 부모가 모바일 스크린샷의 썸네일·상품명·CTA도 직접 확인했다.

빌드 동안 기존 devserver86490을 Ctrl+C로 종료했고 최종 devserver14483을 localhost:3000에 Ready 상태로 재실행했다. 별도 QA contexts만 종료하고 사용자 탭/서버를 유지한다. 각 코드 파일은 250 pure LOC 미만(최대 ImmersiveFeed 123)이며 LSP 도구가 제공되지 않아 TypeScript로 대체 검증했다.
