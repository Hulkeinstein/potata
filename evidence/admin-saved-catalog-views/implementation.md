# 관리자 저장한 보기 구현 증거

2026-10-20. 구현 담당은 source/tests만 소유하며 부모가 실제 인증 브라우저·전체 회귀·빌드·최종 검토를 통합한다.

## 구현 계약

- 기존 parseAdminCatalogQuery/catalogQueryParams만 재사용해 q/brand/category/status/quality/sort/pageSize를 저장한다. 저장과 불러오기 모두 page1이며 URL목표는 항상 /admin/products다.
- 기존 page 관리자 세션 ID를 optional storageScope로 전달한다. 계정별 localStorage key, scope없으면 기능비활성, 계정 전환 시 입력/선택/확인 상태도 key remount된다. 브라우저 전용·기기간 미동기화 안내를 명시했다.
- strict version1 JSON, 최대20개·raw100KB·query4096·id80·이름trim1~40, control문자 및 NFKC/소문자 중복이름 거부. 외부URL/unknown query/중복query 거부. 손상/unknownversion/read실패는 원본을 덮어쓰지 않는다.
- save/delete 직전 fresh read, write 성공 뒤만 목록·성공 안내 갱신. storage 이벤트 및 같은 탭 change 이벤트로 snapshot 갱신한다. 동시 탭 원자성이나 기기간 동기화는 주장하지 않는다.
- 삭제 확인/취소/Escape·focus순환/복원, bulk실행중 actions disabled. URL 전환은 기존 bulk scope 초기화를 재사용한다. 필터 입력폼과 nested form 없음.
- DB/API/schema/migration/dependencies/상품/옵션/재고 쓰기 없음. 기존 ADR/roadmap/임시파일 보존. commit/push/deploy 미실행.

## TDD / 자동 검증

- RED: 신규 계약/UI module이 아직 없는 두 suite의 import 해석 실패를 먼저 확인했다. 이후 기존 catalog 연결 테스트에서 저장한 보기 UI가 없는 실제 기능 실패1개와 기존8개PASS를 확인했다.
- GREEN: focused5files/44tests PASS. 기존 상품목록, bulk, quality 테스트를 포함한다.
- SSR storage read0, corrupt/read/writefail, quota nofalse success, account scope전환, storage event, 이름/수/길이상한, URLpage reset, 삭제취소/Escape/focus를 검증했다.
- TypeScript tsc --noEmit PASS. 변경파일 ESLint0errors/0warnings. diff-check PASS(CRLF 안내만).
- sandbox temp rename EPERM으로 실행되지 않은 동일 테스트는 승인권한 재실행으로 PASS했으며 테스트설정/품질기준을 낮추지 않았다.
- LSP diagnostics 도구가 현재 tool inventory에 없어 TypeScript compiler로 대체했다.

## 실제 실행 채널과 정리

- 별도 Node public storage adapter driver에서 save→page reset→read→delete를 실제 호출해 PASS. 저장소는 일회성 메모리Map이며 브라우저/DB/파일에 QA 값을 남기지 않았다.
- 실제 인증 IAB 저장/불러오기/reload/삭제와 desktop/mobile 시각 QA는 부모 담당이다. 이 문서에서 선행 PASS를 주장하지 않는다.
- source pureLOC: saved-view domain54, hook32, saved-view UI49, 삭제dialog23, 기존 catalog167, page17. 책임별 구분하고 각250미만이다. untrusted JSON은 경계에서 unknown으로 받아 typed view로 변환하며 any/assertion/오류삼킴을 추가하지 않았다.
- 임시 프로세스/driver 파일/DB fixture 없음. 원래 dev server 종료나 build는 하지 않았다.
