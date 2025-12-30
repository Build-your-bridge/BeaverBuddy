"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Create a Prisma client singleton to avoid multiple instances in dev
const prismaClientSingleton = () => new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
// Use the existing global prisma instance if available
const prisma = globalThis.prisma ?? prismaClientSingleton();
// Attach to globalThis in non-production to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
exports.default = prisma;
// Test connection (optional, can be removed in production)
prisma
    .$connect()
    .then(() => console.log('✅ Connected to PostgreSQL via Prisma'))
    .catch((error) => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
});
