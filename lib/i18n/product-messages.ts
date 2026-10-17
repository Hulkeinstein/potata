import type { Locale } from './locale';

const messages = {
  en: { detail: 'Detail', reviews: 'Reviews', qa: 'Q&A', tags: 'Tags', heading: 'Product Detail', empty: 'No description available.', englishSource: 'English original — Korean translation unavailable.', koreanSource: 'Korean original — English translation unavailable.', legacySource: 'Original description — language not specified.' },
  ko: { detail: '상세 정보', reviews: '리뷰', qa: '상품 문의', tags: '태그', heading: '상품 상세', empty: '등록된 상품 설명이 없습니다.', englishSource: '영어 원문 — 한국어 번역이 아직 없습니다.', koreanSource: '한국어 원문 — 영어 번역이 아직 없습니다.', legacySource: '기존 원문 — 언어가 지정되지 않았습니다.' },
} as const;
export function getProductMessages(locale: Locale) { return messages[locale]; }
