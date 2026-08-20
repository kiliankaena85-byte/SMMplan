/** @type {import('next').NextConfig} */
console.log("=== NEXT BUILD ENV ===", { 
  NODE_ENV: process.env.NODE_ENV, 
  APP_ENV: process.env.APP_ENV, 
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV, 
  DATABASE_URL: process.env.DATABASE_URL 
});

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@blocknote/core", "@blocknote/react", "@blocknote/server-util", "bullmq", "ioredis", "sanitize-html"],

  typescript: { ignoreBuildErrors: false },

  transpilePackages: ["@base-ui/react"],

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: isProd
        ? ['smmplan.pro', 'www.smmplan.pro', 'test.smmplan.pro', 'stage.smmplan.pro', 'smmflux.ru', 'www.smmflux.ru']
        : ['smmplan.pro', 'www.smmplan.pro', 'test.smmplan.pro', 'localhost:3000', '127.0.0.1:3000', 'localhost:3001', '127.0.0.1:3001', '192.168.10.244:3000', '192.168.10.244:3001', '*.pinggy.io', '*.pinggy-free.link'],
    },
  },
  allowedDevOrigins: isProd
    ? []
    : ["127.0.0.1:3001", "localhost:3001", "127.0.0.1", "localhost", "192.168.10.244", "192.168.10.244:3000", "eukyx-185-67-125-116.run.pinggy-free.link", "*.pinggy.io", "*.pinggy-free.link"],
  
  // OSAD-V2: Distributed Cache Sync for Redis (Disabled for standalone container portability)
  cacheHandler: undefined,

  // User-uploaded files use raw buffer response via /api/media/ (never _next/image), keeping static image optimization intact.
  images: {
    unoptimized: false,
  },
  async redirects() {
    return [
      {
        source: '/services/vkontakte/:path*',
        destination: '/services/vk/:path*',
        permanent: true,
      },
      {
        source: '/services/vkontakte',
        destination: '/services/vk',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: https://api.telegram.org https://cloudflareinsights.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
