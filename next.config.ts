import type { NextConfig } from "next";

// CSP frame-src allowlist for the live embeds we render inside cards.
// We only set frame-src here — other directives are left at their browser
// defaults so NextAuth flows, next/image, and external thumbnail hosts
// keep working exactly as before.
const FRAME_SRC_ALLOWLIST = [
  "'self'",
  "https://www.canva.com",
  "https://www.youtube.com",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "egestive-sharron-farrandly.ngrok-free.dev"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src ${FRAME_SRC_ALLOWLIST.join(" ")}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
