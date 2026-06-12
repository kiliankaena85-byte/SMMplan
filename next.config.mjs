/** @type {import('next').NextConfig} */
console.log("=== NEXT BUILD ENV ===", { 
  NODE_ENV: process.env.NODE_ENV, 
  APP_ENV: process.env.APP_ENV, 
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV, 
  DATABASE_URL: process.env.DATABASE_URL 
});

const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@blocknote/core", "@blocknote/react", "@blocknote/server-util", "bullmq", "ioredis", "sanitize-html"],

  typescript: { ignoreBuildErrors: false },

  transpilePackages: ["@base-ui/react"],

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  allowedDevOrigins: ["public-walls-play.loca.lt", "*.loca.lt", "127.0.0.1:3001", "localhost:3001", "127.0.0.1", "localhost"],
  
  // OSAD-V2: Distributed Cache Sync for Redis (Resolves C4.1)
  cacheHandler: (process.env.NODE_ENV === 'production' && !process.env.DISABLE_REDIS_CACHE) ? process.cwd() + '/cache-handler.js' : undefined,

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
