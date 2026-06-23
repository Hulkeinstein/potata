import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "kream-phinf.pstatic.net",
      },
      {
        // Supabase Storage (OOTD 업로드 이미지) — public 버킷 오브젝트
        protocol: "https",
        hostname: "ptosrqkdatrygksyuvpm.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
