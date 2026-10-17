import type { Locale } from './locale';
const messages = {
  en: { error: 'Something went wrong', errorHint: 'We apologize for the inconvenience. Please try again.', retry: 'Try Again', home: 'Go Home', notFound: 'Page Not Found', notFoundHint: "The page you're looking for doesn't exist or has been moved. Let's get you back on track.", browse: 'Browse Shop', destinations: 'Popular Destinations', shop: 'Shop', brands: 'Brands', ranking: 'Ranking', loading: 'LOADING' },
  ko: { error: '문제가 발생했습니다', errorHint: '불편을 드려 죄송합니다. 다시 시도해 주세요.', retry: '다시 시도', home: '홈으로', notFound: '페이지를 찾을 수 없습니다', notFoundHint: '찾으시는 페이지가 없거나 이동되었습니다. 다른 페이지를 확인해 주세요.', browse: '상품 둘러보기', destinations: '주요 페이지', shop: '쇼핑', brands: '브랜드', ranking: '랭킹', loading: '불러오는 중' },
} as const;
export function getShellMessages(locale: Locale) { return messages[locale]; }
