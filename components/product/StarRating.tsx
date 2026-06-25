"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const isInteractive = !!onChange && !readonly;
  const filled = hoverIndex !== null ? hoverIndex : Math.round(value);

  const sizeClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  if (isInteractive) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHoverIndex(n)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={() => onChange(n)}
            aria-label={`별점 ${n}점`}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                sizeClass,
                "transition-colors",
                n <= filled
                  ? "fill-brand-neon text-brand-neon"
                  : "fill-transparent text-zinc-700"
              )}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>
          <Star
            className={cn(
              sizeClass,
              n <= filled
                ? "fill-brand-neon text-brand-neon"
                : "fill-transparent text-zinc-700"
            )}
          />
        </span>
      ))}
    </div>
  );
}
