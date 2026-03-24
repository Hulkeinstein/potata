import type { Metadata } from "next";
import { generateMetadata, PAGE_METADATA } from "@/lib/metadata";

export const metadata: Metadata = generateMetadata({
  title: PAGE_METADATA.ootd.title,
  description: PAGE_METADATA.ootd.description,
  path: "/what-to-wear",
});

export default function WhatToWearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
