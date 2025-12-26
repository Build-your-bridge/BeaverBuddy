// src/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;

// Test connection
prisma.$connect()
  .then(() => console.log('✅ Connected to PostgreSQL via Prisma'))
  .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });