import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/node-API packages that Turbopack must not bundle
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
};

export default nextConfig;
