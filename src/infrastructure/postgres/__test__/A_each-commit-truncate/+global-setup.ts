import { execSync } from 'node:child_process';
import { disconnectPrisma } from '../../prisma';
import { bypassRlsPrisma, truncate } from '../bypass-rls-prisma';
import { testEnv } from '../test-env';

export default () => {
  console.log('--- global setup ---');
  migrate();

  // teardown 関数は戻り値で返す
  return async () => {
    console.log('--- global teardown ---');
    await truncate({ restartIdentity: true });
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

const disconnect = async () => {
  await disconnectPrisma();
  await bypassRlsPrisma.$disconnect();
};
