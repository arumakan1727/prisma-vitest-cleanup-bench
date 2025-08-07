import { type Prisma, PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import type {
  IReadOnlyTxHandle,
  IReadWriteTxHandle,
  ITxExecutor,
  TransactionOptions,
} from '~/core/+shared/interface/transaction';
import type { TenantId } from '~/core/tenant/value-object';
import { env } from '~/env';

let prisma: PrismaClient<{ log: { level: 'query'; emit: 'event' }[] }> | null = null;

export const disconnectPrisma = async () => {
  await prisma?.$disconnect();
};

const QUERY_SLOW_THRESHOLD = env.PRISMA_SLOW_QUERY_THRESHOLD_MS;

const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    console.log('NODE_ENV:', env.NODE_ENV);
    console.log('PRISMA_LOG_LEVEL:', env.PRISMA_LOG_LEVEL);
    console.log('PRISMA_SLOW_QUERY_THRESHOLD_MS:', env.PRISMA_SLOW_QUERY_THRESHOLD_MS);

    prisma = new PrismaClient({
      datasourceUrl: env.APP_DATABASE_URL,
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    });
    const logQuery = (e: Prisma.QueryEvent, isSlow: boolean) => {
      const logLevel = isSlow ? 'warn' : 'log';
      if (isSlow) {
        console[logLevel]('------ SLOW QUERY ------');
      }
      console[logLevel](`Query: ${e.query}`);
      console[logLevel](`Params: ${e.params}`);
      console[logLevel](`Duration: ${e.duration}ms`);
    };
    switch (env.PRISMA_LOG_LEVEL) {
      case 'AllQuery':
        prisma.$on('query', (e) => {
          logQuery(e, false);
        });
        break;
      case 'SlowQuery':
        prisma.$on('query', (e) => {
          if (e.duration > QUERY_SLOW_THRESHOLD) {
            logQuery(e, true);
          }
        });
        break;
      case 'NoQuery':
        break;
      default: {
        const exhaustiveCheck: never = env.PRISMA_LOG_LEVEL;
        throw new Error(`Invalid PRISMA_LOG_LEVEL: ${exhaustiveCheck}`);
      }
    }
  }

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

export class PrismaTxExecutor
  implements ITxExecutor<PrismaReadOnlyTxHandle, PrismaReadWriteTxHandle>
{
  doReadOnlyTx<TResult>(
    tenantId: TenantId,
    fn: (tx: PrismaReadOnlyTxHandle) => Promise<TResult>,
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
    fn: (tx: PrismaReadWriteTxHandle) => Promise<TResult>,
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
