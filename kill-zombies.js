const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('Terminating connections...');
  try {
    const result = await db.$executeRawUnsafe(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();"
    );
    console.log('Done:', result);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await db.$disconnect();
  }
}

main();
