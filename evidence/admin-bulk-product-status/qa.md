# 상품 일괄 상태 관리 — 독립 QA

2026-10-20. 판정: **PASS**. 이 문서는 독립 실행 결과와 부모가 전달한 실제 화면/DB 결과를 구분한다.

## 검증 경계

- 공유 IAB, 기존 상품 데이터, 부모 소유 `qa-bulk-browser-20261020-a/b`를 조작하지 않았다.
- 서버 종료·재시작·build·migration·DB mutation·외부 서비스 호출·commit/push 없음.
- 시나리오를 API 권한/입력, 원자적 상태 writer, 선택/확인 UX, 기존 기능 회귀로 분류했다. 실행 중 source의 success-warning 보존 수정이 반영된 최종 테스트를 확인했다.

## 실제 실행

1. 비로그인 HTTP PATCH `http://localhost:3000/api/admin/catalog/status`, JSON `{ids:["never-mutated"],isActive:false}`.
   - 실제 응답: **401**, `{"success":false,"error":"Unauthorized"}`. 세션을 전달하지 않았고 writer 전 차단됨.
   - 초기 sandbox socket 권한 거부는 같은 요청을 승인된 실행 권한으로 재실행해 해결했다. 보안 경계를 우회하지 않았다.
2. 다음 focused 실행: **7 files / 46 tests PASS**, exit 0, duration 14.14s.

```text
npx vitest run lib/admin-product-status-input.test.ts lib/admin-product-status.test.ts app/api/admin/catalog/status/route.test.ts components/admin/AdminProductCatalogClient.bulk.test.tsx components/admin/AdminProductCatalogClient.test.tsx lib/admin-product-catalog.read.test.ts app/api/admin/catalog/[id]/status/route.test.ts --maxWorkers=1
```

초기 sandbox 실행은 임시 transform 파일 rename EPERM으로 7 suites/0 tests였다. 동일 명령을 승인된 권한으로 다시 실행하여 위 46개 테스트를 실제 실행했다. 테스트/설정을 완화하거나 skip하지 않았다.

## 시나리오 결과

별도 표시가 없으면 위 focused 실행의 관찰 결과다. route/domain 단위 테스트는 해당 seam의 mock을 사용하므로 실제 PostgreSQL이나 인증 브라우저 결과로 표현하지 않는다.

| # | 우선순위 | 시나리오와 기대 결과 | 결과 / 채널 |
|---|---|---|---|
| 1 | P0 | 비로그인 bulk 요청은 writer 전에 401 | PASS: 실제 HTTP + route test |
| 2 | P0 | 로그인 비관리자는 403, write 0 | PASS: route test |
| 3 | P0 | 1개 명시적 ID 허용 | PASS: parser test |
| 4 | P0 | 50개 명시적 ID 허용 | PASS: parser test |
| 5 | P0 | 빈 목록 거부 | PASS: parser test |
| 6 | P0 | 51개 거부 | PASS: parser test |
| 7 | P0 | 중복 ID 거부 | PASS: parser test |
| 8 | P0 | 빈 ID/앞 공백 ID 거부 | PASS: parser test |
| 9 | P0 | 숫자 ID 거부 | PASS: parser test |
| 10 | P0 | 문자열 boolean 거부 | PASS: parser test |
| 11 | P0 | stock 등 추가 필드 거부 | PASS: parser + route test |
| 12 | P0 | 201자 ID 거부 | PASS: parser test |
| 13 | P0 | null/누락 키 등 잘못된 구조 거부 | PASS: parser test |
| 14 | P0 | malformed JSON은 400 | PASS: route test |
| 15 | P0 | 100KB 초과 실제 body는 413 | PASS: route test |
| 16 | P0 | 상태 전용 writer는 data.isActive만 전달 | PASS: domain test |
| 17 | P0 | 대상 count 불일치 시 transaction 내부 throw 후 실패 반환 | PASS: domain test; 실제 rollback은 부모 별도 integration |
| 18 | P0 | DB 오류는 전파되고 API 내부 connection 내용 비노출 | PASS: domain + route test |
| 19 | P0 | commit 후 cache 실패는 저장 성공+warning | PASS: route test |
| 20 | P0 | 확인창 열기 전 write 0, 취소 write 0 | PASS: component test |
| 21 | P0 | 선택 ID와 목표 boolean만 한 번 전송 | PASS: component test |
| 22 | P0 | 실행 중 중복 클릭 write 1회, 개별/선택 제어 disabled | PASS: component test |
| 23 | P0 | 네트워크 실패 시 선택 유지 및 결과 불명/새로고침 안내 | PASS: component test |
| 24 | P1 | query/표시 상태 snapshot 변경 시 선택·확인 초기화 | PASS: component test |
| 25 | P1 | Escape no-write, focus loop·opener 복귀 | PASS: component test |
| 26 | P1 | 빈 목록 bulk 제어 disabled | PASS: component test |
| 27 | P1 | 성공 후 실제 상품 상태로 rerender해도 처리 수·cache warning 유지 | PASS: 새 회귀 component test |
| 28 | P1 | 기존 개별 상태 API와 boolean/notfound 계약 유지 | PASS: singleton route/domain tests |
| 29 | P1 | 기존 필터·편집 returnTo·서버 갱신 데이터 사용 유지 | PASS: 기존 catalog component/read tests |
| 30 | P1 | 임의 pageSize가 적용값으로 정확히 표시 | PASS: 기존 catalog component test |

## 부모의 별도 실제 QA 결과

부모가 전달한 결과이며 이 독립 에이전트가 해당 브라우저/DB 작업을 재실행한 것은 아니다:

- 인증된 IAB에서 기존 상품 전체 선택9 → 확인 → Escape/취소/해제 확인. 원본 상품 상태 write 없음.
- 로컬 disposable 2상품으로 실제 중지·재노출, 재노출 후에도 S 재고0/M 재고5+수동품절 유지.
- 모바일390×844 가로 overflow 없음, focus loop/취소 확인.
- fixture 정리 후 원본9상품/40옵션 SHA256 `78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689` 동일.
- 실제 PostgreSQL integration4 PASS. 전체161files/953tests PASS, guarded skips25. 빌드는 부모가 최종 실행 중이었다.

## 제한 / 정리

비관리자 403·관리자 입력 오류·cache 실패는 route tests로 검증했고, 실제 비관리자 브라우저/실제 cache 장애를 만들지 않았다. physical Safari/Android 검증 없음. 독립 QA가 생성한 DB fixture·파일 업로드·브라우저·서버 프로세스 없음. 본 artifact 외 source 수정 없음. 최종 build 결과와 UI screenshot은 부모 `verification.md`에서 확인한다.
