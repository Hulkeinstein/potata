'use client';
import { useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

export function usePreferredProductSize(productId: string, userId: string | undefined, status: string, sizes: readonly string[], userChoice: RefObject<boolean>, onSize: Dispatch<SetStateAction<string | null>>) {
  const latestSizes = useRef(sizes);
  useEffect(() => { latestSizes.current = sizes; }, [sizes]);
  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch('/api/users/me/settings', { signal: controller.signal });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (typeof payload !== 'object' || payload === null || !('success' in payload) || payload.success !== true || !('data' in payload) || typeof payload.data !== 'object' || payload.data === null || !('preferredSize' in payload.data)) return;
        const preferred = payload.data.preferredSize;
        if (active && !userChoice.current && typeof preferred === 'string' && latestSizes.current.includes(preferred)) onSize(preferred);
      } catch (error) {
        if (!(error instanceof TypeError || error instanceof SyntaxError || error instanceof DOMException)) throw error;
      }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [status, productId, userId, userChoice, onSize]);
}
