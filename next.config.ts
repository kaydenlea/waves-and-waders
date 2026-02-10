import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' https:",
  "connect-src 'self' https: wss:",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    qualities: [75, 95, 100],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
          },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
