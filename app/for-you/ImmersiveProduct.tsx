'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { HeartButton } from '@/components/common/HeartButton';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { feedMessages } from '@/lib/i18n/feed-messages';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

type Props = {
  readonly product: Product; readonly photo: number; readonly active: boolean; readonly load: boolean;
  readonly onPhoto: (photo: number) => void;
};
export function ImmersiveProduct({ product, photo, active, load, onPhoto }: Props) {
  const { locale } = useLanguage();
  const t = feedMessages[locale];
  const photos = [...new Set([product.imageUrl, ...(product.images ?? [])].filter(Boolean))];
  const currentPhoto = Math.min(photo, Math.max(photos.length - 1, 0));
  const rail = useRef<HTMLDivElement>(null);
  const photoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failed, setFailed] = useState<readonly string[]>([]);
  const [shareStatus, setShareStatus] = useState('');
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const restore = () => { element.scrollLeft = currentPhoto * element.clientWidth; };
    restore();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore);
    resize?.observe(element);
    return () => resize?.disconnect();
  }, [currentPhoto, load]);
  useEffect(() => () => { if (photoTimer.current) clearTimeout(photoTimer.current); }, []);
  const changePhoto = (delta: number) => onPhoto(Math.min(Math.max(currentPhoto + delta, 0), photos.length - 1));
  const share = async () => {
    try {
      if (!navigator.clipboard) { setShareStatus(t.shareUnavailable); return; }
      await navigator.clipboard.writeText(new URL(`/product/${encodeURIComponent(product.id)}`, window.location.origin).href);
      setShareStatus(t.copied);
    } catch (error) { if (error instanceof Error) setShareStatus(t.shareUnavailable); else throw error; }
  };
  return <article data-feed-slide={product.id} aria-hidden={!active} inert={!active} className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-zinc-950">
    <div ref={rail} aria-label={`${product.name} ${t.photo}`} className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [touch-action:pan-x_pan-y_pinch-zoom]" onScroll={event => {
      const element = event.currentTarget;
      if (photoTimer.current) clearTimeout(photoTimer.current);
      photoTimer.current = setTimeout(() => { if (element.clientWidth) onPhoto(Math.round(element.scrollLeft / element.clientWidth)); }, 100);
    }}>
      {photos.map((source, position) => <div key={source} aria-hidden={position !== currentPhoto} className="relative h-full w-full shrink-0 snap-center snap-always">
        {load && !failed.includes(source) ? <Image src={source} alt={`${product.name} — ${t.photo} ${position + 1}`} fill sizes="(max-width: 768px) 100vw, 640px" className="object-contain" onError={() => setFailed(previous => [...previous, source])} /> : <div className="flex h-full items-center justify-center text-zinc-400">{load ? t.unavailable : ''}</div>}
      </div>)}
    </div>
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/35" />
    <div className="absolute bottom-[calc(var(--feed-controls-height,9rem)+5rem)] right-3 flex flex-col gap-3 rounded-full bg-black/60 p-2">
      <HeartButton productId={product.id} />
      <button type="button" onClick={() => void share()} aria-label={t.share} className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-white"><Share2 size={21} /></button>
    </div>
    <div className="absolute inset-x-4 bottom-[calc(var(--feed-controls-height,9rem)+1rem)] max-w-xl pr-16">
      <p className="mb-1 text-xs uppercase tracking-[0.2em] text-brand-neon">{product.brand}</p>
      <h2 className="line-clamp-2 text-xl font-bold sm:text-2xl">{product.name}</h2>
      <p className="mt-2 text-lg font-semibold">{formatPrice(product.price)}{product.inventoryStatus === 'SOLD_OUT' && <span className="ml-3 text-sm text-zinc-300">{t.soldOut}</span>}</p>
      <Link href={`/product/${product.id}`} className="mt-3 inline-block rounded-full bg-white px-5 py-3 text-sm font-bold text-black">{t.details}</Link>
      <span role="status" className="sr-only">{shareStatus}</span>
    </div>
    {photos.length > 1 && <div className="absolute left-4 top-24 flex items-center gap-2 rounded-full bg-black/70 px-1 text-xs">
      <button type="button" aria-label={t.previousPhoto} disabled={currentPhoto === 0} onClick={() => changePhoto(-1)} className="min-h-11 min-w-11 disabled:opacity-30">←</button>
      <span>{currentPhoto + 1} / {photos.length}</span>
      <button type="button" aria-label={t.nextPhoto} disabled={currentPhoto === photos.length - 1} onClick={() => changePhoto(1)} className="min-h-11 min-w-11 disabled:opacity-30">→</button>
    </div>}
  </article>;
}
