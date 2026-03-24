import type { Metadata } from "next";
import { generateMetadata, PAGE_METADATA } from "@/lib/metadata";

export const metadata: Metadata = generateMetadata({
  title: PAGE_METADATA.ranking.title,
  description: PAGE_METADATA.ranking.description,
  path: "/ranking",
});

export default function RankingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
