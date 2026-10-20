"use client";

import { useCallback, useSyncExternalStore } from "react";
import { catalogViewsStorageKey, parseSavedCatalogViews, removeCatalogView, saveCatalogView } from "@/lib/admin-catalog-saved-views";
import type { CatalogViewsResult } from "@/lib/admin-catalog-saved-views";

const changedEvent = "potata:catalog-views-changed";
const unavailable = { ok: false, error: "관리자 계정의 브라우저 저장소를 사용할 수 없습니다." } as const;

export function useCatalogSavedViews(scope: string | undefined) {
  const key = scope ? catalogViewsStorageKey(scope) : null;
  const subscribe = useCallback((notify: () => void) => {
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) notify(); };
    window.addEventListener("storage", storage);
    window.addEventListener(changedEvent, notify);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(changedEvent, notify); };
  }, [key]);
  const snapshot = useCallback(() => {
    if (!key) return null;
    try { return window.localStorage.getItem(key); }
    catch (error) { if (error instanceof Error) return "storage-unavailable"; throw error; }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const result = parseSavedCatalogViews(raw);
  function mutate(run: (storage: Storage, owner: string) => CatalogViewsResult): CatalogViewsResult {
    if (!scope) return unavailable;
    let next: CatalogViewsResult;
    try {
      next = run(window.localStorage, scope);
    } catch (error) { if (error instanceof Error) return { ok: false, error: "브라우저 저장소를 사용할 수 없습니다. 설정을 확인해 주세요." }; throw error; }
    if (next.ok) window.dispatchEvent(new Event(changedEvent));
    return next;
  }
  return { result, save: (name: string, query: string) => mutate((storage, owner) => saveCatalogView(storage, owner, name, query, crypto.randomUUID())), remove: (id: string) => mutate((storage, owner) => removeCatalogView(storage, owner, id)) };
}
