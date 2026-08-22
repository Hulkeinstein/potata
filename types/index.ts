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
  tags?: string[];
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
  handle: string;
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
  author: { id: string; name: string; handle: string | null; avatar: string | null };
  products: Pick<Product, "id" | "name" | "brand" | "imageUrl">[]; // 태그 상품(SHOP 링크용)
  likeCount: number;
  commentCount: number;
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

export type OOTDCommentItem = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; handle: string | null; avatar: string | null };
  isMine: boolean;
};

export type OOTDCommentPage = {
  items: OOTDCommentItem[];
  nextCursor: string | null;
};

export type OOTDCommentCreateRequest = { content: string };

export type NotificationItem = {
  id: string;
  type: "COMMENT" | "LIKE";
  readAt: string | null;
  createdAt: string;
  actor: { id: string; name: string; handle: string | null; avatar: string | null };
  post: { id: string; imageUrl: string | null; caption: string | null };
};

export type NotificationPage = {
  items: NotificationItem[];
  nextCursor: string | null;
  unreadCount: number;
};

export type NotificationReadAllData = { updatedCount: number };

export type MyPostItem =
  | {
      readonly type: "ootd";
      readonly id: string;
      readonly caption: string | null;
      readonly imageUrls: readonly string[];
      readonly createdAt: string;
      readonly likeCount: number;
      readonly commentCount: number;
    }
  | {
      readonly type: "review";
      readonly id: string;
      readonly productId: string;
      readonly productName: string;
      readonly productImageUrl: string | null;
      readonly rating: number;
      readonly comment: string;
      readonly imageUrls: readonly string[];
      readonly createdAt: string;
      readonly updatedAt: string;
    }
  | {
      readonly type: "question";
      readonly id: string;
      readonly productId: string;
      readonly productName: string;
      readonly productImageUrl: string | null;
      readonly content: string;
      readonly answerCount: number;
      readonly createdAt: string;
      readonly updatedAt: string;
    };

export type MyOOTDPost = Extract<MyPostItem, { readonly type: "ootd" }>;
export type MyReviewPost = Extract<MyPostItem, { readonly type: "review" }>;
export type MyQuestionPost = Extract<MyPostItem, { readonly type: "question" }>;

export type MyPostsData = {
  readonly items: readonly MyPostItem[];
  readonly nextCursor: string | null;
};

export type MyPostsResponse = {
  readonly success: true;
  readonly data: MyPostsData;
};

// 소셜 그래프 — 팔로우/공개 프로필 API 계약 타입
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

// 팔로우 토글 API 응답 (OOTDLikeData 스타일)
export interface FollowToggleData {
  targetUserId: string;
  following: boolean;    // 토글 후 팔로우 상태
  followerCount: number; // 대상의 팔로워 수
}

// 공개 프로필(MVP) — 민감 필드(email/passwordHash/order) 절대 미포함
export interface PublicProfile {
  id: string;
  handle: string | null;
  name: string;
  avatar: string | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean; // 현재 로그인 유저 기준(비로그인 시 false)
}

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
  tags?: string[];
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

// 리뷰 관련 타입
export interface Review {
  id: string;
  userId: string;
  userName: string;        // 작성자 표시용 (User.name) — GET에서 join select하여 채움
  productId: string;
  rating: number;          // 개별 별점 1~5
  comment: string | null;  // optional (별점만 남기는 리뷰 허용)
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
  imageUrls: string[];     // 첨부 이미지 public URL 배열(0~3장)
}

// NOTE: POST는 multipart/form-data로 전송 — rating/comment/images[]는 FormData로 파싱(이 타입은 의미 참조용).
export interface CreateReviewRequest {
  rating: number;          // 1~5 (서버 검증)
  comment?: string;        // optional
  // productId는 URL [id] param에서 취득 — body 불포함 (보안: 클라 입력 불신)
  // userId는 session.user.id만 신뢰 — body 불포함
}

export interface ReviewListResponse {
  reviews: Review[];
  averageRating: number | null;  // 리뷰 0건이면 null
  reviewCount: number;
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

// Q&A 관련 타입
export interface Answer {
  id: string;
  questionId: string;
  userName: string;   // 답변 admin 표시용 (User.name)
  content: string;
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
}

export interface Question {
  id: string;
  userId: string;
  userName: string;   // 작성자 표시용 (User.name) — GET join select
  productId: string;
  content: string;
  answers: Answer[];  // include로 채움(답변 createdAt asc)
  createdAt: string;  // ISO
  updatedAt: string;  // ISO
}

// NOTE: POST/PATCH는 JSON body { content }만. productId는 URL param, userId는 session만 신뢰.
export interface CreateQuestionRequest { content: string; }
export interface CreateAnswerRequest { content: string; }

export interface QuestionListResponse {
  questions: Question[];
  questionCount: number;
  viewerIsAdmin: boolean;
}
