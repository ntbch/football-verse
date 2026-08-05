import type { NextConfig } from "next";

function originOf(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "'self'";
  }
}

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1");
const cspHeaderKey = process.env.CSP_ENFORCE === "true"
  ? "Content-Security-Policy"
  : "Content-Security-Policy-Report-Only";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://pay-sandbox.sepay.vn https://pay.sepay.vn https://*.sepay.vn",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src-elem 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  `connect-src 'self' ${apiOrigin} https://accounts.google.com ws: wss:`,
  "frame-src 'self' https://accounts.google.com",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  compress: true,
  experimental: {
    optimizePackageImports: ["recharts"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // Flip CSP_ENFORCE only after report-only evidence is clean.
            key: cspHeaderKey,
            value: contentSecurityPolicy,
          },
          {
            // Google Identity popup messaging requires the opener to remain available.
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

