import type { Locale } from './locale';
const en = {
  studio: 'AI STUDIO V1.0', error: 'Error', processingFailed: 'Image processing failed.', productMissing: 'Could not find the selected product.', requestFailed: 'Could not generate the try-on. Please try again.', network: 'Could not connect to the server. Please try again.', generated: 'Generated Fit', tryAnother: 'Try Another', uploaded: 'User Upload', upload: 'Upload Full Body Photo', change: 'Change Photo', photoHint: 'Recommended: Well lit, simple background', generating: 'GENERATING FIT...', wardrobe: 'Wardrobe', gallery: 'Gallery', recents: 'Recents', select: 'Select Item', choose: 'Choose a piece from our collection to try on.', myGallery: 'My Gallery', galleryNote: 'Your generated AI looks.', emptyGallery: 'No generated images yet.', create: 'Start Creating', recentOutfits: 'Recent Outfits', recentNote: 'Items you recently tried on.', emptyRecent: 'No recent items found.', processing: 'Processing...', generate: 'Generate Try-On', viewImage: 'View generated image', deleteImage: 'Delete generated image', loading: 'Loading Studio...',
} as const;
type Messages = { readonly [K in keyof typeof en]: string };
export const studioMessages = { en, ko: {
  studio: 'AI 스튜디오 V1.0', error: '오류', processingFailed: '이미지 처리에 실패했습니다.', productMissing: '선택한 상품 정보를 찾을 수 없습니다.', requestFailed: '가상 착장을 생성하지 못했습니다. 다시 시도해주세요.', network: '서버에 연결하지 못했습니다. 다시 시도해주세요.', generated: '생성된 착장', tryAnother: '다른 착장 시도', uploaded: '업로드한 사진', upload: '전신 사진 업로드', change: '사진 변경', photoHint: '권장: 밝은 조명, 단순한 배경', generating: '착장 생성 중...', wardrobe: '옷장', gallery: '갤러리', recents: '최근 기록', select: '상품 선택', choose: '입어볼 상품을 컬렉션에서 선택하세요.', myGallery: '내 갤러리', galleryNote: 'AI로 생성한 내 착장입니다.', emptyGallery: '아직 생성된 이미지가 없습니다.', create: '만들기 시작', recentOutfits: '최근 착장', recentNote: '최근 입어본 상품입니다.', emptyRecent: '최근 상품이 없습니다.', processing: '처리 중...', generate: '가상 착장 생성', viewImage: '생성 이미지 보기', deleteImage: '생성 이미지 삭제', loading: '스튜디오 불러오는 중...',
} } as const satisfies Record<Locale, Messages>;
export function studioError(error: string, locale: Locale): string {
  const entry = Object.entries(studioMessages.en).find(([key, value]) => value === error || Reflect.get(studioMessages.ko, key) === error);
  return entry ? String(Reflect.get(studioMessages[locale], entry[0])) : studioMessages[locale].requestFailed;
}
