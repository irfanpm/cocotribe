import type { NextConfig } from "next";

// Next's inline bootstrap scripts need 'unsafe-inline' without a per-request nonce.
// Razorpay checkout needs its script, iframe and logging hosts.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://api.razorpay.com",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://*.razorpay.com",
  "connect-src 'self' https://*.razorpay.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
].join("; ");

const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1200],
    imageSizes: [96, 256, 384],
    minimumCacheTTL: 2592000,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
      { source: "/booking/:path*", headers: privateHeaders },
      { source: "/book", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
      {
        // The admin app's service worker must always be fresh, or fixes would never reach phones.
        source: "/admin-sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, max-age=0" }],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};
export default config;
