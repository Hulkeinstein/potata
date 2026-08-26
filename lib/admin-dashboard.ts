import { prisma } from "@/lib/prisma";

export type DashboardVariant = { readonly stock: number; readonly isManuallySoldOut: boolean };
export type DashboardProduct = { readonly isActive: boolean; readonly variants: readonly DashboardVariant[] };

export type AdminDashboardSummary = {
  readonly totalProducts: number;
  readonly activeProducts: number;
  readonly inactiveProducts: number;
  readonly productsWithAvailableVariant: number;
  readonly soldOutProducts: number;
  readonly manuallySoldOutVariants: number;
  readonly zeroStockVariants: number;
  readonly lowStockVariants: number;
  readonly activeCouponCampaigns: number;
  readonly unansweredQuestions: number;
};

export function summarizeAdminDashboard(products: readonly DashboardProduct[]): Omit<AdminDashboardSummary, "activeCouponCampaigns" | "unansweredQuestions"> {
  let activeProducts = 0;
  let inactiveProducts = 0;
  let productsWithAvailableVariant = 0;
  let soldOutProducts = 0;
  let manuallySoldOutVariants = 0;
  let zeroStockVariants = 0;
  let lowStockVariants = 0;
  for (const product of products) {
    if (!product.isActive) { inactiveProducts += 1; continue; }
    activeProducts += 1;
    const available = product.variants.some((variant) => variant.stock > 0 && !variant.isManuallySoldOut);
    if (available) productsWithAvailableVariant += 1;
    else soldOutProducts += 1;
    for (const variant of product.variants) {
      if (variant.isManuallySoldOut) manuallySoldOutVariants += 1;
      if (variant.stock === 0) zeroStockVariants += 1;
      if (variant.stock >= 1 && variant.stock <= 3) lowStockVariants += 1;
    }
  }
  return { totalProducts: products.length, activeProducts, inactiveProducts, productsWithAvailableVariant, soldOutProducts, manuallySoldOutVariants, zeroStockVariants, lowStockVariants };
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const [products, activeCouponCampaigns, unansweredQuestions] = await Promise.all([
    prisma.product.findMany({ select: { isActive: true, variants: { select: { stock: true, isManuallySoldOut: true } } } }),
    prisma.couponCampaign.count({ where: { active: true } }),
    prisma.question.count({ where: { answers: { none: {} } } }),
  ]);
  return { ...summarizeAdminDashboard(products), activeCouponCampaigns, unansweredQuestions };
}
