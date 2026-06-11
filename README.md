# Smmplan Lite Core

Smmplan Lite Core is the main codebase for the Smmplan platform, built with Next.js 16 (App Router), React 19, Tailwind CSS 4, and Prisma.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start infrastructure (PostgreSQL and Redis) using Docker Compose (if applicable):
   ```bash
   docker-compose up -d
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` and fill in the required values.

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Seed the database (optional):
   ```bash
   npm run db:seed-mock
   ```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server. |
| `npm run build` | Creates an optimized production build. |
| `npm start` | Starts the Next.js production server. |
| `npm run lint` | Runs ESLint. |
| `npm run typecheck` | Runs TypeScript compiler to check for type errors without emitting files. |
| `npm run test` | Runs unit tests using Vitest. |
| `npm run test:e2e` | Runs end-to-end tests using Playwright. |
| `npm run bot` | Starts the Telegram bot in production mode. |
| `npm run bot:dev` | Starts the Telegram bot in development (watch) mode. |
| `npm run worker` | Starts background workers. |
