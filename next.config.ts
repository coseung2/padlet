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
  images: {
    // Thumbnails we optimize via next/image. All other external hosts
    // must flow through /api/canva/thumbnail (proxy) or be proxied
    // through our own origin.
    remotePatterns: [
      { protocol: "https", hostname: "www.canva.com", pathname: "/**" },
      { protocol: "https", hostname: "canva.com", pathname: "/**" },
      { protocol: "https", hostname: "document-export.canva.com", pathname: "/**" },
      { protocol: "https", hostname: "**.canva.com", pathname: "/**" },
      { protocol: "https", hostname: "**.canva-web-files.com", pathname: "/**" },
      // YouTube thumbnails (used for video preview posters)
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
    ],
    // Device size variants used to build the srcset for responsive images.
    // Galaxy Tab S6 Lite viewport (1500×2000 CSS, DPR 2) is covered by
    // 640/750/828/1080 widths.
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 96, 160, 320, 480, 640],
    formats: ["image/webp"],
  },
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
