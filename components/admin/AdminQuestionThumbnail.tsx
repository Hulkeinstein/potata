"use client";

import Image from "next/image";
import { useState } from "react";

type AdminQuestionThumbnailProps = {
  readonly imageUrl: string;
  readonly productName: string;
};

export function AdminQuestionThumbnail({ imageUrl, productName }: AdminQuestionThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div aria-label={`${productName} 이미지 없음`} className="flex h-20 w-16 shrink-0 items-center justify-center rounded bg-zinc-800 px-1 text-center text-xs text-zinc-400">이미지 없음</div>;
  }

  return <Image src={imageUrl} alt={`${productName} 상품 이미지`} width={64} height={80} unoptimized onError={() => setFailed(true)} className="h-20 w-16 shrink-0 rounded object-cover" />;
}
