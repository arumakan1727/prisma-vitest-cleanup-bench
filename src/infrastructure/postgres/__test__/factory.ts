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

export const TenantFactory = defineTenantFactory({
  defaultData: async ({ seq }) => ({
    name: `Test Tenant ${seq}`,
  }),
});

export const UserFactory = defineUserFactory({
  defaultData: async ({ seq }) => ({
    tenant: TenantFactory,
    name: `User ${seq}`,
  }),
  traits: {
    ACTIVE: {
      onAfterCreate: async (user) => {
        await UserActiveFactory.create({
          tenant: { connect: { id: user.tenantId } },
          user: { connect: user },
        });
      },
    },
    DELETED: {
      onAfterCreate: async (user) => {
        await UserDeletedFactory.create({
          tenant: { connect: { id: user.tenantId } },
          user: { connect: user },
        });
      },
    },
  },
});

// 子テーブルは export しない (UserFactory の traits で user と一緒に create する)
const UserActiveFactory = defineUserActiveFactory({
  defaultData: async ({ seq }) => ({
    tenant: TenantFactory,
    user: UserFactory,
    email: `user${seq}@example.com`,
  }),
});

// 子テーブルは export しない (UserFactory の traits で user と一緒に create する)
const UserDeletedFactory = defineUserDeletedFactory({
  defaultData: async () => ({
    tenant: TenantFactory,
    user: UserFactory,
  }),
});

export const ArticleFactory = defineArticleFactory({
  defaultData: async ({ seq }) => ({
    tenant: TenantFactory,
    author: UserFactory,
    title: `Article ${seq}`,
    content: `Article content ${seq}`,
  }),
});

export const CommentFactory = defineCommentFactory({
  defaultData: async ({ seq }) => ({
    tenant: TenantFactory,
    article: ArticleFactory,
    author: UserFactory,
    content: `Comment ${seq}`,
  }),
});
