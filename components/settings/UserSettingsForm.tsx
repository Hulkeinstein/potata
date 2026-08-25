"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/types";
import { PREFERRED_SIZES, type UserSettingsData } from "@/lib/user-settings";

export function UserSettingsForm() {
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [status, setStatus] = useState("설정을 불러오는 중입니다.");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/users/me/settings");
        const payload: ApiResponse<UserSettingsData> = await response.json();
        if (!active) return;
        if (!response.ok || !payload.success || !payload.data) {
          setStatus(payload.error ?? "설정을 불러오지 못했습니다.");
          return;
        }
        setSettings(payload.data);
        setStatus("");
      } catch (error) {
        if (!active) return;
        setStatus(error instanceof Error ? "설정을 불러오지 못했습니다." : "알 수 없는 오류가 발생했습니다.");
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const save = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setStatus("저장 중입니다.");
    try {
      const response = await fetch("/api/users/me/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload: ApiResponse<UserSettingsData> = await response.json();
      if (response.ok && payload.success && payload.data) {
        setSettings(payload.data);
        setStatus("설정을 저장했습니다.");
      } else {
        setStatus(payload.error ?? "설정을 저장하지 못했습니다.");
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setStatus("설정을 저장하지 못했습니다.");
    }
    setSaving(false);
  };

  if (!settings) return <p role="status" className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-sm text-zinc-400">{status}</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-bold">쇼핑 사이즈</h2>
        <p className="mt-1 text-sm text-zinc-400">상품에 같은 사이즈가 있으면 선택을 도와드립니다.</p>
        <label className="mt-4 block text-sm font-medium" htmlFor="preferred-size">선호 사이즈</label>
        <select id="preferred-size" value={settings.preferredSize ?? ""} onChange={(event) => setSettings({ ...settings, preferredSize: event.target.value || null })} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-black px-3">
          <option value="">선택 안 함</option>
          {PREFERRED_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </section>
      <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-bold">AI Coordinator</h2><p className="mt-1 text-sm text-zinc-400">홈에서 AI 코디 안내 팝업을 표시합니다.</p></div>
          <input aria-label="AI Coordinator 표시" type="checkbox" checked={settings.aiCoordinatorEnabled} onChange={(event) => setSettings({ ...settings, aiCoordinatorEnabled: event.target.checked })} className="mt-1 h-5 w-5 accent-lime-300" />
        </div>
      </section>
      <button type="button" onClick={save} disabled={saving} className="h-12 w-full rounded-xl bg-brand-neon font-bold text-black disabled:opacity-50">{saving ? "저장 중..." : "설정 저장"}</button>
      <p role="status" className="min-h-5 text-center text-sm text-zinc-400">{status}</p>
    </div>
  );
}
