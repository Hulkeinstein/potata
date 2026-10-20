"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, Minus, Plus } from "lucide-react";
import { HeartButton } from "@/components/common/HeartButton";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { Product } from "@/types";
import type { SizeGuide } from "@/lib/size-guide";
import { usePreferredProductSize } from './use-preferred-product-size';
import { SizeGuideDialog } from "@/components/product/SizeGuideDialog";
import { useSession } from "next-auth/react";
import { getInventoryStatus } from "@/lib/inventory";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { productActionMessages, type PurchaseFeedbackKey } from "@/lib/i18n/product-action-messages";

interface ProductPurchaseActionsProps {
  readonly product: Product & { readonly sizeGuide?: SizeGuide };
  readonly imageUrl: string;
}

export function ProductPurchaseActions({ product, imageUrl }: ProductPurchaseActionsProps) {
  const { locale } = useLanguage();
  const text = productActionMessages[locale];
  const sizes = useMemo(() => product.sizes?.length ? product.sizes : ["Free"], [product.sizes]);
  const colors = useMemo(() => product.colors?.length ? product.colors : ["Default"], [product.colors]);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [copyStatus, setCopyStatus] = useState<{ readonly key: PurchaseFeedbackKey; readonly count?: number } | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [edited, setEdited] = useState(false);
  const userChoice = useRef(false);
  const sizeGuideTriggerRef = useRef<HTMLButtonElement>(null);
  const { addItem } = useCartStore();
  const { status: sessionStatus, data: session } = useSession();
  const selectedVariant = product.variants?.find((variant) => variant.size === (selectedSize ?? sizes[0]) && variant.color === selectedColor);
  const hasInventory = product.variants !== undefined;
  const selectedStatus = selectedVariant ? getInventoryStatus(selectedVariant) : "SOLD_OUT";
  const hasValidSelection = colors.includes(selectedColor) && (selectedSize === null || sizes.includes(selectedSize));
  const isPurchasable = hasValidSelection && (!hasInventory || selectedStatus === "ON_SALE");
  usePreferredProductSize(product.id, session?.user?.id, sessionStatus, sizes, userChoice, setSelectedSize);

  const addToCart = () => {
    const size = selectedSize ?? sizes[0];
    if (!selectedSize && size !== "Free" && size !== "One Size") {
      setCopyStatus({ key: "selectSize" });
      return;
    }
    if (!isPurchasable) {
      setCopyStatus({ key: selectedStatus === "MANUAL_SOLD_OUT" ? "manualUnavailable" : "unavailable" });
      return;
    }
    if (selectedVariant && quantity > selectedVariant.stock) {
      setCopyStatus({ key: "stockRemaining", count: selectedVariant.stock });
      return;
    }
    addItem({ product: { ...product, imageUrl }, quantity, color: selectedColor, size });
    setCopyStatus({ key: "cartAdded", count: quantity });
  };

  const copyProductLink = () => {
    if (!navigator.clipboard) {
      setCopyStatus({ key: "copyUnsupported" });
      return;
    }
    void navigator.clipboard.writeText(window.location.href).then(
      () => setCopyStatus({ key: "copied" }),
      () => setCopyStatus({ key: "copyFailed" })
    );
  };

  return (
    <div data-catalog-refresh-blocked={edited ? 'true' : undefined} className="space-y-6">
      <div className="space-y-3">
        <span className="text-sm font-medium text-zinc-300">{text.color}</span>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const available = !hasInventory || (product.variants ?? []).some((variant) => variant.color === color && getInventoryStatus(variant) === "ON_SALE");
            return <button key={color} onClick={() => { setEdited(true); setSelectedColor(color); }} aria-pressed={selectedColor === color} className={cn("px-4 py-2 rounded-full border text-sm transition-all", selectedColor === color ? "border-brand-neon text-brand-neon bg-brand-neon/10" : "border-white/10 text-zinc-400 hover:border-white/30", !available && "cursor-not-allowed opacity-40 line-through")}>{color}</button>;
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-300">{text.size}</span>
          {product.sizeGuide && <button ref={sizeGuideTriggerRef} type="button" onClick={() => setSizeGuideOpen(true)} className="text-sm font-medium text-brand-neon underline underline-offset-4">{text.sizeGuide}</button>}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((size) => {
            const variant = product.variants?.find((item) => item.size === size && item.color === selectedColor);
            const status = variant ? getInventoryStatus(variant) : "SOLD_OUT";
            const available = !hasInventory || status === "ON_SALE";
            return <button key={size} onClick={() => { if (available) { userChoice.current = true; setEdited(true); setSelectedSize(size); } }} aria-pressed={selectedSize === size} disabled={!available} className={cn("py-3 rounded-lg border text-sm font-medium transition-all", selectedSize === size ? "border-brand-neon text-black bg-brand-neon" : "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/5", !available && "cursor-not-allowed opacity-40")}>{size}{!available ? ` · ${text.soldOut}` : ""}</button>;
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3 rounded bg-black/20 px-2 py-1">
          <button onClick={() => { setEdited(true); setQuantity((value) => Math.max(1, value - 1)); }} aria-label={text.decrease} disabled={quantity === 1} className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"><Minus className="h-3 w-3" /></button>
          <span className="min-w-5 text-center text-sm font-medium">{quantity}</span>
          <button onClick={() => { setEdited(true); setQuantity((value) => selectedVariant ? Math.min(selectedVariant.stock, value + 1) : value + 1); }} aria-label={text.increase} disabled={!isPurchasable || (selectedVariant ? quantity >= selectedVariant.stock : false)} className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"><Plus className="h-3 w-3" /></button>
        </div>
        <span className="text-lg font-bold">{formatPrice(product.price * quantity)}</span>
      </div>

      <div className="flex gap-4">
        <button onClick={addToCart} disabled={!isPurchasable} className="flex h-14 flex-1 items-center justify-center rounded-xl bg-white text-lg font-bold text-black transition-colors hover:bg-brand-neon disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300">{isPurchasable ? text.addToCart : selectedStatus === "MANUAL_SOLD_OUT" ? text.soldOut : text.outOfStock}</button>
        <HeartButton productId={product.id} className="h-14 w-14 rounded-xl border border-white/10" iconSize={24} />
        <button onClick={copyProductLink} aria-label={text.copyLink} className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 transition-colors hover:border-white/50"><Copy className="h-6 w-6" /></button>
      </div>
      {copyStatus && <p role="status" className="text-sm text-zinc-400">{text[copyStatus.key].replace("{count}", String(copyStatus.count ?? ""))}</p>}
      {product.sizeGuide && sizeGuideOpen && <SizeGuideDialog productName={product.name} guide={product.sizeGuide} triggerRef={sizeGuideTriggerRef} onClose={() => setSizeGuideOpen(false)} />}
    </div>
  );
}
