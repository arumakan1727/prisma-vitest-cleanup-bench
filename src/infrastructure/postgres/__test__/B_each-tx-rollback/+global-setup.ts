import { disconnectPrisma } from '../../prisma';
import { bypassRlsPrisma, migrate, truncate } from '../bypass-rls-prisma';

export default async () => {
  console.log('--- global setup (B_each-tx-rollback) ---');
  migrate();

  // teardown 関数は戻り値で返す
  return async () => {
    console.log('--- global teardown (B_each-tx-rollback) ---');
    await truncate();
    await disconnect();
  };
};

const disconnect = async () => {
  await disconnectPrisma();
  await bypassRlsPrisma.$disconnect();
};
