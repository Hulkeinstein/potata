/**
 * 전역 타입 정의
 */

// 상품 관련 타입
export interface Product {
  id: string;
  brand: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountRate?: number;
  imageUrl: string;
  isNew?: boolean;
  isBest?: boolean;
  isHot?: boolean;
  category?: ProductCategory;
  description?: string;
  sizes?: string[];
  colors?: string[];
  stock?: number;
  images?: string[];
  rating?: number;
  reviewCount?: number;
}

export type ProductCategory =
  | 'All'
  | 'Outer'
  | 'Top'
  | 'Bottom'
  | 'Dress'
  | 'Acc'
  | 'Shoes';

// 브랜드 관련 타입
export interface Brand {
  id: string;
  name: string;
  char: string;
  image: string;
  tag: string;
  description?: string;
  productCount?: number;
}

// 트렌드 관련 타입
export interface Trend {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

// OOTD 관련 타입
export interface OOTD {
  id: number;
  user: string;
  image: string;
  likes: number;
  desc: string;
  product: string;
  createdAt?: string;
}

// 사용자 관련 타입
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  style: string[];
  favoritesBrands: string[];
  size?: {
    height?: number;
    weight?: number;
  };
}

// 인증 관련 타입
export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  login: (user?: User) => void;
  logout: () => void;
}

// 장바구니 관련 타입
export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 필터/정렬 타입
export type SortOption =
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'popular'
  | 'rating';

export interface FilterOptions {
  category?: ProductCategory;
  brand?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  sizes?: string[];
  colors?: string[];
}

// 네비게이션 타입
export interface NavLink {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// AI Try-On 관련 타입
export interface TryOnRequest {
  userImage: string;
  productId: string;
  height?: number;
  weight?: number;
}

export interface TryOnResult {
  id: string;
  resultImage: string;
  confidence: number;
  createdAt: string;
}
