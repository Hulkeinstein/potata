/**
 * 애플리케이션 전역 상수
 */

// 브랜드 정보
export const BRAND = {
  NAME: 'POTATA',
  TAGLINE: 'Seoul to Dubai',
  DESCRIPTION: 'Premier Korean Fashion for UAE',
} as const;

// 페이지네이션
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 48,
} as const;

// 이미지 설정
export const IMAGE = {
  PLACEHOLDER: '/images/placeholder.jpg',
  AVATAR_PLACEHOLDER: 'https://api.dicebear.com/7.x/avataaars/svg',
  QUALITY: 80,
} as const;

// 네비게이션 메뉴
export const NAV_LINKS = [
  { href: '/category', label: 'CATEGORY' },
  { href: '/shop', label: 'SHOP' },
  { href: '/what-to-wear', label: 'OOTD' },
  { href: '/for-you', label: 'FOR YOU' },
  { href: '/ranking', label: 'RANKING' },
  { href: '/brands', label: 'BRANDS' },
] as const;

// 카테고리
export const CATEGORIES = [
  'All',
  'Outer',
  'Top',
  'Bottom',
  'Dress',
  'Acc',
  'Shoes',
] as const;

// 랭킹 탭
export const RANKING_TABS = [
  'Real-time',
  'Daily',
  'Weekly',
  'Monthly',
] as const;

// 스타일 태그
export const STYLE_TAGS = [
  '#Minimalist',
  '#Office Look',
  '#Neutral Tone',
  '#Tweed',
  '#Casual',
  '#Street',
] as const;

// 알파벳 인덱스 (브랜드 페이지용)
export const ALPHABET = [
  '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const;
