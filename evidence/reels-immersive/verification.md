# Reels형 몰입 보기 검증

2026-10-19, 로컬 개발 환경. 운영 DB·설정·실데이터·commit·push·배포 변경 없음.

## 구현 경계

- 기존 일반 격자, ProductCard, HeartButton, 가격, 상세, 언어 Provider 재사용.
- body portal의 native modal dialog: 전체 100dvh 세로 native scroll/snap, 연속 슬라이드와 유한 종료 패널.
- 세로 touchEnd 상품 교체 코드 제거. 이미지 contain 유지, 현재·인접 상품 사진만 로드.
- 상품별 사진 map을 sessionStorage에 저장하고 일반/몰입/상세 왕복에 복원.
- LanguageSelect를 기존 Footer에서 최소 추출. Footer 전문은 동일 Footer 컴포넌트를 중첩 native dialog에서 재사용.
- 상위 dialog만 body overflow lock 소유. 하위 Footer 종료/전체 unmount 시 원래 overflow 복원.
- 공유는 현재 origin의 상품 링크 clipboard 복사만 사용. 새 외부 API/의존성 없음.

## 자동 검증

- 최초 RED 시도는 sandbox 임시파일 rename EPERM으로 본문 실행 전 실패. 이를 동작 RED로 주장하지 않음.
- 이후 가로 화살표 회귀: `Alpha — Photo 1`/기대 `Photo 2`의 실제 실패 확인 후 최소 handler 추가, GREEN.
- focused 최신: 3 files / 27 tests PASS (연속슬라이드, body lock, 중첩 unmount, 사진별 상태, empty cancel, keyboard 포함).
- full 최종: 131 files / 769 tests PASS, 6 files / 14 guarded skip (마지막 nav/사진 ResizeObserver 변경 이후 재실행).
- TypeScript와 대상 ESLint PASS. LSP 도구는 세션에 없어 대체 TypeScript 검증 적용.
- 전체 lint: 오류 0, 기존 경고 3. 최종 TypeScript/대상 lint PASS.
- production build: 최신 소스 기준 exit 0, 62 routes PASS. 기존 로컬 DB `127.0.0.1:5432` 연결 불가로 cache revalidation 경고가 발생했으나 빌드는 완료. DB 복구/재설정은 하지 않음.
- `git diff --check` PASS (기존 CRLF 변환 안내만 존재).

## 실제 UI

독립 QA는 `qa.md`와 screenshots에 기록한다. CDP mobile native touch 드래그 도중 손을 떼기 전 두 카드 위치가 함께 이동하고 다음 카드 일부가 나타남을 확인했다.

- 최종 CTA 재검증: EN/KO 390px에서 CTA bottom 716 / nav top 732, KO 320px에서 bottom 512 / top 528. 실제 측정 간격 16px으로 겹침 없음.
- 최종 native 중간 드래그: scrollTop 455.2, 다음 카드 top 388.8. 손을 떼기 전 실제 연속 두 슬라이드 노출 확인.
- QA 전용 contexts 모두 정리, 사용자 devserver 유지.
- 최종 Goal/Context 리뷰 PASS, Code 리뷰의 nested body lock finding 수정 및 독립 재검토 PASS, Security PASS, native QA PASS. 모바일 CTA 겹침도 실제 rect 재검증 후 닫음.

## 한계·정리

- Chromium 모바일 에뮬레이션은 실제 iPhone Safari 검증이 아니다. 실제 iOS/Android 기기·스크린리더 미검증.
- 실제 DB의 기존 단일 사진 상품을 변경하지 않았음. 다중 사진은 테스트 fixture 계약으로 검증.
- 인증된 찜 상태 변경이나 주문 실행은 하지 않음.
- 기존 dirty ADR·dual-view 작업·임시 파일 보존. QA 전용 context만 정리하며 사용자 devserver는 최종 재시작하여 유지.
- 최종 개발 서버 session `33188`, localhost:3000 Ready. 화면 QA는 기존 캐시 카탈로그로 진행했으며 DB 실조회 성공으로 주장하지 않음.

## 2026-10-19 추가 승인: 실제 DB 복구 후 cold-cache 재검증

앞 절의 DB 불가·캐시 카탈로그 한계는 첫 검증 시점 기록이다. 사용자가 기존 DB 복구와 실데이터 재검증 후 commit/push를 승인하여 다음 검증을 추가했다. 이 작업자는 Git commit/push를 수행하지 않는다.

### 데이터 보존 및 캐시 처리

- 별도 Docker 복구 담당이 기존 `potata-dev-postgres`와 `potata-dev-postgres-data`를 유지하여 Engine 29.7.2, pg_isready accepting, Prisma 연결 및 Product 9개를 확인했다. reset/seed/env 변경 없음.
- 기존 devserver `33188`은 Ctrl+C로 정상 종료했다.
- 정확한 두 경로를 Resolve-Path로 확인하고 `C:\Work\Potata\.next\` 경계 내부인 경우만 삭제 없이 sibling 이름 변경했다.
  - `.next/cache/fetch-cache` → `fetch-cache-preserved-reels-real-db-20261019`
  - `.next/dev/cache/fetch-cache` → `fetch-cache-preserved-reels-real-db-20261019`
- DB가 실행된 상태에서 production build를 다시 실행했다. exit 0, 62 routes, DB/cache revalidation 오류 0. 기존 middleware convention 경고는 별도이다.
- 빌드가 새로 만든 `.next/cache/fetch-cache`도 `fetch-cache-preserved-reels-postbuild-20261019`로 보존했다. `.next/dev/cache/fetch-cache`는 이때 없었다.
- 최종 devserver `86490`을 새로 실행하기 전 활성 두 캐시 경로가 모두 없었다. 새 `/for-you` GET 200 후 `.next/dev/cache/fetch-cache`에 2개 파일이 생겼고, 새 서버 로그에서 Prisma/DB 오류는 0개였다.
- 보존 캐시는 원본을 삭제하지 않고 그대로 남겨두었다. DB 데이터·운영 DB·외부 설정을 변경하지 않았다.

### 자동 및 실제 화면 재검증

- DB 복구 후 전체 테스트: 131 files / 769 PASS, 6 files / 14 guarded skip.
- TypeScript PASS. 전체 lint 오류 0, 기존 경고 3.
- 직접 Prisma 조회의 상품 ID 1–9 가격: AED 719, 685, 179, 369, 95, 99, 69, 279, 80. 실제 브라우저 대조는 `qa.md`의 실DB 재검증 절에 별도로 기록한다.
- `/for-you` 초기 HTTP HTML은 hydration placeholder이므로 HTML의 상세 링크 개수로 상품 데이터 성공을 주장하지 않는다. 실제 UI 대조와 cold-cache 로그를 함께 사용한다.
- 이전 실제 Safari/Android 기기 및 다중 사진 native 축 분리 미검증 한계는 그대로 유지한다.
