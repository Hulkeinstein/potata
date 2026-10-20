import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CatalogRefresh } from './CatalogRefresh';

const state = vi.hoisted(() => ({ path: '/shop', router: { refresh: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => state.router, usePathname: () => state.path }));
beforeEach(() => { vi.useFakeTimers(); state.path = '/shop'; state.router.refresh.mockClear(); vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible'); vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true); vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(() => Object.assign([new DOMRect(0, 0, 10, 10)], { item: (index: number) => index === 0 ? new DOMRect(0, 0, 10, 10) : null })); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, db: 'ok' }) })); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('refreshes a product route once per minute without an initial request', async () => {
  // Given
  render(<CatalogRefresh />);
  expect(state.router.refresh).not.toHaveBeenCalled();
  // When
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // Then
  expect(state.router.refresh).toHaveBeenCalledTimes(1);
});
it('does not refresh protected admin and account routes', () => {
  // Given
  state.path = '/admin/products/new';
  render(<CatalogRefresh />);
  // When
  act(() => { vi.advanceTimersByTime(120_000); });
  // Then
  expect(state.router.refresh).not.toHaveBeenCalled();
});
it('throttles online, focus and visibility events against the same timer', async () => {
  // Given
  render(<CatalogRefresh />);
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // When
  act(() => { window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
  // Then
  expect(state.router.refresh).toHaveBeenCalledTimes(1);
});
it('defers while a form is open and resumes on a later safe cycle', async () => {
  // Given
  const form = document.createElement('form'); document.body.append(form);
  render(<CatalogRefresh />);
  act(() => { vi.advanceTimersByTime(60_000); });
  expect(state.router.refresh).not.toHaveBeenCalled();
  form.remove();
  // When
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // Then
  expect(state.router.refresh).toHaveBeenCalledTimes(1);
});
it('cleans up its interval after unmount', () => {
  // Given
  const view = render(<CatalogRefresh />); view.unmount();
  // When
  act(() => { vi.advanceTimersByTime(120_000); window.dispatchEvent(new Event('online')); });
  // Then
  expect(state.router.refresh).not.toHaveBeenCalled();
});
it('keeps the current page when the existing health endpoint reports failure', async () => {
  // Given
  vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 503 }));
  render(<CatalogRefresh />);
  // When
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // Then
  expect(state.router.refresh).not.toHaveBeenCalled();
});
it('does not request while hidden or offline', async () => {
  // Given
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  render(<CatalogRefresh />);
  // When
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // Then
  expect(fetch).not.toHaveBeenCalled();
});
it('does not request while offline even when visible', async () => {
  // Given
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  render(<CatalogRefresh />);
  // When
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // Then
  expect(fetch).not.toHaveBeenCalled();
});
it('retries a malformed health response only on the next normal cycle', async () => {
  // Given
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{broken'));
  render(<CatalogRefresh />);
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(state.router.refresh).not.toHaveBeenCalled();
  // When
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // Then
  expect(state.router.refresh).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('ignores forms inside closed dialogs', async () => {
  // Given
  const dialog = document.createElement('dialog'); dialog.append(document.createElement('form')); document.body.append(dialog);
  render(<CatalogRefresh />);
  // When
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // Then
  expect(state.router.refresh).toHaveBeenCalledTimes(1);
  dialog.remove();
});
it('aborts an outstanding health request on unmount', async () => {
  // Given
  let captured: AbortSignal | null | undefined;
  vi.mocked(fetch).mockImplementation((_input, init) => { captured = init?.signal; return new Promise(() => {}); });
  const view = render(<CatalogRefresh />);
  await act(async () => { vi.advanceTimersByTime(60_000); });
  // When
  view.unmount();
  // Then
  expect(captured?.aborted).toBe(true);
});
