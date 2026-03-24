import type { Metadata } from "next";
import { generateMetadata, PAGE_METADATA } from "@/lib/metadata";

export const metadata: Metadata = generateMetadata({
  title: PAGE_METADATA.shop.title,
  description: PAGE_METADATA.shop.description,
  path: "/shop",
});

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
