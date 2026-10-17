import type { Locale } from './locale';
const en = {
  footerIntro: "Linking Seoul's vibrancy to Dubai's modern style.", footerExperience: 'Premium K-Fashion & AI experience.',
  shop: 'Shop', newArrivals: 'New Arrivals', bestSellers: 'Best Sellers', modestWear: 'Modest Wear', rights: 'All rights reserved.',
  category: 'CATEGORY', ootd: 'OOTD', forYou: 'FOR YOU', ranking: 'RANKING', brands: 'BRANDS',
  mainNavigation: 'Main navigation', mobileNavigation: 'Mobile navigation', home: 'POTATA Home', search: 'Search',
  wishlist: 'Wishlist', accountName: 'Account name', account: 'Account', profile: 'User profile', cart: 'Shopping cart with items',
  closeMenu: 'Close menu', openMenu: 'Open menu', logout: 'Logout', login: 'Login',
  heroTitle: 'THE NEW', heroDescription: 'Unique Korean Fashion curated for the Modern Generation.', heroExperience: 'Experience the future of style with AI.',
  collection: 'Explore Collection', studio: 'Try AI Studio', banner: 'Hero Banner', viewAll: 'View All',
  curated: 'Curated for UAE', trending: 'Trending in Seoul', left: 'Scroll left', right: 'Scroll right',
  imageUnavailable: 'Image unavailable', badges: 'Product badges', best: 'Best', new: 'New', hot: 'Hot', tryOn: 'Try on with AI',
  close: 'Close', hello: 'Hello,', user: 'User', coordinator: 'Personalized styling recommendations are in preparation. Explore styles directly in AI Studio for now.', hideDay: 'Hide for one day',
  like: 'Like', unlike: 'Unlike', loginRequired: 'Sign in is required. Go to the sign-in page?', notifications: 'Notifications', unread: 'unread notifications', dismiss: 'Dismiss',
} as const;
type SharedMessages = { readonly [Key in keyof typeof en]: string };
export const sharedMessages = {
  en,
  ko: {
    footerIntro: '서울의 활기를 두바이의 현대적인 스타일과 연결합니다.', footerExperience: '프리미엄 K-패션과 AI 경험.',
    shop: '쇼핑', newArrivals: '신상품', bestSellers: '인기 상품', modestWear: '모디스트 패션', rights: '모든 권리 보유.',
    category: '카테고리', ootd: 'OOTD', forYou: '추천', ranking: '랭킹', brands: '브랜드',
    mainNavigation: '주 메뉴', mobileNavigation: '모바일 메뉴', home: 'POTATA 홈', search: '검색', wishlist: '찜 목록',
    accountName: '계정 이름', account: '계정', profile: '사용자 프로필', cart: '장바구니', closeMenu: '메뉴 닫기', openMenu: '메뉴 열기', logout: '로그아웃', login: '로그인',
    heroTitle: '새로운', heroDescription: '새로운 세대를 위해 엄선한 특별한 한국 패션.', heroExperience: 'AI와 함께 미래의 스타일을 경험하세요.',
    collection: '컬렉션 둘러보기', studio: 'AI Studio 체험하기', banner: '메인 배너', viewAll: '전체 보기',
    curated: 'UAE를 위한 큐레이션', trending: '서울의 트렌드', left: '왼쪽으로 넘기기', right: '오른쪽으로 넘기기',
    imageUnavailable: '이미지 없음', badges: '상품 배지', best: '인기', new: '신상', hot: '인기 급상승', tryOn: 'AI로 입어보기',
    close: '닫기', hello: '안녕하세요,', user: '사용자', coordinator: '개인화 코디 추천 기능을 준비하고 있습니다. 현재는 AI Studio에서 직접 스타일을 체험할 수 있습니다.', hideDay: '하루 동안 보지 않기',
    like: '좋아요', unlike: '좋아요 취소', loginRequired: '로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?', notifications: '알림', unread: '읽지 않은 알림', dismiss: '끄기',
  },
} as const satisfies Record<Locale, SharedMessages>;
