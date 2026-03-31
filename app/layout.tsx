import type { Metadata } from "next";
import { Outfit, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/ui/Navbar";
import { InitialLoader } from "@/components/ui/InitialLoader";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Footer } from "@/components/ui/Footer";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
        <InitialLoader />
        <CustomCursor />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
