/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone",
  serverExternalPackages: ["@blocknote/core", "@blocknote/react", "@blocknote/server-util", "bullmq", "ioredis", "sanitize-html"],

  typescript: { ignoreBuildErrors: true },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // OSAD-V2: Distributed Cache Sync for Redis (Resolves C4.1)
  cacheHandler: process.env.NODE_ENV === 'production' ? process.cwd() + '/cache-handler.js' : undefined,

  // OSAD-V2: Security Headers (OWASP A05)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },
};

export default nextConfig;
