"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { SizeGuide } from "@/lib/size-guide";

type SizeGuideDialogProps = {
  readonly productName: string;
  readonly guide: SizeGuide;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
};

export function SizeGuideDialog({ productName, guide, triggerRef, onClose }: SizeGuideDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [displayUnit, setDisplayUnit] = useState<"cm" | "in">("cm");

  useEffect(() => {
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [onClose, triggerRef]);

  const formatMeasurement = (value: number) => displayUnit === "cm" ? value : (value / 2.54).toFixed(1);
  const measurementLabel = guide.measurementType === "garment" ? "상품 실측" : "신체 권장 치수";

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${productName} Size Guide`}
        className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Size Guide</h2>
            <p className="text-sm text-zinc-400">{productName} · {measurementLabel}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Size Guide 닫기" className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-3 flex justify-end" aria-label="치수 단위">
          {(["cm", "in"] as const).map((unit) => (
            <button key={unit} type="button" aria-pressed={displayUnit === unit} onClick={() => setDisplayUnit(unit)} className="rounded px-3 py-1 text-sm text-zinc-300 aria-pressed:bg-white aria-pressed:text-black">{unit}</button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-96 border-collapse text-sm">
            <caption className="sr-only">{productName} {measurementLabel}, 단위 {displayUnit}</caption>
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-300">
                <th scope="col" className="p-3">Size</th>
                {guide.columns.map((column) => <th key={column.key} scope="col" className="p-3">{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row) => (
                <tr key={row.size} className="border-b border-white/5 text-zinc-200">
                  <th scope="row" className="p-3 text-left font-semibold">{row.size}</th>
                  {guide.columns.map((column) => <td key={column.key} className="p-3">{formatMeasurement(row.measurements[column.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {guide.note && <p className="mt-4 text-xs leading-relaxed text-zinc-400">{guide.note}</p>}
      </section>
    </div>
  );
}
