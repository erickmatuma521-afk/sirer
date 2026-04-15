import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

/**
 * Sur Vercel (serverless), réutiliser l’instance évite d’exploser le nombre de connexions
 * vers le pooler Supabase. Les paramètres critiques sont dans DATABASE_URL côté Vercel :
 * pgbouncer=true, connection_limit=1, sslmode=require (voir backend/.env.example).
 */
export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.__prisma = prisma;
