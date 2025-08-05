import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';


dotenv.config();

declare global {
 
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'], 
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
