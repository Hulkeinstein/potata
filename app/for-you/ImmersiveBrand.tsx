'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { feedMessages } from '@/lib/i18n/feed-messages';
import { formatPrice } from '@/lib/utils';
import type { BrandFeedItem } from './discovery-feed';

export function ImmersiveBrand({ item, active, load, onDismiss }: {
  readonly item: BrandFeedItem; readonly active: boolean; readonly load: boolean; readonly onDismiss: () => void;
}) {
  const { locale } = useLanguage();
  const t = feedMessages[locale];
  const [failed, setFailed] = useState<readonly string[]>([]);
  return <article data-feed-slide={item.id} data-brand-card={item.brand} aria-hidden={!active} inert={!active} className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-zinc-950">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#283322,transparent_65%)]" />
    <div className="absolute inset-x-5 bottom-[calc(var(--feed-controls-height,9rem)+1rem)] top-24 flex min-h-0 flex-col gap-4 overflow-y-auto sm:inset-x-8">
      <div><p className="text-xs uppercase tracking-[0.25em] text-brand-neon">{t.discoverBrand}</p><h2 className="mt-2 break-words text-3xl font-bold sm:text-4xl">{item.brand}</h2><p className="mt-2 max-w-md text-sm text-zinc-300">{t.brandNote}</p></div>
      <div className="grid min-h-0 grid-cols-2 gap-3 sm:grid-cols-3">
        {item.products.map((product, index) => <Link key={product.id} href={`/product/${product.id}`} className={`min-w-0 ${index === 2 ? 'hidden sm:block' : ''}`}>
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
            {load && !failed.includes(product.id) ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 640px) 45vw, 180px" className="object-contain" onError={() => setFailed(previous => [...previous, product.id])} /> : <span className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">{load ? t.unavailable : ''}</span>}
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-zinc-200">{product.name}</p><p className="mt-1 text-sm font-semibold">{formatPrice(product.price)}</p>
        </Link>)}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={`/search?q=${encodeURIComponent(item.brand)}`} className="flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-black">{t.brandSearch}</Link>
        <button type="button" onClick={onDismiss} className="min-h-11 rounded-full border border-white/25 px-4 text-sm text-zinc-300">{t.notInterested}</button>
      </div>
    </div>
  </article>;
}
