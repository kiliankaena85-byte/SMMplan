const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "SecurityEvent";')
  .then(() => console.log('Dropped'))
  .finally(() => prisma.$disconnect());
