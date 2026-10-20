'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Footer } from '@/components/ui/Footer';
import { LanguageSelect } from '@/components/ui/LanguageSelect';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { feedMessages } from '@/lib/i18n/feed-messages';
import { categoryLabel } from '@/lib/i18n/discovery-messages';
import type { ProductCategory } from '@/types';
import { categories, parseCategory } from './discovery-state';
import { ImmersiveProduct } from './ImmersiveProduct';
import { ImmersiveBrand } from './ImmersiveBrand';
import type { DiscoveryFeedItem } from './discovery-feed';
import { useImmersiveDialog } from './use-immersive-dialog';

type Props = {
  readonly items: readonly DiscoveryFeedItem[]; readonly index: number; readonly category: ProductCategory;
  readonly photos: Readonly<Record<string, number>>; readonly onPhoto: (id: string, photo: number) => void;
  readonly onIndex: (index: number) => void; readonly onCategory: (category: ProductCategory) => void;
  readonly onClose: () => void;
  readonly onDismiss: (brand: string) => void;
};
function FooterPanel({ onClose }: { readonly onClose: () => void }) {
  const ref = useImmersiveDialog(false);
  const { locale } = useLanguage();
  return <dialog ref={ref} aria-label={feedMessages[locale].footer} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(90vw,48rem)] overflow-y-auto border border-white/20 bg-black text-white backdrop:bg-black/80">
    <button type="button" onClick={onClose} className="sticky top-0 ml-auto block min-h-11 bg-black px-5">{feedMessages[locale].close} ×</button><Footer />
  </dialog>;
}
export function ImmersiveFeed({ items: incoming, index, category, photos, onPhoto, onIndex, onCategory, onClose, onDismiss }: Props) {
  const { locale } = useLanguage();
  const t = feedMessages[locale];
  const dialog = useImmersiveDialog();
  const track = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLElement>(null);
  const active = useRef(index);
  const [end, setEnd] = useState(false);
  const [endIds, setEndIds] = useState<readonly string[] | null>(null);
  const items = endIds ? incoming.filter(item => endIds.includes(item.id)) : incoming;
  const pending = endIds ? incoming.filter(item => !endIds.includes(item.id)) : [];
  const [footer, setFooter] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initial = useRef(index);
  const hasBrands = items.some(item => item.kind === 'brand');
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    element.scrollTop = initial.current * element.clientHeight;
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { element.scrollTop = active.current * element.clientHeight; });
    resize?.observe(element);
    return () => { resize?.disconnect(); if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => { active.current = end ? items.length : index; }, [index, end, items.length]);
  const itemKeys = items.map(item => item.id).join('\u0000');
  useEffect(() => {
    const element = track.current;
    if (element) element.scrollTop = active.current * element.clientHeight;
    if (timer.current) clearTimeout(timer.current);
  }, [itemKeys]);
  useEffect(() => {
    const element = controls.current;
    const modal = dialog.current;
    if (!element || !modal) return;
    const measure = () => modal.style.setProperty('--feed-controls-height', `${element.getBoundingClientRect().height}px`);
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(element);
    return () => resize?.disconnect();
  }, [dialog]);
  const move = (next: number) => {
    const bounded = Math.max(0, Math.min(next, items.length));
    active.current = bounded;
    setEnd(bounded === items.length);
    setEndIds(bounded === items.length ? items.map(item => item.id) : null);
    if (bounded < items.length) onIndex(bounded);
    const element = track.current;
    if (element) {
      const top = bounded * element.clientHeight;
      if (typeof element.scrollTo === 'function') element.scrollTo({ top, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      else element.scrollTop = top;
    }
  };
  return createPortal(<dialog ref={dialog} aria-label={t.immersive} onCancel={event => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-black p-0 text-white backdrop:bg-black" onKeyDown={event => {
    if (event.target instanceof HTMLElement && event.target.closest('button,a,input,select,textarea')) return;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); move(active.current + 1); }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); move(active.current - 1); }
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !end) {
      const item = items[index];
      if (item?.kind !== 'product') return;
      const product = item.product;
      event.preventDefault();
      const count = new Set([product.imageUrl, ...(product.images ?? [])].filter(Boolean)).size;
      onPhoto(product.id, Math.min(Math.max((photos[product.id] ?? 0) + (event.key === 'ArrowRight' ? 1 : -1), 0), Math.max(count - 1, 0)));
    }
  }}>
    <header className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-black/90 to-transparent px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-white/30 bg-black/60 px-4 text-sm">← {t.grid}</button>
      <select aria-label={t.category} value={category} onChange={event => onCategory(parseCategory(event.target.value))} className="min-h-11 max-w-40 rounded-full border border-white/30 bg-black/80 px-3 text-sm">{categories.map(item => <option value={item} key={item}>{categoryLabel(item, locale)}</option>)}</select>
    </header>
    <div ref={track} tabIndex={0} aria-label={t.hint} data-feed-track className="mx-auto h-full w-full max-w-[640px] snap-y snap-mandatory overflow-y-auto overscroll-y-contain outline-none [scrollbar-width:none]" onScroll={event => {
      const element = event.currentTarget;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (!element.clientHeight) return;
        const next = Math.max(0, Math.min(items.length, Math.round(element.scrollTop / element.clientHeight)));
        active.current = next; setEnd(next === items.length);
        setEndIds(next === items.length ? items.map(item => item.id) : null);
        if (next < items.length) onIndex(next);
      }, 100);
    }}>
      {items.map((item, position) => { switch (item.kind) {
        case 'product': return <ImmersiveProduct key={item.id} product={item.product} photo={photos[item.product.id] ?? 0} active={!end && index === position} load={Math.abs(index - position) <= 1} onPhoto={photo => onPhoto(item.product.id, photo)} />;
        case 'brand': return <ImmersiveBrand key={item.id} item={item} active={!end && index === position} load={Math.abs(index - position) <= 1} onDismiss={() => { onDismiss(item.brand); track.current?.focus({ preventScroll: true }); }} />;
        default: { const unreachable: never = item; return unreachable; }
      } })}
      <section data-feed-slide="end" aria-hidden={!end && items.length > 0} inert={!end && items.length > 0} className="flex h-full w-full snap-start snap-always flex-col items-center justify-center gap-6 px-6 text-center">
        <h2 className="text-2xl font-bold">{items.length ? t.end : t.empty}</h2>
        {pending.length > 0 && <button type="button" onClick={() => {
          const next = incoming.findIndex(item => item.id === pending[0]?.id);
          setEndIds(null); setEnd(false); active.current = next; onIndex(next);
        }} className="min-h-11 rounded-full bg-brand-neon px-6 text-black">{t.continueNew}</button>}
        {items.length > 0 && <button type="button" onClick={() => move(0)} className="min-h-11 rounded-full border border-white/30 px-6">{t.restart}</button>}
        <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-white px-6 text-black">{t.grid}</button>
      </section>
    </div>
    <nav ref={controls} aria-label={t.view} className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 bg-black/85 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <LanguageSelect />
      <button type="button" onClick={() => setFooter(true)} className="min-h-11 text-xs underline">{t.footer}</button>
      <div className="flex items-center gap-2 text-xs"><button type="button" aria-label={hasBrands ? t.previousItem : t.previous} disabled={!end && index === 0} onClick={() => move(active.current - 1)} className="min-h-11 min-w-11 disabled:opacity-30">↑</button><span role="status">{items.length ? `${end ? items.length : index + 1} / ${items.length}` : '0 / 0'}</span><button type="button" aria-label={hasBrands ? t.nextItem : t.next} disabled={end || items.length === 0} onClick={() => move(active.current + 1)} className="min-h-11 min-w-11 disabled:opacity-30">↓</button></div>
    </nav>
    {footer && <FooterPanel onClose={() => setFooter(false)} />}
  </dialog>, document.body);
}
