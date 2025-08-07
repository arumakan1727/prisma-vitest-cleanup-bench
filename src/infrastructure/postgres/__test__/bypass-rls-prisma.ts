import { PrismaClient } from '@prisma/client';
import { testEnv } from './test-env';

export const bypassRlsPrisma = new PrismaClient({
  datasourceUrl: testEnv.ADMIN_TEST_DATABASE_URL,
  // NOTE: postgres/prisma.ts で log を設定しているとこっちにも反映されるらしい
  // こっちで log を設定すると postgres/prisma.ts の log が上書きされてしまう (は？？？)
  // log: ['query', 'info', 'warn', 'error'],
});
