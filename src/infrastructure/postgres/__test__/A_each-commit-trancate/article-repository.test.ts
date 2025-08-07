import { afterEach, assert, describe, expect, it } from 'vitest';
import { ArticleId } from '~/core/article/value-object';
import { TenantId } from '~/core/tenant/value-object';
import { PrismaTxExecutor } from '../../prisma';
import { ArticleRepository } from '../../repository/article';
import { truncate } from '../+global-setup';
import { ArticleFactory, CommentFactory, TenantFactory, UserFactory } from '../factory';
import { testEnv } from '../test-env';

describe('ArticleRepository', () => {
  const repository = new ArticleRepository();
  const txExecutor = new PrismaTxExecutor();

  afterEach(async () => {
    await truncate();
  });

  describe('findById', () => {
    const repeatTest = (name: string, fn: () => Promise<void>) => {
      it(name, async () => {
        for (let i = 0; i < testEnv.TEST_REPEAT_COUNT; i++) {
          await fn();
          if (i < testEnv.TEST_REPEAT_COUNT - 1) {
            await truncate();
          }
        }
      });
    };

    repeatTest('存在する記事を正常に取得できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: {
          connect: tenant,
        },
      });

      const article = await ArticleFactory.create({
        tenant: {
          connect: tenant,
        },
        author: {
          connect: author,
        },
        title: 'テスト記事',
        content: 'テスト記事の内容',
      });
      const articleId = ArticleId.parse(article.id);

      // コメントも作成
      const commentAuthor = await UserFactory.use('ACTIVE').create({
        tenant: {
          connect: tenant,
        },
      });

      await CommentFactory.create({
        tenant: {
          connect: tenant,
        },
        article: {
          connect: article,
        },
        author: {
          connect: commentAuthor,
        },
        content: 'テストコメント',
      });

      // Act
      const result = await txExecutor.doReadOnlyTx(tenantId, async (txHandle) =>
        repository.findById(txHandle, articleId)
      );

      // Assert
      assert.isNotNull(result);
      expect(result.id).toBe(article.id);
      expect(result.title).toBe('テスト記事');
      expect(result.content).toBe('テスト記事の内容');
      expect(result.author.status).toBe('ACTIVE');
      expect(result.author.name).toBe(author.name);
      expect(result.comments).toHaveLength(1);
      const firstComment = result.comments[0];
      assert.isDefined(firstComment);
      expect(firstComment.content).toBe('テストコメント');
      expect(firstComment.author.name).toBe(commentAuthor.name);
    });

    repeatTest('存在しない記事IDの場合はnullを返す', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);
      const nonExistentId = ArticleId.parse(999999);

      // Act
      const result = await txExecutor.doReadOnlyTx(tenantId, async (txHandle) =>
        repository.findById(txHandle, nonExistentId)
      );

      // Assert
      expect(result).toBeNull();
    });

    repeatTest('異なるTenantの記事は取得できない', async () => {
      // Arrange
      const tenant1 = await TenantFactory.create({ name: 'Tenant 1' });
      const tenant2 = await TenantFactory.create({ name: 'Tenant 2' });
      const tenant2Id = TenantId.parse(tenant2.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: {
          connect: tenant1,
        },
      });
      const article = await ArticleFactory.create({
        tenant: {
          connect: tenant1,
        },
        author: {
          connect: author,
        },
        title: 'Tenant1の記事',
      });
      const articleId = ArticleId.parse(article.id);

      // Act - tenant2のコンテキストでアクセス
      const result = await txExecutor.doReadOnlyTx(tenant2Id, async (txHandle) =>
        repository.findById(txHandle, articleId)
      );

      // Assert
      expect(result).toBeNull();
    });
  });
});
