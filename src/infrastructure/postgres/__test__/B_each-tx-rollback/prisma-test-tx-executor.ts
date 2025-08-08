import type { PrismaClient, Tenant } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import { TenantId } from '~/core/tenant/value-object';
import { type PrismaReadWriteTxHandle, PrismaTxExecutor } from '../../prisma';
import { bypassRlsPrisma } from '../bypass-rls-prisma';
import { setFactoryPrismaClient, TenantFactory } from '../factory';

type PrismaTx = Omit<PrismaClient, ITXClientDenyList>;

const ROLLBACK_SYMBOL = Symbol('rollback');

export class PrismaTestTxExecutor {
  private tenant: Tenant | null = null;
  private otherTenant: Tenant | null = null;
  private readonly txExecutor = new PrismaTxExecutor();

  async doTestTx(
    fn: (params: {
      tx: PrismaReadWriteTxHandle;
      tenant: Tenant;
      withOtherTenantRls: <T>(fn: (otherTenant: Tenant) => Promise<T>) => Promise<T>;
    }) => Promise<void>
  ): Promise<void> {
    const { tenant, otherTenant } = await this.ensureTenantAndOtherTenant();
    const tenantId = TenantId.parse(tenant.id);

    try {
      await this.txExecutor.doReadWriteTx(tenantId, async (tx) => {
        setFactoryPrismaClient(tx.prisma as PrismaClient);

        const withOtherTenantRls = async <T>(
          otherTenantFn: (otherTenant: Tenant) => Promise<T>
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

  private async ensureTenantAndOtherTenant() {
    setFactoryPrismaClient(bypassRlsPrisma);

    if (!this.tenant) {
      this.tenant = await TenantFactory.create({ name: 'Main Tenant' });
      console.log('PrismaTestTxExecutor::tenant', this.tenant);
    }
    if (!this.otherTenant) {
      this.otherTenant = await TenantFactory.create({ name: 'Other Tenant' });
      console.log('PrismaTestTxExecutor::otherTenant', this.otherTenant);
    }
    return { tenant: this.tenant, otherTenant: this.otherTenant };
  }
}

const setTenantIdLocally = (tx: PrismaTx, tenantId: string) => {
  return tx.$executeRaw`SELECT set_config('app.tenantId', ${tenantId}, TRUE)`;
};
