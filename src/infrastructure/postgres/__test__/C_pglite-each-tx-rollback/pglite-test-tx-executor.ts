import * as fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { TenantId } from '~/core/tenant/value-object';
import { type PrismaReadWriteTxHandle, PrismaTxExecutor } from '../../prisma';
import { setFactoryPrismaClient } from '../factory';
import { testEnv } from '../test-env';
import {
  applyMigrations,
  MAIN_TENANT_ID,
  OTHER_TENANT_ID,
  prepareTenants,
  TEST_PGLITE_MIGRATION_SNAPSHOT_PATH,
} from './+global-setup';

type PrismaTx = Omit<PrismaClient, ITXClientDenyList>;

const createPGlitePrismaSingleton = () => {
  let instance: PrismaClient | null = null;
  let pg: PGlite | null = null;

  const getPGlitePrisma = async () => {
    if (instance) return instance;

    if (testEnv.METHOD_C_DB_INIT_STRATEGY === 'snapshot') {
      console.log(
        'createPGlitePrismaSingleton::getPGlitePrisma: loading snapshot from',
        TEST_PGLITE_MIGRATION_SNAPSHOT_PATH
      );
      const buffer = await fs.readFile(TEST_PGLITE_MIGRATION_SNAPSHOT_PATH);
      const snapshotBlob = new Blob([new Uint8Array(buffer)]);

      pg ??= new PGlite({
        dataDir: 'memory://',
        extensions: { citext },
        loadDataDir: snapshotBlob,
        username: 'app',
      });
    } else {
      pg ??= new PGlite({
        dataDir: 'memory://',
        extensions: { citext },
      });
      await applyMigrations(pg);
    }

    const adapter = new PrismaPGlite(pg);
    instance = new PrismaClient({ adapter, log: ['query', 'info', 'warn', 'error'] });
    if (testEnv.METHOD_C_DB_INIT_STRATEGY === 'applyMigrationsEveryTest') {
      await prepareTenants(instance);
    }
    return instance;
  };

  const disconnectPGlitePrisma = async () => {
    await instance?.$disconnect();
    await pg?.close();
    instance = null;
    pg = null;
  };

  return { getPGlitePrisma, disconnectPGlitePrisma };
};

const { getPGlitePrisma } = createPGlitePrismaSingleton();

const ROLLBACK_SYMBOL = Symbol('rollback');

export class PGlitePrismaTestTxExecutor {
  private readonly txExecutor = new PrismaTxExecutor(getPGlitePrisma);

  async doTestTx(
    fn: (params: {
      tx: PrismaReadWriteTxHandle;
      tenant: { id: TenantId };
      withOtherTenantRls: <T>(fn: (otherTenant: { id: TenantId }) => Promise<T>) => Promise<T>;
    }) => Promise<void>
  ): Promise<void> {
    const tenant = { id: TenantId.parse(MAIN_TENANT_ID) };
    const otherTenant = { id: TenantId.parse(OTHER_TENANT_ID) };

    try {
      await this.txExecutor.doReadWriteTx(tenant.id, async (tx) => {
        setFactoryPrismaClient(tx.prisma as PrismaClient);

        const withOtherTenantRls = async <T>(
          otherTenantFn: (otherTenant: { id: TenantId }) => Promise<T>
        ): Promise<T> => {
          await setTenantIdLocally(tx.prisma, otherTenant.id);
          try {
            return await otherTenantFn(otherTenant);
          } finally {
            await setTenantIdLocally(tx.prisma, tenant.id);
          }
        };

        await fn({ tx, tenant, withOtherTenantRls });

        // テスト後にロールバック
        // queryRaw`ROLLBACK` でもロールバックはできるが、その後に COMMIT が実行されてしまう (エラーにはならないが...)
        throw ROLLBACK_SYMBOL;
      });
    } catch (e) {
      if (e !== ROLLBACK_SYMBOL) {
        throw e;
      }
    }
  }
}

const setTenantIdLocally = (tx: PrismaTx, tenantId: string) => {
  return tx.$executeRaw`SELECT set_config('app.tenantId', ${tenantId}, TRUE)`;
};
