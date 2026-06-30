import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // optimizeCss requires 'critters' package — disabled
  },
    async rewrites() {
    return [
      {
        // The regex ((?!auth).*) ensures anything starting with /api/auth is ignored by this proxy rule
        source: '/api/:path((?!auth).*)',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },

};

export default nextConfig;
