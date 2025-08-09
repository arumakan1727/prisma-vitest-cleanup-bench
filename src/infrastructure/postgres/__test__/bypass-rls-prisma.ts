import { PrismaClient } from '@prisma/client';
import { testEnv } from './test-env';

export const bypassRlsPrisma = new PrismaClient({
  datasourceUrl: testEnv.ADMIN_TEST_DATABASE_URL,
  // NOTE: postgres/prisma.ts で log を設定しているとこっちにも反映されるらしい
  // こっちで log を設定すると postgres/prisma.ts の log が上書きされてしまう (は？？？)
  // log: ['query', 'info', 'warn', 'error'],
});
export const truncate = async (opts?: { restartIdentity?: boolean }) => {
  // TRUNCATE は DELETE と異なりスキャンしないので高速。
  // CASCADE すると子孫テーブルも TRUNCATE される。
  if (opts?.restartIdentity) {
    await bypassRlsPrisma.$executeRaw`TRUNCATE TABLE "tenants" RESTART IDENTITY CASCADE`;
  } else {
    await bypassRlsPrisma.$executeRaw`TRUNCATE TABLE "tenants" CASCADE`;
  }
};
