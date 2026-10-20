import type { Metadata } from "next";
import { Outfit, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/ui/Navbar";
import { InitialLoader } from "@/components/ui/InitialLoader";
import { Footer } from "@/components/ui/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { StoreSync } from "@/components/providers/StoreSync";
import { CatalogRefresh } from '@/components/providers/CatalogRefresh';
import { cookies } from 'next/headers';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { LANGUAGE_COOKIE, parseLocale } from '@/lib/i18n/locale';

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = parseLocale((await cookies()).get(LANGUAGE_COOKIE)?.value);
  return (
    <html lang={locale}>
      <body className={cn(outfit.variable, notoSansKr.variable, "font-sans min-h-screen bg-background text-foreground")}>
        <LanguageProvider initialLocale={locale}><AuthProvider>
          <StoreSync />
          <CatalogRefresh />
          <InitialLoader />
          <Navbar />
          {children}
          <Footer />
        </AuthProvider></LanguageProvider>
      </body>
    </html>
  );
}
