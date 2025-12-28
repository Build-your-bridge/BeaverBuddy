import { PrismaClient } from '@prisma/client';

// Create a Prisma client singleton to avoid multiple instances in dev
const prismaClientSingleton = () =>
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

declare global {
  // allow global prisma to persist across hot reloads in dev
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use the existing global prisma instance if available
const prisma: PrismaClient =
  globalThis.prisma ?? prismaClientSingleton();

// Attach to globalThis in non-production to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;

// Test connection (optional, can be removed in production)
prisma
  .$connect()
  .then(() => console.log('✅ Connected to PostgreSQL via Prisma'))
  .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });
