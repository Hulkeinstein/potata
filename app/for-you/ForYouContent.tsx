'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/ui/ProductCard';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { categoryLabel } from '@/lib/i18n/discovery-messages';
import { feedMessages } from '@/lib/i18n/feed-messages';
import type { Product } from '@/types';
import { categories, parseCategory, parseDiscovery, storageRead, storageWrite } from './discovery-state';
import type { ViewMode } from './discovery-state';
import { ImmersiveFeed } from './ImmersiveFeed';
import { createCatalogSession, refreshCatalogSession, survivingAnchor } from './catalog-session';

const subscribe = () => () => undefined;
export function ForYouContent({ products }: { readonly products: readonly Product[] }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const { locale } = useLanguage();
  return hydrated ? <DiscoveryContent products={products} /> : <main className="min-h-screen bg-black pt-24 text-zinc-400" aria-busy="true">{feedMessages[locale].loading}</main>;
}
function DiscoveryContent({ products }: { readonly products: readonly Product[] }) {
  const { locale } = useLanguage();
  const t = feedMessages[locale];
  const [mode, setMode] = useState<ViewMode>(() => storageRead('localStorage', 'potata-discovery-view') === 'immersive' ? 'immersive' : 'grid');
  const [state, setState] = useState(() => parseDiscovery(storageRead('sessionStorage', 'potata-discovery-position')));
  const [photos, setPhotos] = useState<Readonly<Record<string, number>>>(() => state.photos ?? (state.productId ? { [state.productId]: state.photo } : {}));
  const [dismissed, setDismissed] = useState<readonly string[]>(() => state.dismissedBrands ?? []);
  const cards = useRef(new Map<string, HTMLDivElement>());
  const restoreGrid = useRef(true);
  const [session, setSession] = useState(() => ({ source: products, category: state.category, dismissed, ...createCatalogSession(products.filter(product => state.category === 'All' || product.category === state.category), dismissed) }));
  if (session.source !== products || session.category !== state.category || session.dismissed !== dismissed) {
    const incoming = products.filter(product => state.category === 'All' || product.category === state.category);
    const next = session.category === state.category ? refreshCatalogSession(session, incoming, dismissed) : createCatalogSession(incoming, dismissed);
    setSession({ source: products, category: state.category, dismissed, ...next });
    if (session.category === state.category) {
      const feedId = survivingAnchor(session.items, next.items, state.feedId ?? (state.productId ? `product:${state.productId}` : undefined));
      const selected = next.items.find(item => item.id === feedId);
      if (selected && selected.id !== state.feedId) setState(previous => ({ ...previous, feedId, productId: selected.kind === 'product' ? selected.product.id : previous.productId }));
    }
  }
  const visible = session.products;
  const index = Math.max(0, visible.findIndex(product => product.id === state.productId));
  const items = session.items;
  const savedIndex = items.findIndex(item => item.id === state.feedId);
  const fallbackProduct = state.feedId?.startsWith('brand:') ? visible[index + 1] ?? visible[index] : visible[index];
  const feedIndex = savedIndex >= 0 ? savedIndex : Math.max(0, items.findIndex(item => item.kind === 'product' && item.product.id === fallbackProduct?.id));
  const feedItem = items[feedIndex];
  const current = mode === 'immersive' && feedItem?.kind === 'product' ? feedItem.product : visible[index];

  useEffect(() => {
    storageWrite('localStorage', 'potata-discovery-view', mode);
    storageWrite('sessionStorage', 'potata-discovery-position', JSON.stringify({ ...state, feedId: feedItem?.id, dismissedBrands: dismissed, photos, photo: current ? photos[current.id] ?? 0 : 0, productId: current?.id ?? null }));
    if (mode === 'grid' && restoreGrid.current && current) {
      cards.current.get(current.id)?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      restoreGrid.current = false;
    }
  }, [mode, state, current, photos, dismissed, feedItem?.id]);
  useEffect(() => {
    if (mode !== 'grid' || typeof IntersectionObserver === 'undefined') return;
    const intersecting = new Map<string, number>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { const id = entry.target.getAttribute('data-product-id'); if (id) { if (entry.isIntersecting) intersecting.set(id, entry.intersectionRatio); else intersecting.delete(id); } });
      const id = [...intersecting].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (id) setState(previous => previous.productId && intersecting.has(previous.productId) ? previous : { ...previous, productId: id, feedId: `product:${id}`, photo: 0 });
    }, { threshold: 0.6, rootMargin: '-100px 0px -25% 0px' });
    cards.current.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [mode, state.category, visible]);
  const switchMode = (next: ViewMode) => { restoreGrid.current = next === 'grid'; if (next === 'grid' && current) setState(previous => previous.productId === current.id && previous.feedId === feedItem?.id ? previous : { ...previous, productId: current.id, feedId: feedItem?.id }); setMode(next); };
  const rememberProduct = (id: string) => setState(previous => previous.productId === id && previous.feedId === `product:${id}` ? previous : { ...previous, productId: id, feedId: `product:${id}` });
  return (
    <main className="min-h-screen bg-black pb-16 pt-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mb-8"><p className="mb-3 text-xs uppercase tracking-[0.3em] text-brand-neon">FOR YOU / DISCOVER</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">{t.note}</p></header>
        <div className="sticky top-16 z-20 mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-white/10 bg-black/95 py-3 backdrop-blur">
          <div role="group" aria-label={t.view} className="flex gap-1 rounded-full border border-white/20 p-1">
            {(['grid', 'immersive'] as const).map(view => <button type="button" key={view} onClick={() => switchMode(view)} aria-pressed={mode === view} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${mode === view ? 'bg-white text-black' : 'text-zinc-400'}`}>{t[view]}</button>)}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">{t.category}<select aria-label={t.category} value={state.category} onChange={event => setState({ category: parseCategory(event.target.value), productId: null, photo: 0 })} className="min-h-11 rounded-lg border border-white/20 bg-zinc-950 px-3 text-white">{categories.map(category => <option key={category} value={category}>{categoryLabel(category, locale)}</option>)}</select></label>
          <a href="#discovery-footer" className="text-xs text-zinc-400 underline underline-offset-4">{t.footer} ↓</a>
        </div>
        {!current ? <p className="py-16 text-center text-zinc-400">{t.empty}</p> : <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 lg:grid-cols-5">{visible.map(product => <div key={product.id} data-product-id={product.id} data-current={current.id === product.id} ref={element => { if (element) cards.current.set(product.id, element); else cards.current.delete(product.id); }} onFocusCapture={() => rememberProduct(product.id)} onClickCapture={() => rememberProduct(product.id)}><ProductCard product={product} /></div>)}</div>}
        {mode === 'immersive' && <ImmersiveFeed key={state.category} items={items} index={feedIndex} category={state.category} photos={photos} onPhoto={(id, photo) => setPhotos(previous => previous[id] === photo ? previous : { ...previous, [id]: photo })} onIndex={next => { const item = items[next]; if (item) setState(previous => previous.feedId === item.id ? previous : { ...previous, feedId: item.id, productId: item.kind === 'product' ? item.product.id : previous.productId }); }} onDismiss={brand => { const next = items[feedIndex + 1] ?? items[feedIndex - 1]; setDismissed(previous => [...previous, brand]); setState(previous => ({ ...previous, feedId: next?.id, productId: next?.kind === 'product' ? next.product.id : previous.productId })); }} onCategory={category => setState(previous => ({ ...previous, category, productId: null, feedId: undefined }))} onClose={() => switchMode('grid')} />}
        <div id="discovery-footer" className="mt-12 scroll-mt-28 border-t border-white/10 pt-6"><Link href="/shop" className="text-sm text-zinc-400 underline underline-offset-4">{t.shop} →</Link></div>
      </div>
    </main>
  );
}
