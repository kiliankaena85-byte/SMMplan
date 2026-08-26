/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["@blocknote/core", "@blocknote/react", "@blocknote/server-util"],

  typescript: { ignoreBuildErrors: false },

  transpilePackages: ["@base-ui/react"],

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: isProd
        ? ['smmplan.pro', 'www.smmplan.pro', 'test.smmplan.pro', 'stage.smmplan.pro', 'smmflux.ru', 'www.smmflux.ru']
        : ['smmplan.pro', 'www.smmplan.pro', 'test.smmplan.pro', 'localhost:3000', '127.0.0.1:3000', 'localhost:3001', '127.0.0.1:3001'],
    },
  },
  allowedDevOrigins: isProd
    ? []
    : ["127.0.0.1:3001", "localhost:3001", "127.0.0.1", "localhost"],
  
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
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://yookassa.ru https://auth.robokassa.ru; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self' https://challenges.cloudflare.com https://yookassa.ru https://auth.robokassa.ru https://pay.crypt.bot; connect-src 'self' https://api.telegram.org https://static.cloudflareinsights.com https://cloudflareinsights.com https://challenges.cloudflare.com https://yookassa.ru https://api.yookassa.ru https://auth.robokassa.ru https://pay.crypt.bot wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
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
            value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://yookassa.ru" "https://auth.robokassa.ru")',
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
