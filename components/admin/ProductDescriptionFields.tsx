'use client';

import { MAX_DESCRIPTION_LENGTH } from '@/lib/product-description';

type Props = {
  readonly korean: string;
  readonly english: string;
  readonly onKoreanChange: (value: string) => void;
  readonly onEnglishChange: (value: string) => void;
};
export function ProductDescriptionFields({ korean, english, onKoreanChange, onEnglishChange }: Props) {
  return <fieldset className="space-y-3">
    <legend className="text-sm font-medium text-zinc-300">언어별 상품 설명</legend>
    <p className="text-xs text-zinc-400">고객이 선택한 언어로 표시됩니다. 비어 있으면 다른 언어 또는 기존 원문을 표시합니다.</p>
    <label className="block text-sm">한국어 설명<textarea lang="ko" rows={4} maxLength={MAX_DESCRIPTION_LENGTH} value={korean} onChange={(event) => onKoreanChange(event.target.value)} className="mt-1 w-full rounded border border-white/10 bg-zinc-900 p-3 text-white" /></label>
    <label className="block text-sm">영어 설명<textarea lang="en" rows={4} maxLength={MAX_DESCRIPTION_LENGTH} value={english} onChange={(event) => onEnglishChange(event.target.value)} className="mt-1 w-full rounded border border-white/10 bg-zinc-900 p-3 text-white" /></label>
  </fieldset>;
}
