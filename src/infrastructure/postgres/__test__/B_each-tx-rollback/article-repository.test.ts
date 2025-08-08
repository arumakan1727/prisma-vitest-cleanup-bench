import { assert, describe, expect } from 'vitest';
import type z from 'zod';
import type { ArticleDto } from '~/core/article/usecase/+dto';
import { ArticleId } from '~/core/article/value-object';
import { ArticleRepository } from '../../repository/article';
import { ArticleFactory, CommentFactory, UserFactory } from '../factory';
import { repeatTest } from '../helpers';
import { PrismaTestTxExecutor } from './prisma-test-tx-executor';

describe('ArticleRepository', () => {
  const repository = new ArticleRepository();
  const txExecutor = new PrismaTestTxExecutor();

  describe('findById', () => {
    repeatTest('存在する記事を正常に取得できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const author = await UserFactory.use('ACTIVE').create({
          tenant: { connect: tenant },
        });

        const article = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author },
          title: 'テスト記事',
          content: 'テスト記事の内容',
        });
        const articleId = ArticleId.parse(article.id);

        // コメントも作成
        const commentAuthor = await UserFactory.use('ACTIVE').create({
          tenant: { connect: tenant },
        });

        const comment = await CommentFactory.create({
          tenant: { connect: tenant },
          article: { connect: article },
          author: { connect: commentAuthor },
          content: 'テストコメント',
        });

        // Act
        const result = await repository.findById(tx, articleId);

        // Assert
        const expected = {
          id: article.id,
          title: 'テスト記事',
          content: 'テスト記事の内容',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          author: {
            id: author.id,
            status: 'ACTIVE',
            name: author.name,
            email: expect.any(String),
          },
          comments: [
            {
              id: comment.id,
              content: 'テストコメント',
              author: {
                id: commentAuthor.id,
                status: 'ACTIVE',
                name: commentAuthor.name,
                email: expect.any(String),
              },
            },
          ],
        } as const satisfies z.input<typeof ArticleDto>;
        expect(result).toEqual(expected);
      });
    });

    repeatTest('存在しない記事IDの場合はnullを返す', async () => {
      await txExecutor.doTestTx(async ({ tx }) => {
        // Arrange
        const nonExistentId = ArticleId.parse(999999);

        // Act
        const result = await repository.findById(tx, nonExistentId);

        // Assert
        expect(result).toBeNull();
      });
    });

    repeatTest('異なるTenantの記事は取得できない', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant, withOtherTenantRls }) => {
        // Arrange
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
          title: 'Tenant1の記事',
        });
        const articleId = ArticleId.parse(article.id);

        // 他のテナントで記事を作成
        const { otherArticle } = await withOtherTenantRls(async (otherTenant) => {
          const otherAuthor = await UserFactory.use('ACTIVE').create({
            tenant: {
              connect: otherTenant,
            },
          });
          const otherArticle = await ArticleFactory.create({
            tenant: {
              connect: otherTenant,
            },
            author: {
              connect: otherAuthor,
            },
            title: 'Other Tenantの記事',
          });
          return { otherArticle };
        });

        // Act - 現在のテナントコンテキストで他テナントの記事にアクセス
        const result = await repository.findById(tx, ArticleId.parse(otherArticle.id));

        // Assert
        expect(result).toBeNull();

        // 自分のテナントの記事は取得できることを確認
        const ownResult = await repository.findById(tx, articleId);
        assert.isNotNull(ownResult);
        expect(ownResult.title).toBe('Tenant1の記事');
      });
    });
  });
});
