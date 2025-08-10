import type { PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
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

export const setFactoryPrismaClient = (prisma: Omit<PrismaClient, ITXClientDenyList>) => {
  initialize({
    prisma: () => prisma as PrismaClient,
  });
};

// デフォルトはbypassRlsPrisma
setFactoryPrismaClient(bypassRlsPrisma);

export const TenantFactory = defineTenantFactory({
  defaultData: async ({ seq }) => ({
    name: `Test Tenant ${seq}`,
  }),
});

type IdOnlyTenant = { id: string };

export const UserFactory = {
  ...defineUserFactory({
    defaultData: async ({ seq }) => ({
      tenant: TenantFactory,
      name: `User ${seq}`,
    }),
  }),
  createActive: async ({ tenant }: { tenant: IdOnlyTenant }) => {
    const user = await UserFactory.create({
      tenant: { connect: tenant },
    });
    const active = await UserActiveFactory.create({
      tenant: { connect: tenant },
      user: { connect: user },
    });
    return {
      ...user,
      active,
    };
  },
  createDeleted: async ({ tenant }: { tenant: IdOnlyTenant }) => {
    const user = await UserFactory.create({
      tenant: { connect: tenant },
    });
    const deleted = await UserDeletedFactory.create({
      tenant: { connect: tenant },
      user: { connect: user },
    });
    return {
      ...user,
      deleted,
    };
  },
};

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
