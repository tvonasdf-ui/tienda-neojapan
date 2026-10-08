import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // packages/ui exporta TSX directo — Next lo transpila.
  transpilePackages: ['@neojapan/ui'],
  // Next.js 16: Cache Components + React Compiler (estable).
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  async rewrites() {
    // En dev, /api/* se enruta a la API NestJS local.
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