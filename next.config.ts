import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  distDir: process.env.BUILD_OUTPUT_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/api/:path((?!media/[^/]+$).*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/admin",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
export default nextConfig;
