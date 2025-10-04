import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Temporary: don't block production builds on lint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
