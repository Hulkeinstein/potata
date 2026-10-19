import type { Locale } from './locale';
const en = {
  title: 'Discover your next find', note: 'Explore the current collection, your way. Not personalized recommendations.',
  grid: 'Grid view', immersive: 'Immersive view', view: 'Choose your view', category: 'Category',
  previous: 'Previous product', next: 'Next product', previousPhoto: 'Previous photo', nextPhoto: 'Next photo',
  details: 'View product & options', end: 'You have seen all current products.', empty: 'No products match these filters.',
  shop: 'Explore Shop', footer: 'Language & footer', photo: 'Photo', unavailable: 'Image unavailable', soldOut: 'Sold out',
  hint: 'Swipe up/down for products, left/right for photos. Or use the arrow buttons.', loading: 'Preparing your view…',
  share: 'Copy product link', copied: 'Link copied', shareUnavailable: 'Could not copy the link', close: 'Close', restart: 'Start again',
} as const;
export const feedMessages = {
  en,
  ko: {
    title: '새로운 취향을 발견하세요', note: '현재 컬렉션을 원하는 방식으로 둘러보세요. 개인화 추천은 아닙니다.',
    grid: '일반 보기', immersive: '몰입 보기', view: '보기 방식 선택', category: '카테고리',
    previous: '이전 상품', next: '다음 상품', previousPhoto: '이전 사진', nextPhoto: '다음 사진',
    details: '상품·옵션 자세히 보기', end: '현재 상품을 모두 봤어요.', empty: '조건에 맞는 상품이 없습니다.',
    shop: 'Shop 둘러보기', footer: '언어·Footer', photo: '사진', unavailable: '이미지 없음', soldOut: '품절',
    hint: '위아래로 상품, 좌우로 사진을 넘기세요. 방향 버튼으로도 이동할 수 있어요.', loading: '보기 방식을 준비하고 있어요…',
    share: '상품 링크 복사', copied: '링크를 복사했어요', shareUnavailable: '링크를 복사하지 못했어요', close: '닫기', restart: '다시 보기',
  },
} as const satisfies Record<Locale, { readonly [K in keyof typeof en]: string }>;
