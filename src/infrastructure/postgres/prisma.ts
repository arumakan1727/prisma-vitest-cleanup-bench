import { PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import type {
  IReadOnlyTxHandle,
  IReadWriteTxHandle,
  ITxExecutor,
  TransactionOptions,
} from '~/core/+shared/interface/transaction';
import type { TenantId } from '~/core/tenant/value-object';
import { env } from '~/env';

let prisma: PrismaClient | null = null;

export const disconnectPrisma = async () => {
  await prisma?.$disconnect();
};

const getPrismaClient = (): PrismaClient => {
  prisma ??= new PrismaClient({
    datasourceUrl: env.APP_DATABASE_URL,
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  return prisma;
};

type PrismaTx = Omit<PrismaClient, ITXClientDenyList>;

export class PrismaReadOnlyTxHandle implements IReadOnlyTxHandle {
  constructor(
    readonly tenantId: TenantId,
    readonly prisma: PrismaTx
  ) {}
}

export class PrismaReadWriteTxHandle extends PrismaReadOnlyTxHandle implements IReadWriteTxHandle {
  readonly __type = 'ReadWrite'; // Opaque Type to distinguish from IReadOnlyTxHandle
}

export class PrismaTxExecutor implements ITxExecutor {
  doReadOnlyTx<TResult>(
    tenantId: TenantId,
    fn: (txHandle: IReadOnlyTxHandle) => Promise<TResult>,
    options?: TransactionOptions
  ): Promise<TResult> {
    const prisma = getPrismaClient();
    return prisma.$transaction(async (tx) => {
      await setTenantIdLocally(tx, tenantId);
      return await fn(new PrismaReadOnlyTxHandle(tenantId, tx));
    }, options);
  }

  doReadWriteTx<TResult>(
    tenantId: TenantId,
    fn: (txHandle: IReadWriteTxHandle) => Promise<TResult>,
    options?: TransactionOptions
  ): Promise<TResult> {
    const prisma = getPrismaClient();
    return prisma.$transaction(async (tx) => {
      await setTenantIdLocally(tx, tenantId);
      return await fn(new PrismaReadWriteTxHandle(tenantId, tx));
    }, options);
  }
}

const setTenantIdLocally = (tx: PrismaTx, tenantId: TenantId) => {
  return tx.$executeRaw`SELECT set_config('app.tenantId', ${tenantId}, TRUE)`;
};
