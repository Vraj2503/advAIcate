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
        source: '/api/:path*',
        // NEXT_PUBLIC_API_URL is the Cloud Run URL (e.g. https://advaicate-backend-xxxxx.run.app)
        // This proxies frontend API calls securely, avoiding cross-origin issues
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
