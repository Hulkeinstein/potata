# 실제 대표 사진 교체 검증

2026-10-20 사용자 승인: 관리자 화면에서 실제 저장 검증, 기존 데이터 유지.

## 실행

- 이번 턴에는 in-app browser의 기존 관리자 로그인으로 `/admin/products` 접근 성공. 이전 URL policy 차단은 더 이상 재현되지 않았다.
- 로컬 `potata_dev` 호스트 검증 후 비공개 테스트 상품 `qa-image-browser-20261020`만 생성. 기존9개 상품은 수정하지 않음.
- 기존 공개 저장소 asset `public/home-banner.jpg`(244173bytes)를 UI file chooser로 선택. 미리보기의 저장 전 표시 확인.
- UI `대표 사진 저장` 클릭 → 실제 image POST/Supabase 업로드 성공. 성공 문구와 이미지 로드 naturalWidth>0 확인.
- 새 public URL의 UUID: `products/91b61800-b723-49d7-bda2-8f3f88a4ad76.jpg`.
- 페이지 새로고침 뒤에도 동일 Supabase URL 및 이미지 정상 로드 확인.
- DB 직접 조회: imageUrl=images[0], 상세 사진 `/home-banner.jpg` 유지, 재고7·수동품절true·비공개 상태 유지.
- 취소로 목록 복귀 후 새 썸네일 표시. q+brand+category+status+sort 적용 후 편집 왕복으로 동일 조건 복원.
- desktop1280×900/mobile390×844 목록·편집 가로 overflow 없음. 콘솔 error0. 임시 viewport override는 reset.

## 정리

- 최초 CLI server-only helper 호출은 실패해 삭제가 수행되지 않음. 동일 storage auth header 함수를 이용한 정확한 새 파일 경로 DELETE 성공 후 테스트 상품만 삭제.
- 기존 원본 asset/사진 파일, 기존 상품·옵션 데이터 삭제/수정 없음.
- 최종 상품9/옵션40, SHA-256 `78b02f759db0f9138a95d4ffa1c6f6f66ac0d3cc1bed360f883eff387b714689`로 작업 전과 동일.
- 브라우저 조건 초기화 후 기존9개 목록 표시, 원래 viewport 복원, 사용자 탭 유지.
- 코드/환경변수/권한/운영 DB 변경 없음. commit/push/deploy 없음.

## 증거

- real-photo-saved.png: 실제 저장 성공 문구와 사진.
- real-photo-list.png: 변경 사진 목록.
- real-photo-mobile-edit.png: 모바일 편집.
- cleaned-catalog.png / cleaned-desktop-1280.png: 테스트 정리 뒤 기존9개 목록.
