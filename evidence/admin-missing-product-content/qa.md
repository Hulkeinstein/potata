# 독립 실행 QA — 상품 정보 누락 관리

2026-10-20. 읽기 전용 독립 검증. source freeze 뒤 실제 localhost HTTP 및 로컬 PostgreSQL의 실제 domain 함수를 실행했다. 기존 상품 쓰기·fixture 생성·외부 Storage 호출·브라우저 조작은 하지 않았다.

## 직접 실행 결과

29건 PASS: HTTP3건 + 실제 DB/공통 함수26건. 차단 사항 없음.

| 우선순위 | 시나리오 | 실제 결과 |
|---|---|---|
| P0 | 비인증 catalog missing-any GET | 401, generic Unauthorized |
| P0 | 비인증 catalog missing-image GET | 401, generic Unauthorized |
| P0 | 비인증 products missing-ko 페이지 | 307, login callback으로 이동 |
| P0 | 기존 데이터 건수·지문 | 상품9/옵션40, 작업 전 SHA 일치 |
| P0 | quality all | total/items9 |
| P0 | missing-any OR 및 중복 제거 | total/items9, 고유 ID9 |
| P0 | missing-ko | total/items9 |
| P0 | missing-en | total/items9 |
| P0 | missing-image | total/items0 |
| P0 | 누락+active | 실제 옵션 상태의 JS 독립 대조와 ID/count 일치 |
| P0 | 누락+inactive | 실제 상품 상태 대조와 ID/count 일치 |
| P0 | 누락+sold-out | 실제 구매 가능 옵션 대조와 ID/count 일치 |
| P1 | 브랜드 exact AND | Nike 조건의 실제 상품 수·필드 일치 |
| P1 | 카테고리 AND | Top 조건의 실제 상품 수 일치 |
| P1 | 브랜드+카테고리 빈 조합 | Nike/Top 결과0 |
| P1 | 검색 AND | Air Force 검색 결과1 |
| P1 | 가격 오름차순 | 실제 가격 및 ID tie-break 순서 일치 |
| P0 | pagination 전 누락 필터 | page2/pageSize2가 전체 정렬 결과의 slice2..4와 일치, total9 유지 |
| P1 | 잘못된 quality | all 기본값 |
| P0 | URL serializer·안전 복귀 | quality/brand/page 보존 |
| P0 | 외부 returnTo | /admin/products로 제한 |
| P0 | 미조회 facts | 누락 경고 없음 |
| P0 | Unicode whitespace·null | KO/EN/image 누락3개 정확 |
| P0 | 옛 설명 fallback | 원본 KO/EN 누락은 그대로2개 |
| P0 | 활성 상품 설명 warning | 상품당1건/impact1, 현재8건 |
| P0 | 비활성 상품 정책 | INACTIVE_PRODUCT info 유지, 내용 누락 warning 없음 |
| P0 | 운영 이슈 중복 | kind+target 고유 |
| P0 | 등록된 URL 검사 경계 | 실제 URL 접속 여부와 무관하게 MISSING_PRODUCT_IMAGE0 |
| P0 | 운영 facts imageUrl:null | 기존 unknown 의미 유지, 가짜 경고 없음 |

실제 DB 로드 전 `DATABASE_URL`이 localhost/127.0.0.1의 `/potata_dev`인지 확인했다. 비밀값은 출력하지 않았다. DB 함수는 기존 `listAdminProducts`, `parseAdminCatalogQuery`, `listOperationsIssues`, `classifyOperationsIssues`, 공통 `getProductContentGaps`를 직접 실행했다.

데이터 지문: `78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689`.

## 부모가 별도로 실행한 브라우저 증거

아래는 본 독립 QA 에이전트의 직접 실행이 아니라 부모 CUA 실행 결과다. 부모가 최종 검증 문서에서 완료 여부를 확정한다.

- 기존 데이터 KO누락9/사진누락0, 운영 이슈 설명warning8+비활성info1, 기존 운영 이슈→누락 모아보기 링크.
- 별도 비활성 테스트 상품에서 빈 사진 편집기/placeholder 확인.
- 기존 상품 PATCH UI로 한·영 설명 저장 후 KO누락0, 사진누락1을 분리 확인.
- stock5·legacy 설명·빈 사진 원문 보존, 테스트 상품 정리, 기존9/40 지문 동일.
- 모바일390 가로 overflow 없음. 실제 스크린샷은 같은 evidence 폴더에 기록됨.

## 제한과 정리

- 독립 QA의 브라우저/데스크톱 시각 검증은 실행하지 않았다. 부모가 사용자 브라우저를 단독 소유해 확인한다.
- 외부 Storage 실제 업로드는 이번 작업에서 실행하지 않았다. 사진 누락 repair의 route/DB 동작은 별도 회귀 및 integration 증거로 구분한다.
- 전체 테스트921PASS/21guardedSKIP 및 타입·린트는 부모 실행 보고이며 본 독립 QA에서 재실행하지 않았다. 최종 production build/desktop 결과는 부모 확인 대상이다.
- 테스트 프로세스·fixture·임시 소스 없음. 직접 변경은 이 문서뿐이며 commit/push/배포 없음.

## 판정

직접 검증한 HTTP/DB/공통 규칙 범위 PASS. 전체 UI/빌드 최종 판정은 부모 증거와 합산한다. 계획에 명시된 누락 선택 시 후보 수 비례 O(N) 읽기 한계는 그대로이며 N+1이나 기본 all의 추가 scan은 없다.
