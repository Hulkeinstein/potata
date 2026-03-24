import type { Metadata } from "next";
import { generateMetadata, PAGE_METADATA } from "@/lib/metadata";

export const metadata: Metadata = generateMetadata({
  title: PAGE_METADATA.tryOn.title,
  description: PAGE_METADATA.tryOn.description,
  path: "/try-on",
});

export default function TryOnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
