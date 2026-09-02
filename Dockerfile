# --- runner ---
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl dos2unix openssl libssl3
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Next.js standalone (копируется напрямую из собранного билда)
COPY --chown=nextjs:nodejs .next/standalone ./
COPY --chown=nextjs:nodejs .next/static ./.next/static
COPY --chown=nextjs:nodejs public ./public

# Prisma (для migrate deploy и runtime)
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs node_modules/.prisma ./node_modules/.prisma
COPY --chown=nextjs:nodejs node_modules/@prisma/client ./node_modules/@prisma/client

# Entrypoint (prisma migrate deploy перед стартом)
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN dos2unix docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
CMD ["node", "server.js"]

# --- worker-runner ---
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS worker-runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libssl3 curl
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --chown=nextjs:nodejs .next/standalone/node_modules ./node_modules
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs dist/worker.js ./

USER nextjs
CMD ["node", "worker.js"]

# --- bot-runner ---
FROM node:20-alpine AS bot-runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libssl3 curl
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy standalone node_modules, Prisma runtime, and bundled bot
COPY --chown=nextjs:nodejs .next/standalone/node_modules ./node_modules
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs dist/bot.js ./

USER nextjs
CMD ["node", "bot.js"]
