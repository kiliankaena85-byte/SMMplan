import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  if (typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
    // Return mock proxy for Browser/Edge Runtime to prevent native binary evaluation crashes
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error('PrismaClient cannot be executed in Browser or Next.js Edge Runtime. Use Server Components or Server Actions.');
      }
    });
  }

  const rawPrisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: ['query', 'error', 'warn'],
    });

  const guarded = (rawPrisma as unknown as {
    $extends: (extension: unknown) => PrismaClient;
  }).$extends({
    query: {
      service: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async deleteMany({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
          if (!args?.where || Object.keys(args.where).length === 0) {
            if (process.env.APP_ENV !== 'test' && process.env.ALLOW_UNSAFE_PURGE !== 'true') {
              throw new Error('🚨 [SAFE-GUARD] Unconditional Service.deleteMany() is blocked to prevent catalog loss!');
            }
          }
          return query(args);
        },
      },
      category: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async deleteMany({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
          if (!args?.where || Object.keys(args.where).length === 0) {
            if (process.env.APP_ENV !== 'test' && process.env.ALLOW_UNSAFE_PURGE !== 'true') {
              throw new Error('🚨 [SAFE-GUARD] Unconditional Category.deleteMany() is blocked to prevent catalog loss!');
            }
          }
          return query(args);
        },
      },
      network: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async deleteMany({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
          if (!args?.where || Object.keys(args.where).length === 0) {
            if (process.env.APP_ENV !== 'test' && process.env.ALLOW_UNSAFE_PURGE !== 'true') {
              throw new Error('🚨 [SAFE-GUARD] Unconditional Network.deleteMany() is blocked to prevent catalog loss!');
            }
          }
          return query(args);
        },
      },
      ledgerEntry: {
        async deleteMany() {
          throw new Error('🚨 [SAFE-GUARD] LedgerEntry deletion is strictly forbidden (Financial Audit Trail)!');
        },
      },
    },
  }) as unknown as PrismaClient;

  return guarded;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && process.env.NEXT_RUNTIME !== 'edge') {
  globalForPrisma.prisma = db;
}
