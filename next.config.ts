import type { NextConfig } from "next";

// 모든 응답에 붙이는 보안 헤더. CSP는 Next의 인라인 script 때문에 nonce 배선이 필요해 별도 작업으로 둔다.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" }, // 로그인·관리자 화면 clickjacking 차단
  { key: "X-Content-Type-Options", value: "nosniff" }, // 공개 버킷 파일의 MIME 추측 실행 차단
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // 외부로 경로·쿼리 유출 방지
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, // 사용하지 않는 권한 봉쇄
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }, // HTTPS 강제(HTTP에서는 무시됨)
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
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
