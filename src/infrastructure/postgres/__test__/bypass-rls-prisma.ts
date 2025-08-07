import { PrismaClient } from '@prisma/client';
import { testEnv } from './test-env';

export const bypassRlsPrisma = new PrismaClient({
  datasourceUrl: testEnv.ADMIN_TEST_DATABASE_URL,
  log: ['query', 'info', 'warn', 'error'],
});
