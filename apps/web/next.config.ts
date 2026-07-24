import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  compress: true,
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "date-fns"],
  },
};

export default nextConfig;

