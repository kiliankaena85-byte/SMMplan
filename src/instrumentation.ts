/**
 * Next.js Server Instrumentation (Runtime startup validation hook)
 * Runs once when Next.js server initializes.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const isTest = process.env.NODE_ENV === 'test' || process.env.APP_ENV === 'test';
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

    if (!isTest && !isBuild) {
      const jwtSecret = process.env.JWT_SECRET;
      const appEncryptionKey = process.env.APP_ENCRYPTION_KEY;

      if (!jwtSecret) {
        console.error('[Instrumentation] FATAL: JWT_SECRET environment variable is not set.');
        if (process.env.NODE_ENV === 'production') process.exit(1);
      } else if (jwtSecret.length < 32) {
        console.error('[Instrumentation] FATAL: JWT_SECRET must be at least 32 characters long.');
        if (process.env.NODE_ENV === 'production') process.exit(1);
      }

      if (!appEncryptionKey) {
        console.error('[Instrumentation] FATAL: APP_ENCRYPTION_KEY environment variable is not set.');
        if (process.env.NODE_ENV === 'production') process.exit(1);
      } else if (appEncryptionKey.length !== 64) {
        console.error('[Instrumentation] FATAL: APP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
        if (process.env.NODE_ENV === 'production') process.exit(1);
      }
    }
  }
}
