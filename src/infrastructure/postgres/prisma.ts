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

type PrismaClientWithQueryEmit = PrismaClient<{ log: { level: 'query'; emit: 'event' }[] }>;

const installQueryLoggerTo = (prisma: PrismaClientWithQueryEmit) => {
  const logQuery = (e: Prisma.QueryEvent, isSlow: boolean) => {
    // TODO: ちゃんとしたロガーを使う
    const logLevel = isSlow ? 'warn' : 'log';
    if (isSlow) {
      console[logLevel]('------ SLOW QUERY ------');
    }
    console[logLevel](`Query: ${e.query}`);
    console[logLevel](`Params: ${e.params}`);
    console[logLevel](`Duration: ${e.duration}ms`);
  };
  switch (env.SQL_LOG_LEVEL) {
    case 'All':
      prisma.$on('query', (e) => {
        logQuery(e, false);
      });
      break;

    case 'OnlySlow':
      prisma.$on('query', (e) => {
        if (e.duration > env.SQL_SLOW_THRESHOLD_MS) {
          logQuery(e, true);
        }
      });
      break;

    case 'Silent':
      break;

    default: {
      const exhaustiveCheck: never = env.SQL_LOG_LEVEL;
      throw new Error(`Invalid SQL_LOG_LEVEL: ${exhaustiveCheck}`);
    }
  }
};

const createPrismaSingleton = () => {
  let instance: PrismaClient | null = null;

  const getPrismaClient = (): PrismaClient => {
    if (instance) return instance;

    instance = new PrismaClient({
      datasourceUrl: env.APP_DATABASE_URL,
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
    });
    installQueryLoggerTo(instance);
    return instance;
  };

  const disconnectPrisma = async (): Promise<void> => {
    if (instance != null) {
      await instance.$disconnect();
      instance = null;
    }
  };

  return {
    getPrismaClient,
    disconnectPrisma,
  };
};

const { getPrismaClient, disconnectPrisma } = createPrismaSingleton();
export { disconnectPrisma };

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
  constructor(readonly getPrisma: () => PrismaClient | Promise<PrismaClient> = getPrismaClient) {}

  async doReadOnlyTx<TResult>(
    tenantId: TenantId,
    fn: (tx: PrismaReadOnlyTxHandle) => Promise<TResult>,
    options?: TransactionOptions
  ): Promise<TResult> {
    const prisma = await this.getPrisma();
    return prisma.$transaction(async (tx) => {
      await setTenantIdLocally(tx, tenantId);
      return await fn(new PrismaReadOnlyTxHandle(tenantId, tx));
    }, options);
  }

  async doReadWriteTx<TResult>(
    tenantId: TenantId,
    fn: (tx: PrismaReadWriteTxHandle) => Promise<TResult>,
    options?: TransactionOptions
  ): Promise<TResult> {
    const prisma = await this.getPrisma();
    return prisma.$transaction(async (tx) => {
      await setTenantIdLocally(tx, tenantId);
      return await fn(new PrismaReadWriteTxHandle(tenantId, tx));
    }, options);
  }
}

const setTenantIdLocally = (tx: PrismaTx, tenantId: TenantId) => {
  return tx.$executeRaw`SELECT set_config('app.tenantId', ${tenantId}, TRUE)`;
};
