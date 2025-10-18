import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* Enable image optimization for external URLs */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  /* Webpack config for Three.js and other dependencies */
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },

  /* Environment variables that should be available in the client */
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },

  /* Fix workspace root warning by setting the tracing root */
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
