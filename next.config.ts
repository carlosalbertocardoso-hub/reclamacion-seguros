import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'pdf-parse'];
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      'pdf-parse': 'pdf-parse/lib/pdf-parse.js',
    },
  },
};

export default nextConfig;
