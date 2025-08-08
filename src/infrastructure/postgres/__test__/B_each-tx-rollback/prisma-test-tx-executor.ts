import type { PrismaClient, Tenant } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import { TenantId } from '~/core/tenant/value-object';
import { type PrismaReadWriteTxHandle, PrismaTxExecutor } from '../../prisma';
import { bypassRlsPrisma } from '../bypass-rls-prisma';
import { setFactoryPrismaClient, TenantFactory } from '../factory';

type PrismaTx = Omit<PrismaClient, ITXClientDenyList>;

export class PrismaTestTxExecutor {
  private tenant: Tenant | null = null;
  private otherTenant: Tenant | null = null;
  private readonly txExecutor = new PrismaTxExecutor();

  async doTestTx<TResult>(
    fn: (params: {
      tx: PrismaReadWriteTxHandle;
      tenant: Tenant;
      withOtherTenantRls: <T>(fn: (otherTenant: Tenant) => Promise<T>) => Promise<T>;
    }) => Promise<TResult>
  ): Promise<TResult> {
    const { tenant, otherTenant } = await this.ensureTenantAndOtherTenant();
    console.log('doTestTx::tenant', tenant);
    console.log('doTestTx::otherTenant', otherTenant);
    const tenantId = TenantId.parse(tenant.id);

    return await this.txExecutor.doReadWriteTx(tenantId, async (tx) => {
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

      const result = await fn({ tx, tenant, withOtherTenantRls });

      // テスト後にロールバック
      await tx.prisma.$executeRaw`ROLLBACK`;

      return result;
    });
  }

  private async ensureTenantAndOtherTenant() {
    setFactoryPrismaClient(bypassRlsPrisma);

    if (!this.tenant) {
      this.tenant = await TenantFactory.create({ name: 'Main Tenant' });
    }
    if (!this.otherTenant) {
      this.otherTenant = await TenantFactory.create({ name: 'Other Tenant' });
    }
    return { tenant: this.tenant, otherTenant: this.otherTenant };
  }
}

const setTenantIdLocally = (tx: PrismaTx, tenantId: string) => {
  return tx.$executeRaw`SELECT set_config('app.tenantId', ${tenantId}, TRUE)`;
};
