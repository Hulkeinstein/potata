import type { Metadata } from "next";
import { generateMetadata, PAGE_METADATA } from "@/lib/metadata";

export const metadata: Metadata = generateMetadata({
  title: PAGE_METADATA.brands.title,
  description: PAGE_METADATA.brands.description,
  path: "/brands",
});

export default function BrandsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
