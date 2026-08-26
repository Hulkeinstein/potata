"use client";

import { useState } from "react";
import Image from "next/image";

type AdminInventoryProductThumbnailProps = {
  readonly imageUrl: string;
  readonly productName: string;
};

export function AdminInventoryProductThumbnail({ imageUrl, productName }: AdminInventoryProductThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div aria-label={`${productName} 이미지 없음`} className="flex h-[72px] w-16 shrink-0 items-center justify-center rounded bg-zinc-800 px-1 text-center text-xs text-zinc-400">이미지 없음</div>;
  }

  return <Image src={imageUrl} alt={`${productName} 상품 이미지`} width={64} height={72} unoptimized onError={() => setFailed(true)} className="h-[72px] w-16 shrink-0 rounded object-cover" />;
}
