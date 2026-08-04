import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  compress: true,
  experimental: {
    optimizePackageImports: ["recharts"],
  },
};

export default nextConfig;

