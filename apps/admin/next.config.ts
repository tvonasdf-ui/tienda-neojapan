import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@neojapan/ui'],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3002/api/:path*',
      },
    ];
  },
};

export default nextConfig;