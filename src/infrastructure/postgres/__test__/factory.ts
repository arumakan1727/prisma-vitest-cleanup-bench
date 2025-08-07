import { bypassRlsPrisma } from './bypass-rls-prisma';
import {
  defineArticleFactory,
  defineCommentFactory,
  defineTenantFactory,
  defineUserActiveFactory,
  defineUserDeletedFactory,
  defineUserFactory,
  initialize,
} from './fabbrica.gen';

initialize({
  prisma: () => {
    // テスト用のPrismaクライアントを返す
    // 注意: ファクトリーはbypassRlsPrismaを使用するが、実際のテストではPrismaTxExecutorを使用する
    return bypassRlsPrisma;
  },
});

export const tenantFactory = defineTenantFactory({
  defaultData: async ({ seq }) => ({
    name: `Test Tenant ${seq}`,
  }),
});

export const userFactory = defineUserFactory({
  defaultData: async ({ seq }) => ({
    tenant: tenantFactory,
    name: `User ${seq}`,
  }),
  traits: {
    ACTIVE: {
      onAfterCreate: async (user) => {
        await userActiveFactory.create({
          tenant: { connect: { id: user.tenantId } },
          user: { connect: user },
        });
      },
    },
    DELETED: {
      onAfterCreate: async (user) => {
        await userDeletedFactory.create({
          tenant: { connect: { id: user.tenantId } },
          user: { connect: user },
        });
      },
    },
  },
});

// 子テーブルは export しない (userFactory の traits で user と一緒に create する)
const userActiveFactory = defineUserActiveFactory({
  defaultData: async ({ seq }) => ({
    tenant: tenantFactory,
    user: userFactory,
    email: `user${seq}@example.com`,
  }),
});

// 子テーブルは export しない (userFactory の traits で user と一緒に create する)
const userDeletedFactory = defineUserDeletedFactory({
  defaultData: async () => ({
    tenant: tenantFactory,
    user: userFactory,
  }),
});

export const articleFactory = defineArticleFactory({
  defaultData: async ({ seq }) => ({
    tenant: tenantFactory,
    author: userFactory,
    title: `Article ${seq}`,
    content: `Article content ${seq}`,
  }),
});

export const commentFactory = defineCommentFactory({
  defaultData: async ({ seq }) => ({
    tenant: tenantFactory,
    article: articleFactory,
    author: userFactory,
    content: `Comment ${seq}`,
  }),
});
