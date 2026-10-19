'use client';
import { useEffect, useRef } from 'react';

export function useImmersiveDialog(lockBackground = true) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    if (lockBackground) document.body.style.overflow = 'hidden';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return () => {
      if (lockBackground) document.body.style.overflow = overflow;
      if (typeof dialog.close === 'function') dialog.close();
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    };
  }, [lockBackground]);
  return ref;
}
