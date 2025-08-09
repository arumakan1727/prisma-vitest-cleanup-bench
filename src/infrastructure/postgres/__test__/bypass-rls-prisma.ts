import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { testEnv } from './test-env';

export const bypassRlsPrisma = new PrismaClient({
  datasourceUrl: testEnv.ADMIN_TEST_DATABASE_URL,
  // NOTE:
  // こっちで log を設定すると postgres/prisma.ts の log が上書きされてしまう (は？？？)
  // log の設定はグローバルになっていそうで、postgres/prisma.ts で log を設定しているとこっちにも反映される
  // log: ['query', 'info', 'warn', 'error'],
});

export const truncate = async (opts?: { restartIdentity?: boolean }) => {
  // CASCADE すると子孫テーブルも TRUNCATE される。
  if (opts?.restartIdentity) {
    await bypassRlsPrisma.$executeRaw`TRUNCATE TABLE "tenants" RESTART IDENTITY CASCADE`;
  } else {
    await bypassRlsPrisma.$executeRaw`TRUNCATE TABLE "tenants" CASCADE`;
  }
};

export const migrate = () => {
  execSync('pnpm prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      // prisma/schema.prisma では ADMIN_DATABASE_URL を参照しているのでその値を上書き
      ADMIN_DATABASE_URL: testEnv.ADMIN_TEST_DATABASE_URL,
    },
  });
};
