import type { Metadata } from "next";
import { BRAND } from "./constants";

/**
 * SEO 메타데이터 생성 유틸리티
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://potata.com";

interface PageMetadataOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}

export function generateMetadata({
  title,
  description,
  path = "",
  image = "/og-default.jpg",
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const fullTitle = `${title} | ${BRAND.NAME}`;
  const url = `${BASE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    ...(noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: BRAND.NAME,
      images: [
        {
          url: image.startsWith("http") ? image : `${BASE_URL}${image}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_AE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image.startsWith("http") ? image : `${BASE_URL}${image}`],
    },
    alternates: {
      canonical: url,
    },
  };
}

// 페이지별 메타데이터 정의
export const PAGE_METADATA = {
  home: {
    title: BRAND.NAME,
    description: `${BRAND.TAGLINE} - ${BRAND.DESCRIPTION}. Discover unique Korean fashion brands curated for the UAE market.`,
  },
  shop: {
    title: "Shop",
    description: "Browse our collection of premium Korean fashion. Find the latest trends from Seoul's top brands.",
  },
  brands: {
    title: "Brands",
    description: "Explore premium Korean fashion brands. From Matin Kim to Andersson Bell, discover Seoul's finest.",
  },
  ranking: {
    title: "Ranking",
    description: "See what's trending. Real-time rankings of the most popular Korean fashion items.",
  },
  forYou: {
    title: "For You",
    description: "Personalized fashion recommendations powered by AI. Discover styles curated just for you.",
  },
  ootd: {
    title: "What to Wear",
    description: "Get inspired by our community's outfits. Share your OOTD and discover new styles.",
  },
  tryOn: {
    title: "AI Studio",
    description: "Try on clothes virtually with our AI technology. See how Korean fashion looks on you.",
  },
} as const;
