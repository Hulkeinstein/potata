import type { Locale } from './locale';
const en = {
  categories: 'Product categories', sort: 'Sort by:', newest: 'Newest', allProducts: 'All Products', loadMore: 'Load More', empty: 'No products found in this category.',
  search: 'Search', enterQuery: 'Enter a search term.', results: 'results', noResults: 'No results for', closeSearch: 'Close search', searchPlaceholder: 'Search brands, items...', searchProducts: 'Search products', popularNow: 'Popular Now', trendingBrands: 'Trending Brands',
  ranking: 'Real-time Ranking', updated: 'Updated', rankingNote: 'Products ranked by the current catalog order.', hot: 'HOT', featuredBrands: 'Featured Brands', brandProducts: 'View brand products', trending: 'Trending Now', popular: 'Popular',
  forSarah: 'For Sarah', analysisNote: 'Analysis based on your recent style.', analysis: 'Analysis', aiAnalysis: 'AI ANALYSIS', love: 'You love', style: 'Minimal & Chic', vibes: 'vibes.', viewed: 'Based on 12 viewed items', recommended: 'Recommended Items',
  explore: 'Explore the latest', trends: 'trends', shop: 'Shop', collection: 'collection',
} as const;
type Messages = { readonly [K in keyof typeof en]: string };
export const discoveryMessages = {
  en,
  ko: {
    categories: '상품 카테고리', sort: '정렬:', newest: '신상품순', allProducts: '전체 상품', loadMore: '더 보기', empty: '이 카테고리의 상품이 없습니다.',
    search: '검색', enterQuery: '검색어를 입력하세요.', results: '건의 검색 결과', noResults: '검색 결과가 없습니다:', closeSearch: '검색 닫기', searchPlaceholder: '브랜드, 상품 검색...', searchProducts: '상품 검색', popularNow: '인기 검색어', trendingBrands: '인기 브랜드',
    ranking: '실시간 랭킹', updated: '업데이트', rankingNote: '현재 카탈로그 순서로 표시한 상품입니다.', hot: '인기', featuredBrands: '주목할 브랜드', brandProducts: '브랜드 상품 보기', trending: '지금 주목할 상품', popular: '인기순',
    forSarah: 'Sarah를 위한 추천', analysisNote: '최근 스타일을 바탕으로 한 분석입니다.', analysis: '스타일 분석', aiAnalysis: 'AI 분석', love: '선호하는 스타일은', style: '미니멀 & 시크', vibes: '입니다.', viewed: '조회한 12개 상품 기준', recommended: '추천 상품',
    explore: '최신 트렌드 둘러보기:', trends: '', shop: '상품 보기:', collection: '컬렉션',
  },
} as const satisfies Record<Locale, Messages>;
const categoryKo: Readonly<Record<string, string>> = { All: '전체', Outer: '아우터', Top: '상의', Bottom: '하의', Dress: '원피스', Acc: '액세서리', Shoes: '신발', Jackets: '재킷', Coats: '코트', Padding: '패딩', Cardigans: '카디건', 'T-Shirts': '티셔츠', Shirts: '셔츠', Sweatshirts: '맨투맨', Hoodies: '후디', Denim: '데님', Slacks: '슬랙스', Joggers: '조거 팬츠', Shorts: '반바지', Mini: '미니', Long: '롱', 'One-piece': '원피스', Hats: '모자', Bags: '가방', Jewelry: '주얼리', Sneakers: '스니커즈', Boots: '부츠', Sandals: '샌들' };
export function categoryLabel(value: string, locale: Locale): string { return locale === 'ko' ? categoryKo[value] ?? value : value; }
const editorialKo: Readonly<Record<string, string>> = { 'Urban\nOutdoor': '도심 속\n아웃도어', 'City\nBoys': '시티\n보이', 'Modern\nMood': '모던\n무드', 'Street\nRebel': '스트리트\n레벨', 'Daily\nEssential': '데일리\n에센셜', 'Wide\nSilhouette': '와이드\n실루엣', 'Vintage\nBiker': '빈티지\n바이커', 'Ivy\nLeague': '아이비\n리그', 'Tech\nWear': '테크\n웨어' };
export function brandEditorialLabel(value: string, locale: Locale): string { return locale === 'ko' ? editorialKo[value] ?? value : value; }
