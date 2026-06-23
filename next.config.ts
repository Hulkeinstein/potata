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
      {
        // Google 계정 프로필 사진(OAuth 로그인 유저 아바타)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
