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

  typescript: { ignoreBuildErrors: true },

  transpilePackages: ["@base-ui/react"],

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['smmplan.pro', 'www.smmplan.pro', 'localhost:3000', '127.0.0.1:3000'],
    },
  },
  allowedDevOrigins: ["public-walls-play.loca.lt", "*.loca.lt", "127.0.0.1:3001", "localhost:3001", "127.0.0.1", "localhost"],
  
  // OSAD-V2: Distributed Cache Sync for Redis (Resolves C4.1)
  cacheHandler: (process.env.NODE_ENV === 'production' && !process.env.DISABLE_REDIS_CACHE) ? process.cwd() + '/cache-handler.js' : undefined,

  // OSAD-V2: Security Headers (OWASP A05) are now handled exclusively by Nginx.
  // We removed async headers() to prevent duplicate X-Frame-Options and other conflicts.
  poweredByHeader: false,
};

export default nextConfig;
