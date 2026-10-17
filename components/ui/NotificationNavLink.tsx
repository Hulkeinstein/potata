"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { NOTIFICATIONS_READ_EVENT } from "@/lib/notification-events";
import { useLanguage } from '@/components/providers/LanguageProvider';
import { sharedMessages } from '@/lib/i18n/shared-messages';

function getUnreadCount(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("success" in value) || value.success !== true || !("data" in value)) return null;
  const data = value.data;
  if (!data || typeof data !== "object" || !("unreadCount" in data) || typeof data.unreadCount !== "number") return null;
  return data.unreadCount;
}

export function NotificationNavLink() {
  const { locale } = useLanguage();
  const text = sharedMessages[locale];
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const markRead = () => setUnreadCount(0);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, markRead);

    void fetch("/api/notifications", { signal: controller.signal })
      .then((response) => response.json())
      .then((json: unknown) => {
        const count = getUnreadCount(json);
        if (count !== null) setUnreadCount(count);
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, markRead);
    };
  }, []);

  const label = unreadCount > 0 ? `${text.notifications}, ${text.unread} ${unreadCount}${locale === 'ko' ? '개' : ''}` : text.notifications;

  return (
    <Link href="/notifications" aria-label={label} className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-brand-neon px-1 text-center text-[10px] font-black leading-4 text-black shadow-[0_0_8px_rgba(204,243,129,0.55)]">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </Link>
  );
}
