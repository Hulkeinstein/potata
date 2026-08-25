"use client";

import { useEffect, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { CampaignBrandSelector } from "./CampaignBrandSelector";

type Grant = { readonly id: string; readonly revokedAt: string | Date | null };
type Campaign = { readonly id: string; readonly name: string; readonly ratePercent: number; readonly minOrderAed: number; readonly maxDiscountAed: number; readonly scope: "ALL_PRODUCTS" | "BRANDS"; readonly brands: readonly string[]; readonly active: boolean; readonly _count: { readonly grants: number }; readonly grants: readonly Grant[] };
type ManualGrant = { readonly id: string; readonly sourceKey: string; readonly amount: number; readonly createdAt: string | Date; readonly user: { readonly name: string | null }; readonly reversed: boolean };
export type AdminData = { readonly campaigns: readonly Campaign[]; readonly policies: readonly { readonly id: string; readonly version: number; readonly rateBasisPoints: number; readonly perOrderCap: number; readonly active: boolean }[]; readonly brands: readonly string[]; readonly reauthMethod?: "PASSWORD" | "GOOGLE"; readonly manualGrants?: readonly ManualGrant[] };
type ConfirmAction = { readonly kind: "DEACTIVATE_CAMPAIGN" | "REVOKE_COUPON"; readonly targetId: string; readonly key: string };
type Preview = { readonly count: number; readonly token: string };

const INPUT = "rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-brand-neon focus:outline-none";
const PRIMARY = "rounded-lg bg-brand-neon px-4 py-2 font-bold text-black disabled:opacity-40";
const SECONDARY = "rounded-lg border border-white/20 px-4 py-2 font-semibold text-white";
const newKey = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const formText = (form: FormData, name: string) => String(form.get(name) ?? "");

function isAdminData(value: unknown): value is AdminData {
  return typeof value === "object" && value !== null && "campaigns" in value && Array.isArray(value.campaigns) && "policies" in value && Array.isArray(value.policies) && "brands" in value && Array.isArray(value.brands);
}

export function AdminBenefitsClient({ initialData }: { readonly initialData: AdminData }) {
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [audience, setAudience] = useState<"INDIVIDUAL" | "ALL_VERIFIED_USERS">("INDIVIDUAL");
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialData.campaigns[0]?.id ?? "");
  const [keys, setKeys] = useState(() => ({ campaign: newKey("campaign"), issue: newKey("issue"), point: newKey("point"), reversal: newKey("reversal"), policy: newKey("policy") }));
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [campaignBrands, setCampaignBrands] = useState<readonly string[]>([]);
  const [googleProof, setGoogleProof] = useState<string | null>(null);

  useEffect(() => {
    const proof = new URLSearchParams(window.location.search).get("stepUp");
    if (proof && proof !== "failed") setGoogleProof(proof);
    if (proof === "failed") setMessage("Google 재인증에 실패했습니다. 다시 시도하세요.");
  }, []);

  async function request(body: Readonly<Record<string, unknown>>) {
    const response = await fetch("/api/admin/benefits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload: unknown = await response.json();
    if (!response.ok || typeof payload !== "object" || payload === null || !("success" in payload) || payload.success !== true) throw new Error("요청이 거부되었습니다.");
    return payload;
  }
  async function load() {
    const response = await fetch("/api/admin/benefits"); const payload: unknown = await response.json();
    if (response.ok && typeof payload === "object" && payload !== null && "data" in payload && isAdminData(payload.data)) setData(payload.data);
  }
  async function submit(event: FormEvent<HTMLFormElement>, keyName: keyof typeof keys, build: (form: FormData) => Readonly<Record<string, unknown>>) {
    event.preventDefault(); if (submitting) return; setSubmitting(true); setMessage("");
    try { const payload = build(new FormData(event.currentTarget)); if (data.reauthMethod === "GOOGLE" && !googleProof) throw new Error("먼저 Google 재인증을 완료하세요."); await request({ ...payload, ...(data.reauthMethod === "GOOGLE" ? { reauthProof: googleProof } : {}) }); setGoogleProof(null); setKeys((current) => ({ ...current, [keyName]: newKey(keyName) })); setMessage("저장했습니다."); event.currentTarget.reset(); await load(); }
    catch (error) { if (error instanceof Error) setMessage(error.message); }
    finally { setSubmitting(false); }
  }
  async function confirmMutation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!confirmAction || submitting) return; setSubmitting(true);
    const form = new FormData(event.currentTarget); const targetField = confirmAction.kind === "DEACTIVATE_CAMPAIGN" ? "campaignId" : "grantId";
    try { if (data.reauthMethod === "GOOGLE" && !googleProof) throw new Error("먼저 Google 재인증을 완료하세요."); await request({ action: confirmAction.kind, [targetField]: confirmAction.targetId, reason: formText(form, "reason"), reauthPassword: formText(form, "reauthPassword"), ...(data.reauthMethod === "GOOGLE" ? { reauthProof: googleProof } : {}), idempotencyKey: confirmAction.key }); setGoogleProof(null); setConfirmAction(null); setMessage("처리했습니다."); await load(); }
    catch (error) { if (error instanceof Error) setMessage(error.message); }
    finally { setSubmitting(false); }
  }
  const resetPreview = () => setPreview(null);
  async function beginGoogleStepUp() {
    const response = await fetch("/api/admin/benefits/reauth/google/start", { method: "POST" });
    const payload: unknown = await response.json();
    if (!response.ok || typeof payload !== "object" || payload === null || !("data" in payload) || typeof payload.data !== "object" || payload.data === null || !("token" in payload.data) || typeof payload.data.token !== "string") { setMessage("Google 재인증을 시작할 수 없습니다."); return; }
    await signIn("google", { redirectTo: `${window.location.origin}/api/admin/benefits/reauth/google/complete?token=${encodeURIComponent(payload.data.token)}` }, { prompt: "login", max_age: "0" });
  }

  return <div className="space-y-10">
    <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">Pilot 기록만 관리합니다. checkout·주문 금액·결제에는 연결되지 않습니다.</p>
    {data.reauthMethod === "GOOGLE" && <div className="rounded-xl border border-white/10 p-4"><p className="text-sm text-zinc-300">Google 관리자 작업은 변경 1회마다 새 Google 로그인 확인이 필요합니다.</p><button type="button" onClick={() => void beginGoogleStepUp()} className={`${SECONDARY} mt-3`}>{googleProof ? "Google 재인증 완료" : "Google로 관리자 재인증"}</button></div>}
    {message && <p role="status" className="text-brand-neon">{message}</p>}

    <section className="space-y-4"><h2 className="text-xl font-bold">Coupon Campaign</h2>
      <form className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => void submit(event, "campaign", (form) => ({ action: "CREATE_CAMPAIGN", name: form.get("name"), ratePercent: Number(form.get("rate")), minOrderAed: Number(form.get("minOrder")), maxDiscountAed: Number(form.get("cap")), scope: form.get("scope"), brands: form.getAll("brands"), reason: form.get("reason"), expiresAt: form.get("expiresAt") || null, reauthPassword: form.get("reauthPassword"), idempotencyKey: keys.campaign }))}>
        <label>캠페인 이름<input required name="name" className={`${INPUT} mt-1 w-full`}/></label><label>할인율 (%)<input required name="rate" type="number" min="1" max="100" className={`${INPUT} mt-1 w-full`}/></label><label>최소 주문 금액 (AED)<input required name="minOrder" type="number" min="1" className={`${INPUT} mt-1 w-full`}/></label><label>최대 할인 금액 (AED)<input required name="cap" type="number" min="1" className={`${INPUT} mt-1 w-full`}/></label><label>적용 범위<select name="scope" className={`${INPUT} mt-1 w-full`}><option value="ALL_PRODUCTS">전체 상품</option><option value="BRANDS">선택 브랜드</option></select></label><label>만료 일시<input name="expiresAt" type="datetime-local" className={`${INPUT} mt-1 w-full`}/></label>
        <CampaignBrandSelector brands={data.brands} selected={campaignBrands} onChange={setCampaignBrands}/>
        <p className="text-sm text-amber-200 sm:col-span-2">최소 주문 금액은 checkout이 연결되기 전까지 저장·표시만 되며, 주문에는 적용되지 않습니다.</p><label>감사 사유<input required name="reason" className={`${INPUT} mt-1 w-full`}/></label>{data.reauthMethod !== "GOOGLE" && <label>관리자 비밀번호 재인증<input required name="reauthPassword" type="password" autoComplete="current-password" className={`${INPUT} mt-1 w-full`}/></label>}<button disabled={submitting} className={`${PRIMARY} sm:col-span-2`}>캠페인 생성</button>
      </form>
      <div className="grid gap-3">{data.campaigns.map((campaign) => <article key={campaign.id} className="rounded-xl border border-white/10 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{campaign.name}</h3><p className="text-sm text-zinc-400">할인 {campaign.ratePercent}% · 최소 주문 {campaign.minOrderAed} AED · 최대 할인 {campaign.maxDiscountAed} AED · {campaign.scope === "ALL_PRODUCTS" ? "전체 상품" : campaign.brands.join(", ")} · 발급 {campaign._count.grants}</p></div>{campaign.active && <button onClick={() => setConfirmAction({ kind: "DEACTIVATE_CAMPAIGN", targetId: campaign.id, key: newKey("deactivate") })} className="text-xs text-red-400 underline">비활성화</button>}</div>{campaign.grants.map((grant) => <div key={grant.id} className="mt-2 flex items-center justify-between gap-3 text-xs"><span>발급 기록 {grant.revokedAt ? "(회수됨)" : ""}</span>{!grant.revokedAt && <button onClick={() => setConfirmAction({ kind: "REVOKE_COUPON", targetId: grant.id, key: newKey("revoke") })} className="text-red-400 underline">회수</button>}</div>)}</article>)}</div>
    </section>

    <section className="space-y-4"><h2 className="text-xl font-bold">Coupon Issuance</h2>
      <form className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => void submit(event, "issue", (form) => ({ action: "ISSUE", campaignId: selectedCampaignId, audience, email: targetEmail, confirmedCount: preview?.count, confirmedToken: preview?.token, reason: form.get("reason"), reauthPassword: form.get("reauthPassword"), idempotencyKey: keys.issue }))}>
        <select required aria-label="발급 캠페인" name="campaignId" value={selectedCampaignId} onChange={(event) => { setSelectedCampaignId(event.target.value); resetPreview(); }} className={INPUT}>{data.campaigns.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={audience} onChange={(event) => { setAudience(event.target.value === "ALL_VERIFIED_USERS" ? "ALL_VERIFIED_USERS" : "INDIVIDUAL"); resetPreview(); }} className={INPUT}><option value="INDIVIDUAL">한 사람</option><option value="ALL_VERIFIED_USERS">전체 인증 사용자</option></select><input value={targetEmail} onChange={(event) => { setTargetEmail(event.target.value); resetPreview(); }} required={audience === "INDIVIDUAL"} type="email" placeholder="개별 이메일" className={INPUT}/><input required name="reason" placeholder="발급 사유" className={INPUT}/><input required name="reauthPassword" type="password" autoComplete="current-password" placeholder="관리자 비밀번호 재인증" className={`${INPUT} sm:col-span-2`}/>
        <button type="button" disabled={!selectedCampaignId} onClick={() => void request({ action: "PREVIEW", campaignId: selectedCampaignId, audience, email: targetEmail }).then((payload) => { if ("data" in payload && typeof payload.data === "object" && payload.data !== null && "count" in payload.data && typeof payload.data.count === "number" && "token" in payload.data && typeof payload.data.token === "string") setPreview({ count: payload.data.count, token: payload.data.token }); })} className={SECONDARY}>대상 스냅샷 미리보기</button><button disabled={submitting || !preview || preview.count === 0} className={PRIMARY}>{!preview ? "대상 확인 필요" : `${preview.count}명에게 발급 확인`}</button>
      </form>
    </section>

    <section className="space-y-4"><h2 className="text-xl font-bold">Manual Points</h2>
      <form className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => void submit(event, "point", (form) => ({ action: "GRANT_POINTS", email: form.get("email"), amount: Number(form.get("amount")), reason: form.get("reason"), reauthPassword: form.get("reauthPassword"), idempotencyKey: keys.point }))}><input required name="email" type="email" placeholder="사용자 이메일" className={INPUT}/><input required name="amount" type="number" min="1" placeholder="지급 P" className={INPUT}/><input required name="reason" placeholder="지급 사유" className={INPUT}/><input required name="reauthPassword" type="password" autoComplete="current-password" placeholder="관리자 비밀번호 재인증" className={INPUT}/><button disabled={submitting} className={`${PRIMARY} sm:col-span-2`}>포인트 수동 지급</button></form>
      <form className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => void submit(event, "reversal", (form) => ({ action: "REVERSE_POINTS", sourceKey: form.get("sourceKey"), reason: form.get("reason"), reauthPassword: form.get("reauthPassword"), idempotencyKey: keys.reversal }))}><select required aria-label="회수할 포인트 지급" name="sourceKey" className={INPUT}><option value="">지급 내역 선택</option>{(data.manualGrants ?? []).filter((entry) => !entry.reversed).map((entry) => <option key={entry.id} value={entry.sourceKey}>{entry.user.name ?? "사용자"} · {entry.amount} P · {new Date(entry.createdAt).toLocaleDateString()}</option>)}</select><input required name="reason" placeholder="회수 사유" className={INPUT}/><input required name="reauthPassword" type="password" autoComplete="current-password" placeholder="관리자 비밀번호 재인증" className={`${INPUT} sm:col-span-2`}/><button disabled={submitting || !(data.manualGrants ?? []).some((entry) => !entry.reversed)} className={`${SECONDARY} sm:col-span-2`}>포인트 회수 기록 추가</button></form>
    </section>

    <section className="space-y-4"><h2 className="text-xl font-bold">Purchase Point Policy</h2><p className="text-sm text-zinc-400">저장 전용 · 결제와 PURCHASE_CONFIRMED 연동 후에만 활성화됩니다.</p>
      <form className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2" onSubmit={(event) => void submit(event, "policy", (form) => ({ action: "CREATE_POINT_POLICY", rateBasisPoints: Number(form.get("rate")), perOrderCap: Number(form.get("cap")), scope: form.get("scope"), brands: form.getAll("brands"), activationEvent: "PURCHASE_CONFIRMED", effectiveFrom: form.get("effectiveFrom") || null, effectiveUntil: form.get("effectiveUntil") || null, reason: form.get("reason"), reauthPassword: form.get("reauthPassword"), idempotencyKey: keys.policy }))}><input required name="rate" type="number" min="1" max="10000" placeholder="적립 basis points" className={INPUT}/><input required name="cap" type="number" min="1" placeholder="주문별 최대 P" className={INPUT}/><select name="scope" className={INPUT}><option value="ALL_PRODUCTS">전체 상품</option><option value="BRANDS">선택 브랜드</option></select><div className="flex flex-wrap gap-2 rounded-lg border border-white/10 p-2">{data.brands.map((brand) => <label key={brand} className="text-xs"><input type="checkbox" name="brands" value={brand} className="mr-1"/>{brand}</label>)}</div><input name="effectiveFrom" type="datetime-local" className={INPUT}/><input name="effectiveUntil" type="datetime-local" className={INPUT}/><input required name="reason" placeholder="정책 사유" className={INPUT}/><input required name="reauthPassword" type="password" autoComplete="current-password" placeholder="관리자 비밀번호 재인증" className={INPUT}/><button disabled={submitting} className={`${PRIMARY} sm:col-span-2`}>정책 버전 저장</button></form>
    </section>

    {confirmAction && <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 p-4"><form role="dialog" aria-modal="true" aria-label={confirmAction.kind === "REVOKE_COUPON" ? "쿠폰 회수 확인" : "캠페인 비활성화 확인"} onSubmit={(event) => void confirmMutation(event)} className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-950 p-6"><h2 className="text-xl font-bold">되돌릴 수 없는 관리자 작업 확인</h2><input required name="reason" placeholder="감사 사유" className={`${INPUT} w-full`}/><input required name="reauthPassword" type="password" autoComplete="current-password" placeholder="관리자 비밀번호 재인증" className={`${INPUT} w-full`}/><div className="flex justify-end gap-3"><button type="button" onClick={() => setConfirmAction(null)} className={SECONDARY}>취소</button><button disabled={submitting} className={PRIMARY}>확인 후 실행</button></div></form></div>}
  </div>;
}
