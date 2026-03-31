import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const CURRENCY = {
    KRW_TO_AED_RATE: Number(process.env.NEXT_PUBLIC_CURRENCY_RATE) || 0.0027,
    DEFAULT_CURRENCY: "AED",
    LOCALE: "en-AE",
} as const;

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatPrice = (krwPrice: number): string => {
    const aedPrice = Math.round(krwPrice * CURRENCY.KRW_TO_AED_RATE);
    return `${CURRENCY.DEFAULT_CURRENCY} ${aedPrice.toLocaleString(CURRENCY.LOCALE)}`;
};


