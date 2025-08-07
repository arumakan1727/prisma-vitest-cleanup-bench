import { execSync } from 'node:child_process';
import { disconnectPrisma } from '../prisma';
import { bypassRlsPrisma } from './bypass-rls-prisma';
import { testEnv } from './test-env';

export default () => {
  console.log('--- global setup ---');
  migrate();

  // teardown 関数は戻り値で返す
  return async () => {
    console.log('--- global teardown ---');
    // トランザクションのロールバックが失敗した場合のために TRUNCATE を実行する
    // await truncate();
    await disconnect();
  };
};

const migrate = () => {
  execSync('pnpm prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      // prisma/schema.prisma では ADMIN_DATABASE_URL を参照しているのでその値を上書き
      ADMIN_DATABASE_URL: testEnv.ADMIN_TEST_DATABASE_URL,
    },
  });
};

export const truncate = async () => {
  // TRUNCATE は DELETE と異なりスキャンしないので高速。
  // CASCADE すると子孫テーブルも TRUNCATE される。
  await bypassRlsPrisma.$executeRaw`TRUNCATE TABLE "Tenant" RESTART IDENTITY CASCADE`;
};

const disconnect = async () => {
  await disconnectPrisma();
  await bypassRlsPrisma.$disconnect();
};
