import type { Metadata } from "next";
import { Outfit, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"], // Preload common weights
  variable: "--font-noto",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "POTATA - Seoul to Dubai",
  description: "Premier Korean Fashion for UAE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(outfit.variable, notoSansKr.variable, "font-sans min-h-screen bg-background text-foreground")}>
        {children}
      </body>
    </html>
  );
}
