"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type EditableProduct = {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly price: number;
  readonly category: string;
  readonly description: string | null;
  readonly originalPrice: number | null;
  readonly discountRate: number | null;
  readonly isActive: boolean;
  readonly variants: readonly { readonly id: string; readonly size: string; readonly color: string; readonly stock: number; readonly isManuallySoldOut: boolean }[];
};

type EditableForm = Omit<EditableProduct, "price" | "originalPrice" | "discountRate"> & {
  readonly price: string;
  readonly originalPrice: string;
  readonly discountRate: string;
};

const CATEGORIES = ["Outer", "Top", "Bottom", "Dress", "Acc", "Shoes"] as const;

export function AdminProductEditForm({ product }: { readonly product: EditableProduct }) {
  const router = useRouter();
  const [form, setForm] = useState<EditableForm>({ ...product, price: String(product.price), originalPrice: product.originalPrice === null ? "" : String(product.originalPrice), discountRate: product.discountRate === null ? "" : String(product.discountRate) });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  function change(field: keyof EditableForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function changeVariant(id: string, value: boolean) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) => variant.id === id ? {
        ...variant,
        isManuallySoldOut: value,
      } : variant),
    }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(`/api/admin/catalog/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: Number(form.price), originalPrice: form.originalPrice === "" ? null : Number(form.originalPrice), discountRate: form.discountRate === "" ? null : Number(form.discountRate) }) });
    if (!response.ok) setMessage("상품을 저장하지 못했습니다. 입력값을 확인해 주세요.");
    else router.push("/admin/products");
    setSaving(false);
  }
  return <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-2xl space-y-4 rounded border border-zinc-800 bg-zinc-950 p-5">
    <div><h1 className="text-3xl font-black">상품 수정</h1><p className="mt-1 text-sm text-zinc-400">이미지는 기존 이미지를 유지합니다. 교체 업로드는 상품 등록에서 지원합니다.</p></div>
    <label className="block text-sm">상품명<input className="mt-1 w-full rounded bg-zinc-900 p-2" value={form.name} onChange={(event) => change("name", event.target.value)} /></label>
    <label className="block text-sm">브랜드<input className="mt-1 w-full rounded bg-zinc-900 p-2" value={form.brand} onChange={(event) => change("brand", event.target.value)} /></label>
    <label className="block text-sm">판매가 (AED)<input type="number" min="1" className="mt-1 w-full rounded bg-zinc-900 p-2" value={form.price} onChange={(event) => change("price", event.target.value)} /></label>
    <label className="block text-sm">카테고리<select className="mt-1 w-full rounded bg-zinc-900 p-2" value={form.category} onChange={(event) => change("category", event.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
    <label className="block text-sm">설명<textarea className="mt-1 w-full rounded bg-zinc-900 p-2" value={form.description ?? ""} onChange={(event) => change("description", event.target.value)} /></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => change("isActive", event.target.checked)} />판매 중으로 노출</label>
    <section className="space-y-3 rounded border border-zinc-800 p-4" aria-labelledby="inventory-heading">
      <div><h2 id="inventory-heading" className="font-bold">옵션별 재고 및 품절</h2><p className="mt-1 text-xs text-zinc-400">재고는 별도 재고 운영 화면에서 입고·정정·폐기 사유와 함께 조정합니다. 여기서는 수동 품절만 관리합니다.</p><Link href={`/admin/inventory?q=${encodeURIComponent(product.name)}`} className="mt-2 inline-block text-sm text-brand-neon underline">이 상품 재고 운영으로 이동</Link></div>
      {form.variants.length === 0 ? <p className="text-sm text-amber-400">옵션 재고를 먼저 설정해야 고객이 구매할 수 있습니다.</p> : form.variants.map((variant) => <div key={variant.id} className="flex flex-wrap items-center gap-3 rounded bg-zinc-900 p-3"><span className="min-w-24 text-sm">{[variant.color, variant.size].filter(Boolean).join(" / ") || "기본 옵션"}</span><span className="text-sm text-zinc-300">현재 재고 {variant.stock}</span><label className="flex items-center gap-2 text-sm"><input checked={variant.isManuallySoldOut} type="checkbox" onChange={(event) => changeVariant(variant.id, event.target.checked)} />수동 품절</label></div>)}
    </section>
    {message ? <p role="alert" className="text-sm text-red-400">{message}</p> : null}
    <div className="flex justify-end gap-2"><button type="button" onClick={() => router.back()} className="rounded border border-zinc-700 px-4 py-2">취소</button><button disabled={saving} className="rounded bg-brand-neon px-4 py-2 font-bold text-black">{saving ? "저장 중" : "저장"}</button></div>
  </form>;
}
