import type { Locale } from './locale';
const en = {
  all: 'All', following: 'Following', postLook: 'Post My Look', empty: 'No posts yet.', firstLook: 'Share the first look!', login: 'Sign in is required. Go to the sign-in page?', deletePost: 'Delete this post?', deleteFailed: 'Could not delete the post.', delete: 'Delete', like: 'Like', unlike: 'Unlike', shop: 'SHOP', avatar: 'Profile photo', close: 'Close',
  photos: 'Photos (up to 5)', selected: 'photos selected', caption: 'Describe this look...', tags: 'Product tags (optional)', posting: 'Posting...', post: 'Post', maxImages: 'You can upload up to 5 photos.', imageType: 'Only jpg/png/webp images are supported.', imageSize: 'Each photo must be 5MB or smaller.', imageRequired: 'Select at least one photo.', postFailed: 'Could not publish the post.', network: 'A network error occurred.',
  search: 'Search products (brand or name)', searchEmpty: 'No results. Try another product name or brand.', recent: 'Recently purchased products', allProducts: 'All products', maxTags: 'You can tag up to 5 products.', unselect: 'Unselect',
  collapse: 'Collapse comments', expand: 'Expand comments', commentsLoading: 'Loading comments...', firstComment: 'Leave the first comment.', previous: 'Load earlier comments', loading: 'Loading...', retry: 'Try again', content: 'Comment content', commentPlaceholder: 'Leave a comment', submitting: 'Posting comment', submit: 'Post comment', register: 'Post', deleteComment: 'Delete this comment?', loadFailed: 'Could not load comments.', commentFailed: 'Could not post the comment.', removeFailed: 'Could not delete the comment.', generalError: 'Could not complete the request. Please try again.',
} as const;
type Messages = { readonly [K in keyof typeof en]: string };
export const socialMessages = { en, ko: {
  all: '전체', following: '팔로잉', postLook: '내 룩 올리기', empty: '아직 게시물이 없어요.', firstLook: '첫 룩을 올려보세요!', login: '로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?', deletePost: '이 게시물을 삭제하시겠습니까?', deleteFailed: '삭제에 실패했습니다.', delete: '삭제', like: '좋아요', unlike: '좋아요 취소', shop: '상품 보기', avatar: '프로필 사진', close: '닫기',
  photos: '사진 (최대 5장)', selected: '장 선택됨', caption: '이 착장을 설명해보세요...', tags: '상품 태그 (선택)', posting: '게시 중...', post: '게시하기', maxImages: '사진은 최대 5장까지 올릴 수 있어요.', imageType: 'jpg/png/webp 이미지만 올릴 수 있어요.', imageSize: '각 사진은 5MB 이하여야 해요.', imageRequired: '사진을 최소 1장 선택해주세요.', postFailed: '게시에 실패했어요.', network: '네트워크 오류가 발생했어요.',
  search: '상품 검색 (브랜드·이름)', searchEmpty: '검색 결과가 없어요. 다른 상품명이나 브랜드로 검색해보세요.', recent: '최근 구매한 상품', allProducts: '전체 상품', maxTags: '상품은 최대 5개까지 태그할 수 있어요.', unselect: '선택 해제',
  collapse: '댓글 접기', expand: '댓글 펼치기', commentsLoading: '댓글을 불러오는 중...', firstComment: '첫 댓글을 남겨보세요.', previous: '이전 댓글 불러오기', loading: '불러오는 중...', retry: '다시 시도', content: '댓글 내용', commentPlaceholder: '댓글을 남겨보세요', submitting: '댓글 작성 중', submit: '댓글 작성', register: '등록', deleteComment: '이 댓글을 삭제하시겠습니까?', loadFailed: '댓글을 불러오지 못했어요.', commentFailed: '댓글을 등록하지 못했어요.', removeFailed: '댓글을 삭제하지 못했어요.', generalError: '요청을 처리하지 못했습니다. 다시 시도해주세요.',
} } as const satisfies Record<Locale, Messages>;
export function socialError(error: string, locale: Locale): string {
  const entries = Object.entries(socialMessages.en);
  const known = entries.find(([key, value]) => value === error || Reflect.get(socialMessages.ko, key) === error);
  return known ? String(Reflect.get(socialMessages[locale], known[0])) : socialMessages[locale].generalError;
}
