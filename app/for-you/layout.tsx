import type { Metadata } from "next";
import { generateMetadata, PAGE_METADATA } from "@/lib/metadata";

export const metadata: Metadata = generateMetadata({
  title: PAGE_METADATA.forYou.title,
  description: PAGE_METADATA.forYou.description,
  path: "/for-you",
});

export default function ForYouLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
