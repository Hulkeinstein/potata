'use client';
import { useEffect, useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const ROUTES = new Set(['/', '/shop', '/brands', '/ranking', '/for-you', '/liked', '/search', '/try-on', '/what-to-wear']);
export function isCatalogRoute(pathname: string | null): boolean {
  return pathname !== null && (ROUTES.has(pathname) || /^\/product\/[^/]+$/.test(pathname));
}
function hasDraft(): boolean {
  return [...document.querySelectorAll('form,[data-catalog-refresh-blocked="true"]')].some(element =>
    !element.closest('[hidden],[inert],[aria-hidden="true"],dialog:not([open])') && element.getClientRects().length > 0 && window.getComputedStyle(element).visibility !== 'hidden');
}
export function CatalogRefresh() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => {
    if (!isCatalogRoute(pathname)) return;
    let lastAttempt = Date.now();
    let stopped = false;
    let request: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const attempt = async () => {
      if (stopped || request || pendingRef.current || Date.now() - lastAttempt < 60_000 || document.visibilityState !== 'visible' || !navigator.onLine || hasDraft()) return;
      lastAttempt = Date.now();
      request = new AbortController();
      timeout = setTimeout(() => request?.abort(), 10_000);
      try {
        const response = await fetch('/api/health', { cache: 'no-store', signal: request.signal });
        if (!response.ok) return;
        const health: unknown = await response.json();
        if (typeof health !== 'object' || health === null || !('ok' in health) || health.ok !== true || !('db' in health) || health.db !== 'ok') return;
        if (!stopped && document.visibilityState === 'visible' && navigator.onLine && !hasDraft()) startTransition(() => router.refresh());
      } catch (error) {
        if (!(error instanceof TypeError || error instanceof DOMException || error instanceof SyntaxError)) throw error;
      } finally {
        if (timeout) clearTimeout(timeout);
        timeout = null; request = null;
      }
    };
    const trigger = () => { void attempt(); };
    const interval = setInterval(trigger, 60_000);
    document.addEventListener('visibilitychange', trigger);
    window.addEventListener('online', trigger);
    window.addEventListener('focus', trigger);
    return () => {
      stopped = true; clearInterval(interval);
      if (timeout) clearTimeout(timeout);
      request?.abort();
      document.removeEventListener('visibilitychange', trigger);
      window.removeEventListener('online', trigger);
      window.removeEventListener('focus', trigger);
    };
  }, [pathname, router, startTransition]);
  return null;
}
