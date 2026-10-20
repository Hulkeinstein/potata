# 관리자 상품 목록/대표 사진 교체 검증

## 작업 전 기준

- 기존 로컬 DB 상품9개, 옵션40개.
- id 정렬 전체 Product/ProductVariant JSON SHA-256: `78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689`.
- 기존 관리자 shell/홈 개편 및 ADR/로드맵 dirty 변경은 보존한다.
- 운영 DB, 외부 Storage 기존 파일, 환경변수, commit/push/배포는 이번 실행에서 변경하지 않는다.
- 이전 브라우저 자동 관찰은 URL policy로 거부됐다. 우회하지 않으며 실제 UI 확인이 불가능하면 자동/실DB 검증과 구분하여 보고한다.

## 결과

- TypeScript `npx tsc --noEmit`: PASS (최종 수정 후 재확인).
- ESLint `app components lib auth.ts middleware.ts next.config.ts`: 오류0, 기존 경고2. 최종 image editor scoped lint도 오류0.
- Production build: PASS, TypeScript 완료 및62/62 페이지 생성, exit0. 기존 middleware deprecation 안내만 있음.
- 실제 로컬 HTTP5건/DB·query18건 PASS: qa.md 참조.
- 이미지 실제 로컬 DB integration2건 PASS: 임시 fixture만 생성/정리, 기존 데이터 쓰기 없음.
- 이미지 저장 성공 후 preview state effect tick 차이로 최초 전체 테스트1건 실패(889PASS/1FAIL/16SKIP). 단일 selection 상태로 수정, 기존 정확 이미지 assertion 유지, 집중10건 PASS.
- 최종 전체 Vitest 재실행:153 files PASS,891 tests PASS, guarded16 tests SKIP(7files), exit0.
- 변경 source11개 최대98 pure LOC. query/domain, 대표 교체domain, 목록UI, 이미지UI, HTTP 경계로 책임 분리. 새 type assertion/any/의존성·schema 변경 없음.
- 독립 Goal/Code/Security/Context 소스 검토 PASS. 실행 QA는 HTTP/DB 범위PASS이며 실제 브라우저 시각 QA 전체PASS를 뜻하지 않는다.
- 개발 서버 재시작 완료: localhost:3000 (실행 유지).
- 최종 기존 데이터 지문은 작업 전과 동일: 상품9/옵션40 및 위 SHA-256 일치. 데이터 초기화·기존 데이터 수정 없음.

## 검증 제한 / 남은 확인

### 후속 실제 검증으로 해소 (2026-10-20)

사용자의 실제 저장 검증 승인 후 브라우저 접근 성공. 실제 UI→Supabase upload→DB 저장→새로고침 유지→목록 썸네일/필터 왕복 및 desktop/mobile 확인을 완료했다. 테스트 상품과 새 업로드 파일만 정리했고 기존9/40개 지문은 동일하다. 상세 결과 `live-upload.md`. 아래 항목은 이전 실행 당시의 제한 기록이며 현재 미완료 상태가 아니다.

- 브라우저 자동 관찰이 URL policy로 차단되어 desktop/mobile 실제 화면 검증은 미완료. 우회 시도 없음.
- 외부 Supabase Storage 실제 업로드는 수행하지 않음. 기존 서비스 adapter 재사용과 route failure/success tests로 검증. 기존 외부 사진 파일 삭제 없음.
- 커밋·푸시·배포 없음.
