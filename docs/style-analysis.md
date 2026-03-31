# POTATA 스타일 심층 분석 보고서
> 분석일: 2026-03-31 | 분석 에이전트: omoc_oracle

---

## 1. 디자인 시스템: 컬러 팔레트, 타이포그래피, 스페이싱

### 컬러 팔레트

| 역할 | 색상 | Hex |
|---|---|---|
| Background | Deep Black | `#050505` |
| Foreground | Off White | `#F5F5F7` |
| Primary | Neon Purple | `#8B5CF6` |
| Brand Neon | Lime Green | `#ccf381` |
| Brand Purple | Purple | `#a855f7` |
| Dark Surface | Dark Surface | `#0F0F0F` |
| Card | Card BG | `#0F0F0F` |
| Border / Input | Border | `#282828` |
| Neon Blue | Neon Blue | `#3B82F6` |

**Tailwind 하드코딩 컬러:**
- `text-gray-400/300/500/600` — 보조 텍스트
- `text-purple-400/500`, `hover:text-purple-300` — 인터랙티브 강조
- `text-red-500/600` — 할인율, 에러
- `text-yellow-500` — 별점
- `text-green-500` — 온라인 상태
- `bg-zinc-900/800/950` — 다크 서피스
- `border-white/5, /10, /20` — 반투명 보더

> ⚠️ CSS 변수(`--primary`, `--background`)를 정의했지만 실제 컴포넌트에서는 Tailwind 유틸리티를 직접 사용. CSS 변수 활용도 낮음.

### 타이포그래피

**폰트:**
- **Outfit** (Latin, `--font-outfit`): 헤드라인, 로고, 가격 강조
- **Noto Sans KR** (Korean, `--font-noto`): 한국어 (400/500/700)
- `font-sans` 기본, `font-mono` 일부 (AI 상태 텍스트)

**크기 패턴:**
- 로고: `text-2xl font-black tracking-tighter` / `text-6xl md:text-9xl font-black italic` (로더)
- 히어로 헤드라인: `text-5xl md:text-8xl font-bold tracking-tighter`
- 섹션 제목: `text-xl ~ text-3xl font-bold`
- 본문: `text-sm ~ text-base`
- 라벨/배지: `text-[10px] ~ text-xs font-bold uppercase tracking-wider`

### 스페이싱

- 페이지 컨테이너: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- 섹션 패딩: `py-12` ~ `py-16`
- 카드 갭: `gap-x-4 gap-y-8` ~ `gap-y-10`
- Navbar 높이: `h-16` (64px)
- 내부 패딩: `p-4` ~ `p-8` (카드), `p-6` ~ `p-12` (드로어, 패널)

---

## 2. UI 컴포넌트 패턴

### 글래스모피즘

globals.css 유틸리티:
- `.glass-panel`: `bg-white/5 backdrop-blur-md border border-white/10`
- `.glass-panel-dark`: `bg-black/40 backdrop-blur-lg border border-white/5`

**실제 적용:**
- Navbar: `bg-black/60 backdrop-blur-xl border-b border-white/5`
- SearchOverlay: `bg-black/80 backdrop-blur-xl`
- CartDrawer backdrop: `bg-black/60 backdrop-blur-sm`
- Login 카드: `bg-black/40 backdrop-blur-xl border border-white/10`
- Hero 플로팅 태그: `bg-black/60 backdrop-blur-md`

> ⚠️ `.glass-panel` 유틸리티 클래스는 실제 사용처 0개. 각 컴포넌트가 인라인으로 개별 적용.

### 애니메이션 (Framer Motion)

**페이지 전환 (template.tsx):**
- 검은 오버레이 위로 슬라이드 아웃 (`y: "0%" → "-100%"`, 0.8s, bezier `[0.76, 0, 0.24, 1]`)
- 콘텐츠 페이드인 + 상승 (`opacity: 0→1, y: 20→0`, delay 0.2s)

**InitialLoader:**
- 글자별 stagger (blur 20px→0, scale 1.5→1, y 100→0)
- bezier `[0.22, 1, 0.36, 1]`
- 3.5초 후 위로 퇴장
- `sessionStorage`로 세션 내 1회만 표시

**CustomCursor:**
- `useSpring` 물리 추적 (damping: 25, stiffness: 700)
- 클릭 가능 요소 호버 시 1.5배 확대 + 네온 그린 필
- `mix-blend-difference`
- `(pointer: fine)` 미디어 쿼리로 마우스 기기만 활성화

**기타:**
- 상품 이미지 호버: `group-hover:scale-105 duration-500`
- 좋아요 버튼: 펄스 (scale: 0→1.5, opacity: 1→0)
- Skeleton: 네온 그린 shimmer + pulse
- `AnimatePresence`로 모달/오버레이 입출

### 인터랙션

- 호버 스케일: `hover:scale-[1.02]`, `hover:scale-105`, `active:scale-95`
- 보더 전환: `border-white/5 → hover:border-purple-500/30`
- 투명도: `opacity-0 group-hover:opacity-100`
- 번역 Y: `translate-y-4 → group-hover:translate-y-0`
- Brands 무한 스크롤: 수동 드래그 (마우스 이벤트, 3배 복제)

---

## 3. 레이아웃 구조 (페이지별)

| 페이지 | 레이아웃 | 특징 |
|---|---|---|
| Home (`/`) | 수직 풀스크린 섹션 | Hero(90vh) → K-Trend → ProductGrid → Footer |
| Shop (`/shop`) | Sticky 필터 + 그리드 | `grid-cols-2 md:3 lg:4`, sticky 카테고리 |
| Product Detail | 12-column 그리드 | 좌 7col 이미지 + 우 5col sticky 정보 |
| Try-On (AI Studio) | 좌우 50:50 | 좌: 캔버스/업로드, 우: 탭(Wardrobe/Gallery/Recents) |
| Brands | 캐러셀 + 그리드 | 무한 드래그 상단 + `grid-cols-2 lg:4` 하단 |
| Ranking | Sticky 헤더 + 그리드 | 카테고리 캡슐 + Products/Brands 탭 |
| For You | AI 카드 + 그리드 | AI 분석 배너 + 키워드 태그 + `grid-cols-2 md:4 lg:5` |
| What to Wear | Masonry | `columns-2 md:columns-3` (Pinterest 스타일) |
| Category | 사이드바 + 그리드 | 좌 고정(md:w-64, mobile:w-24) + 서브카테고리 |
| Login | 중앙 카드 | Ken Burns 배경 + 중앙 로그인 카드 |
| MyPage | 싱글 컬럼 | `max-w-2xl`, 프로필 → 대시보드 → 메뉴 |
| Liked | 표준 그리드 | `grid-cols-2 md:3 lg:4` + 빈 상태 UI |
| 404/Error | 중앙 정렬 | ⚠️ 흰색 배경 (다크 테마 불일치) |
| Loading | 중앙 스피너 | 퍼플 회전 + 검은 배경 |

---

## 4. 스타일 일관성 문제

### 🔴 다크/라이트 충돌 (심각)

1. **404 페이지**: `bg-white` + `text-gray-900` — 사이트 전체 다크인데 여기만 라이트
2. **Error 페이지**: 동일 `bg-white` + `text-gray-900`
3. **모바일 메뉴**: `bg-white` + `hover:bg-gray-50` — 데스크톱은 다크인데 모바일만 화이트
4. **ProductGrid 섹션**: `text-gray-900` 제목 — `bg-black` 부모 위에서 검은 텍스트 보이지 않을 수 있음

### 🟡 스타일 불일치

5. **가격 포맷 혼재:**
   - `ProductCard`: `formatPrice()` (KRW→AED 변환)
   - `BrandsPage`: 하드코딩 환율 `(Math.round(price * 0.003))`
   - `RankingPage`: 동일 하드코딩
   - `Hero LoggedIn`: `KRW 129,000` (원화)

6. **pt 오프셋 불일치:** Navbar `h-16`인데 `pt-16` / `pt-20` / `pt-24` 혼재
7. **Footer**: Home에만 존재, 다른 페이지에 없음

### 🟠 미완성 요소

8. Footer 소셜 아이콘: 빈 div (아이콘/링크 없음)
9. Footer 링크: 모든 `href="#"`
10. "View All" 버튼: 동작 없음
11. ProductDetail 수량 +/-: state 미연결
12. Detail 탭(Review/Q&A): 전환해도 같은 콘텐츠
13. Try-On 바디 프로필(Height/Weight): API 미전달
14. For You: "For Sarah" 하드코딩
15. Shop "Load More": 핸들러 없음
16. Ranking "Brands" 탭: Products만 표시

---

## 5. 접근성(a11y)

### ✅ 잘 된 부분
- Navbar: `role="navigation"`, `aria-label`, `aria-expanded`
- 모바일 메뉴: `id="mobile-menu"`, `aria-controls`
- ProductCard: `aria-label`로 상품명+가격 전체 텍스트
- Shop 카테고리: `role="tablist"`, `role="tab"`, `aria-selected`
- 아이콘: `aria-hidden="true"`

### 🔴 문제점

1. **`cursor: none`**: OS 접근성 설정(큰 커서) 무시. JS 실패 시 커서 소실
2. **색상 대비 부족:**
   - `text-gray-400` on black: ~5.5:1 (AA 여유 없음)
   - `text-gray-500` on black: ~4:1 (AA 소형 텍스트 실패)
   - `text-gray-600` on black: ~2.7:1 (실패)
3. **SearchOverlay input**: `<label>` 없음
4. **aria-label 누락**: SearchOverlay 닫기, K-Trend 스크롤, ProductDetail Heart/Share, CartDrawer 수량 버튼
5. **HeartButton `confirm()`**: 스크린 리더 예측 불가
6. **Try-On 파일 업로드**: `opacity-0` 인풋에 접근성 레이블 없음
7. **Brands 캐러셀**: 키보드 탐색 불가 (마우스 드래그만)
8. **포커스 트랩 미구현**: SearchOverlay, CartDrawer — 탭 키가 배경으로 탈출 가능

---

## 6. 모바일 반응형

### 브레이크포인트
- `sm:` (640px): 패딩 조정
- `md:` (768px): 그리드 열 변경, 레이아웃 전환
- `lg:` (1024px): 4열 그리드, 사이드바

### 🔴 문제점

1. **Category 사이드바**: 320px에서 `w-24` 고정 → 콘텐츠 영역 과도하게 좁음
2. **Try-On 액션 바**: 모바일에서 콘텐츠와 겹칠 수 있음
3. **ProductDetail sticky**: 모바일에서 이미지 스택 후 정보 패널 → sticky 무의미
4. **모바일 메뉴**: `bg-white` 다크 모드 충돌
5. **Hero LoggedIn**: 90vh 안에서 50:50 분할 시 텍스트 잘림 가능
6. **K-Trend 스크롤 버튼**: 모바일에서 네이티브 스와이프 가능한데 버튼 표시 → 공간 낭비

✅ 커스텀 커서: `(pointer: fine)` 체크로 모바일 비활성화 양호

---

## 7. 사용 라이브러리 및 디자인 레퍼런스

### 기술 스택

| 라이브러리 | 버전 | 용도 |
|---|---|---|
| Next.js | 16.1.6 | App Router 풀스택 |
| React | 19.2.3 | UI |
| Tailwind CSS | v4 | 유틸리티 CSS |
| Framer Motion | 12.29.2 | 애니메이션 |
| Zustand | 5.0.10 | 상태관리 (auth, cart, wishlist, studio) |
| Lucide React | 0.563.0 | 아이콘 |
| clsx + tailwind-merge | latest | 조건부 클래스 (cn) |
| Replicate | 1.4.0 | AI Try-On API |
| TypeScript | v5 | 타입 시스템 |

### 디자인 레퍼런스

- **Higgsfield AI** — 시네마틱 다크, 네온 강조 (globals.css 주석 명시)
- **KREAM / 무신사** — 한국 패션 이커머스 레이아웃
- **Apple.com** — 미니멀 타이포, 그라데이션 텍스트
- **Pinterest** — Masonry 레이아웃
- **Awwwards/Framer** — 커스텀 커서, 페이지 전환, 글래스모피즘

### 외부 리소스
- Unsplash — 비주얼 콘텐츠
- DiceBear Avatars — 유저 아바타
- Google Fonts — Outfit + Noto Sans KR

---

## 종합 평가

**강점:**
- 일관된 다크 시네마틱 톤 (메인 페이지들)
- Framer Motion 프리미엄 애니메이션 퀄리티
- 컴포넌트 구조 기능별 분리 양호
- AI Try-On UX 플로우 직관적

**개선 우선순위:**
1. 🔴 다크/라이트 충돌 (404, Error, 모바일 메뉴) — 가장 시급
2. 🔴 접근성: 포커스 트랩, 색상 대비, 커서 폴백
3. 🟡 가격 포맷 통일 (formatPrice로 일원화)
4. 🟡 CSS 변수/유틸리티 정의 ↔ 실사용 괴리 해소
5. 🟠 미완성 UI (플레이스홀더 링크, 더미 기능)
6. 🟠 Footer → Layout 레벨 이동
