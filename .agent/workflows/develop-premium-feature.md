---
description: Develop a new Premium Feature for Potata
---

# 프리미엄 기능 개발 워크플로우

이 워크플로우는 Potata 애플리케이션의 고품질 프리미엄 기능 개발을 가이드하며, "와우(WOW)" 요소, 부드러운 애니메이션, 견고한 기능을 보장합니다.

## 1. 컨셉 및 시각화 (Concept & Visualization)
- [ ] **"프리미엄" 요소 정의**: 이 기능을 럭셔리하게 만드는 요소 식별 (예: 커스텀 애니메이션, 글래스모피즘, 사운드 효과).
- [ ] **리서치**: Awwwards, Dribbble 또는 럭셔리 패션 사이트에서 디자인 영감 찾기.
- [ ] **모의 데이터**: 백엔드 통합 전, 최종 상태를 시각화하기 위한 고품질 모의 데이터(이미지, 텍스트) 생성.

## 2. 컴포넌트 구현 (Component Implementation)
- [ ] **구조**: `components/ui` 또는 기능별 폴더에 컴포넌트 생성.
- [ ] **스타일링**: `outfit` 폰트와 `zinc` 팔레트를 사용하여 Tailwind CSS 적용. 기본 파랑/빨강 색상 지양. 그라디언트와 `backdrop-blur` 사용.
- [ ] **애니메이션**: `framer-motion` 임포트. 다음 요소 추가:
    - 진입 애니메이션 (`initial={{ opacity: 0, y: 20 }}`).
    - 호버 효과 (`whileHover={{ scale: 1.05 }}`).
    - 탭/클릭 피드백 (`whileTap={{ scale: 0.95 }}`).

## 3. 통합 및 로직 (Integration & Logic)
- [ ] **상태 관리**: 전역 상태가 필요한 경우 `zustand` 사용 (예: `store/auth-store.ts`).
- [ ] **API 라우트**: 서버 사이드 로직/AI가 필요한 경우 `app/api/[feature]/route.ts` 생성.
- [ ] **데이터베이스**: 효율적인 데이터 영구가 필요한 경우 `prisma/schema.prisma` 업데이트.

## 4. 완성도 및 경험 (Polish & Experience)
- [ ] **로딩 상태**: 절대 빈 화면을 보여주지 말 것. 스켈레톤 로더나 `InitialLoader` 사용.
- [ ] **에러 처리**: 일반적인 경고창(alert) 대신 우아한 토스트(toast)나 인라인 메시지 표시.
- [ ] **반응형**: 모바일, 태블릿, 데스크톱 뷰 확인.
- [ ] **메타데이터**: SEO를 위한 `generateMetadata` 추가.

## 5. 검증 (Verification)
- [ ] **브라우저 테스트**: 페이지를 열고 모든 요소와 상호작용 확인.
- [ ] **성능**: 레이아웃 변경(CLS) 및 부드러운 60fps 애니메이션 확인.
