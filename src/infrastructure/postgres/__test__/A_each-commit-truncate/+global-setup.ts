import { disconnectPrisma } from '../../prisma';
import { bypassRlsPrisma, migrate, truncate } from '../bypass-rls-prisma';

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

const disconnect = async () => {
  await disconnectPrisma();
  await bypassRlsPrisma.$disconnect();
};
