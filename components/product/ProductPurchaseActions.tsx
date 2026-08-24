"use client";

import { useState } from "react";
import { Copy, Minus, Plus } from "lucide-react";
import { HeartButton } from "@/components/common/HeartButton";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import type { Product } from "@/types";

interface ProductPurchaseActionsProps {
  readonly product: Product;
  readonly imageUrl: string;
}

export function ProductPurchaseActions({ product, imageUrl }: ProductPurchaseActionsProps) {
  const sizes = product.sizes?.length ? product.sizes : ["Free"];
  const colors = product.colors?.length ? product.colors : ["Default"];
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [copyStatus, setCopyStatus] = useState("");
  const { addItem } = useCartStore();

  const addToCart = () => {
    const size = selectedSize ?? sizes[0];
    if (!selectedSize && size !== "Free" && size !== "One Size") {
      setCopyStatus("사이즈를 선택해 주세요.");
      return;
    }
    addItem({ product: { ...product, imageUrl }, quantity, color: selectedColor, size });
    setCopyStatus(`${quantity}개를 장바구니에 담았습니다.`);
  };

  const copyProductLink = () => {
    if (!navigator.clipboard) {
      setCopyStatus("이 브라우저에서는 링크 복사를 지원하지 않습니다.");
      return;
    }
    void navigator.clipboard.writeText(window.location.href).then(
      () => setCopyStatus("상품 링크를 복사했습니다."),
      () => setCopyStatus("링크를 복사하지 못했습니다.")
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <span className="text-sm font-medium text-zinc-300">Color</span>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button key={color} onClick={() => setSelectedColor(color)} aria-pressed={selectedColor === color} className={cn("px-4 py-2 rounded-full border text-sm transition-all", selectedColor === color ? "border-brand-neon text-brand-neon bg-brand-neon/10" : "border-white/10 text-zinc-400 hover:border-white/30")}>{color}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-sm font-medium text-zinc-300">Size</span>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((size) => (
            <button key={size} onClick={() => setSelectedSize(size)} aria-pressed={selectedSize === size} className={cn("py-3 rounded-lg border text-sm font-medium transition-all", selectedSize === size ? "border-brand-neon text-black bg-brand-neon" : "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/5")}>{size}</button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Size guide는 준비 중입니다.</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3 rounded bg-black/20 px-2 py-1">
          <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="수량 줄이기" disabled={quantity === 1} className="p-1 text-zinc-400 hover:text-white disabled:opacity-30"><Minus className="h-3 w-3" /></button>
          <span className="min-w-5 text-center text-sm font-medium">{quantity}</span>
          <button onClick={() => setQuantity((value) => value + 1)} aria-label="수량 늘리기" className="p-1 text-zinc-400 hover:text-white"><Plus className="h-3 w-3" /></button>
        </div>
        <span className="text-lg font-bold">{formatPrice(product.price * quantity)}</span>
      </div>

      <div className="flex gap-4">
        <button onClick={addToCart} className="flex h-14 flex-1 items-center justify-center rounded-xl bg-white text-lg font-bold text-black transition-colors hover:bg-brand-neon">Add to Cart</button>
        <HeartButton productId={product.id} className="h-14 w-14 rounded-xl border border-white/10" iconSize={24} />
        <button onClick={copyProductLink} aria-label="상품 링크 복사" className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 transition-colors hover:border-white/50"><Copy className="h-6 w-6" /></button>
      </div>
      {copyStatus && <p role="status" className="text-sm text-zinc-400">{copyStatus}</p>}
    </div>
  );
}
