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
  hasHydrated: boolean;
  user: User | null;
  login: (user?: User) => void;
  logout: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface AuthSuccessResponse {
  success: true;
  message: string;
  devCode?: string;
  user?: User;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
  expired?: boolean;
  tooManyAttempts?: boolean;
}

export type AuthApiResponse = AuthSuccessResponse | AuthErrorResponse;

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
  removeItem: (item: CartItem) => void;
  updateQuantity: (item: CartItem, delta: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

// 위시리스트(좋아요) API 계약 타입 — DB 영속화
export type WishlistGetData = { productIds: string[] };
export interface WishlistToggleRequest {
  productId: string;
}
export type WishlistToggleData = { productId: string; liked: boolean };

// 장바구니(cart) API 계약 타입 — DB 영속화
// PUT 요청: 가벼운 라인 배열(product 객체 미포함 — 서버가 재조회·재조립)
export interface CartSyncLine {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}
export interface CartSyncRequest {
  items: CartSyncLine[];
}
// GET 응답: store가 그대로 쓰는 CartItem[](product 재조립)
export type CartGetData = { items: CartItem[] };

// AI Studio Recents(최근 try-on 상품) API 계약 타입 — DB 영속화
export type RecentsGetData = { productIds: string[] }; // 최신순(최대 20)
export interface RecentAddRequest {
  productId: string;
}

// OOTD 피드 API 계약 타입 — DB(Supabase Storage 이미지) 기반 UGC 피드
export interface OOTDFeedItem {
  id: string;
  imageUrls: string[];
  caption: string | null;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  products: Pick<Product, "id" | "name" | "brand" | "imageUrl">[]; // 태그 상품(SHOP 링크용)
  likeCount: number;
  isLiked: boolean; // 현재 로그인 유저 기준
}
export interface OOTDFeedData {
  items: OOTDFeedItem[];
  nextCursor: string | null; // cursor pagination(없으면 마지막 페이지)
}
// 게시 요청은 multipart/form-data(파일). 본 타입은 비파일 메타 참고용
export interface OOTDCreateMeta {
  caption?: string;
  productIds: string[];
}
// 좋아요 토글 응답
export type OOTDLikeData = { postId: string; liked: boolean; likeCount: number };

// 관리자 상품 등록 입력 — createProduct 헬퍼 + POST /api/admin/products 폼 필드
export interface CreateProductInput {
  name: string;
  brand: string;
  price: number;             // AED 정수 > 0
  category: ProductCategory; // 'All' 제외 6종(Outer/Top/Bottom/Dress/Acc/Shoes)
  imageUrl: string;          // 업로드된 public URL
  images?: string[];
  originalPrice?: number;
  discountRate?: number;
  description?: string;
  sizes?: string[];
  colors?: string[];
  isNew?: boolean;
  isBest?: boolean;
  isHot?: boolean;
}
// POST /api/admin/products 성공 데이터
export type AdminProductCreateData = { id: string };

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

// 주문 관련 타입
export interface OrderItemSnapshot {
  productId: string;
  name: string;
  brand: string;
  price: number; // AED 정수 (서버 재조회 값)
  imageUrl: string;
  size?: string;
  color?: string;
  quantity: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Order {
  id: string;
  userId: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  idempotencyKey?: string | null;
  createdAt: string;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
    size?: string;
    color?: string;
  }[];
  idempotencyKey?: string;
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
