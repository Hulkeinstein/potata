import type { Locale } from './locale';

const en = {
  color: 'Color', size: 'Size', sizeGuide: 'Size Guide', soldOut: 'Sold Out', outOfStock: 'Out of Stock',
  decrease: 'Decrease quantity', increase: 'Increase quantity', addToCart: 'Add to Cart', copyLink: 'Copy product link',
  selectSize: 'Please select a size.', manualUnavailable: 'This option has been marked sold out.', unavailable: 'This option is out of stock.',
  stockRemaining: 'Current stock: {count}.', cartAdded: 'Added {count} item(s) to your cart.',
  copyUnsupported: 'This browser does not support copying links.', copied: 'Product link copied.', copyFailed: 'Could not copy the link.',
  garment: 'Garment measurements', body: 'Recommended body measurements', closeGuide: 'Close size guide', units: 'Measurement unit', unit: 'Unit',
} as const;
type ProductActionMessages = { readonly [Key in keyof typeof en]: string };
export const productActionMessages = {
  en,
  ko: {
    color: '색상', size: '사이즈', sizeGuide: '사이즈 안내', soldOut: '품절', outOfStock: '재고 없음',
    decrease: '수량 줄이기', increase: '수량 늘리기', addToCart: '장바구니 담기', copyLink: '상품 링크 복사',
    selectSize: '사이즈를 선택해 주세요.', manualUnavailable: '관리자가 품절 처리한 옵션입니다.', unavailable: '품절된 옵션입니다.',
    stockRemaining: '현재 재고는 {count}개입니다.', cartAdded: '{count}개를 장바구니에 담았습니다.',
    copyUnsupported: '이 브라우저에서는 링크 복사를 지원하지 않습니다.', copied: '상품 링크를 복사했습니다.', copyFailed: '링크를 복사하지 못했습니다.',
    garment: '상품 실측', body: '신체 권장 치수', closeGuide: '사이즈 안내 닫기', units: '치수 단위', unit: '단위',
  },
} as const satisfies Record<Locale, ProductActionMessages>;

export type PurchaseFeedbackKey = 'selectSize' | 'manualUnavailable' | 'unavailable' | 'stockRemaining' | 'cartAdded' | 'copyUnsupported' | 'copied' | 'copyFailed';
