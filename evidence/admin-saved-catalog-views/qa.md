# 저장한 보기 독립 QA

2026-10-20. 판정: PASS. source/DB/공유 브라우저/서버는 변경하지 않았다.

## 실행 증거

- 실제 비로그인 HTTP GET `http://localhost:3000/admin/products`: 307, `Location: /login?callbackUrl=%2Fadmin%2Fproducts`.
- `npx vitest run lib/admin-catalog-saved-views.test.ts components/admin/AdminCatalogSavedViews.test.tsx components/admin/AdminProductCatalogClient.test.tsx components/admin/AdminProductCatalogClient.quality.test.tsx components/admin/AdminProductCatalogClient.bulk.test.tsx`: **5 files / 44 tests PASS**, exit0.
- 최초 sandbox 집중 실행은 임시 캐시 파일 rename EPERM 때문에 5개 suite 모두 0 tests였다. 같은 명령을 승인 권한으로 실행하여 실제 44 tests를 통과했다. 테스트 실패를 무시하거나 테스트 설정을 바꾸지 않았다.
- 최초 sandbox HTTP는 socket 권한 거부였고 동일 요청의 승인 권한 실행으로 307을 확인했다. PowerShell은 리다이렉트 제한 안내도 출력했으나 응답 상태와 Location은 위와 같다.

## 시나리오와 결과

아래 `집중 테스트`는 이번 QA가 실제 실행한 Vitest의 관찰 결과다. 브라우저에서 직접 실행한 것으로 간주하지 않는다.

| 번호 | 우선순위 | 시나리오 / 기대 결과 | 검증 채널 | 결과 |
|---|---|---|---|---|
| 1 | P0 | 비로그인 관리 목록은 로그인으로 리다이렉트 | 실제 HTTP | PASS |
| 2 | P0 | 기존 필터를 canonicalize하고 page를 제거해 첫 페이지 사용 | 집중 테스트 | PASS |
| 3 | P0 | 외부 URL·비허용 key·중복 query key 거부 | 집중 테스트 | PASS |
| 4 | P1 | query 4096자 초과 거부 | 집중 테스트 | PASS |
| 5 | P0 | version1 정상 목록 읽기 | 집중 테스트 | PASS |
| 6 | P0 | malformed JSON·unknown version·unknown entry field 거부 | 집중 테스트 | PASS |
| 7 | P0 | 중복 ID가 있는 저장 목록 거부 | 집중 테스트 | PASS |
| 8 | P1 | raw 저장 데이터 상한 초과 거부 | 집중 테스트 | PASS |
| 9 | P1 | NFKC/대소문자 정규화 이름 중복 거부 | 집중 테스트 | PASS |
| 10 | P1 | 20개 이후 추가 저장 거부 | 집중 테스트 | PASS |
| 11 | P1 | 빈·공백·41자·중간/끝 개행 이름 거부 | 집중 테스트 | PASS |
| 12 | P1 | 정확히 40자 이름 허용 | 집중 테스트 | PASS |
| 13 | P0 | 저장/삭제 직전 persisted 목록을 읽고 다른 최신 항목 보존 | 집중 테스트 | PASS |
| 14 | P0 | 손상된 원본 자동 초기화·덮어쓰기 금지 | 집중 테스트 | PASS |
| 15 | P0 | read/write 예외는 실패 반환, false success 없음 | 집중 테스트 | PASS |
| 16 | P0 | 적용된 조건 저장 후 remount해도 목록 유지·내부 URL 불러오기 | 집중 테스트 | PASS |
| 17 | P0 | 삭제 취소는 원본 유지, 확정은 해당 보기만 제거 | 집중 테스트 | PASS |
| 18 | P0 | quota 쓰기 실패 시 성공 안내 없이 오류 표시 | 집중 테스트 | PASS |
| 19 | P1 | storage 이벤트 반영·다른 계정 scope 분리 | 집중 테스트 | PASS |
| 20 | P0 | scope 없음/일괄 작업 busy에서 저장 비활성화 | 집중 테스트 | PASS |
| 21 | P0 | SSR snapshot은 localStorage를 읽지 않고 안정적으로 렌더 | 집중 테스트 | PASS |
| 22 | P0 | 손상/차단된 storage는 렌더 중단 없이 오류·쓰기 차단 | 집중 테스트 | PASS |
| 23 | P1 | 삭제 Escape는 요청 없이 닫히고 opener focus 복원 | 집중 테스트 | PASS |
| 24 | P0 | 계정 변경 시 이전 계정 보기/열린 삭제 창 비노출 | 집중 테스트 | PASS |
| 25 | P0 | 기존 catalog 개별 상태·quality·bulk 확인/취소/결과 안내 회귀 유지 | 집중 테스트 | PASS |

실행한 시나리오 묶음 25개 모두 PASS. 실제 assertion 수는 44 tests다.

## 부모의 실제 브라우저 증거 — 독립 실행과 구분

부모가 별도로 실제 인증 IAB에서 다음을 확인했다고 보고했다: 자신의 `QA 누락 상품 보기` 저장, 미적용 검색어 제외, 동일 이름 거부, 전체 조건에서 저장 보기 불러오기, 선택9개→0 초기화, 새로고침 후 유지. 이 내용은 부모 `verification.md`/화면 증거로 확인하며 위 독립 HTTP/집중 테스트 개수에 중복 산입하지 않았다. 모바일 삭제/cleanup과 최종 전체 테스트·build·DB 지문은 부모의 최종 검증 범위다.

## 한계 / 정리

- 이번 QA는 공유 IAB를 조작하지 않았고 실제 localStorage의 사용자 값을 직접 읽거나 바꾸지 않았다. UI 테스트는 격리된 jsdom storage에서 수행했다.
- 계정 간·오류·한계값은 컴포넌트/순수 함수 테스트 채널이며 실제 여러 계정 로그인이나 브라우저 quota 발생을 주장하지 않는다.
- 같은 canonical URL을 재적용하는 경우에는 조회 범위가 변하지 않아 기존 bulk 선택이 유지될 수 있다. 다른 조건으로 전환할 때의 URL scope 초기화와 구분한다.
- 전체 회귀/build를 중복 실행하거나 dev server를 종료하지 않았다. 실행한 집중 테스트 프로세스는 exit0으로 끝났다. 별도 fixture/임시 helper/추가 프로세스 생성 없음.
- 물리 Safari/Android·서버 동기화·원자적 다중 탭 동시 쓰기는 검증 범위가 아니며, 로컬저장 한계는 UI/계획에 명시돼 있다.
