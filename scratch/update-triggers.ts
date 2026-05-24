import { PrismaClient } from '@prisma/client';

async function updateDb(url: string, name: string) {
  console.log(`Connecting to ${name} at ${url}...`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION block_ledger_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (TG_OP = 'UPDATE' AND OLD.status = 'QUARANTINE') THEN
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Financial Ledger is immutable. UPDATE and DELETE actions are strictly forbidden.';
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log(`✅ Successfully updated block_ledger_mutation trigger function in ${name}`);
  } catch (error) {
    console.error(`❌ Failed to update trigger in ${name}:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const devUrl = 'postgresql://postgres:postgres@127.0.0.1:5433/smmplan_lite?schema=public';
  const testUrl = 'postgresql://postgres:postgres@127.0.0.1:5433/smmplan_test?schema=public';

  await updateDb(devUrl, 'smmplan_lite (Dev DB)');
  await updateDb(testUrl, 'smmplan_test (Test DB)');
}

main().catch(console.error);
