import { Prisma } from '@prisma/client';
import { assert, describe, expect } from 'vitest';
import type z from 'zod';
import type { ArticleDto } from '~/core/article/usecase/+dto';
import { ArticleContent, ArticleId, ArticleTitle } from '~/core/article/value-object';
import { TenantId } from '~/core/tenant/value-object';
import { UserId } from '~/core/user/value-object';
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
        const author = await UserFactory.createActive({ tenant });
        const article = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author },
          title: 'テスト記事',
          content: 'テスト記事の内容',
        });
        const articleId = ArticleId.parse(article.id);

        // コメントも作成
        const commentAuthor = await UserFactory.createActive({ tenant });
        const comment = await CommentFactory.create({
          tenant: { connect: tenant },
          article: { connect: article },
          author: { connect: commentAuthor },
          content: 'テストコメント',
        });

        // Act
        const result = await repository.findById(tx, articleId);

        // Assert
        expect(result).toEqual({
          id: article.id,
          title: 'テスト記事',
          content: 'テスト記事の内容',
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          author: {
            id: author.id,
            status: 'ACTIVE',
            name: author.name,
            email: author.active.email,
          },
          comments: [
            {
              id: comment.id,
              content: 'テストコメント',
              author: {
                id: commentAuthor.id,
                status: 'ACTIVE',
                name: commentAuthor.name,
                email: commentAuthor.active.email,
              },
            },
          ],
        } as const satisfies z.input<typeof ArticleDto>);
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
        const author = await UserFactory.createActive({ tenant });
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
          const otherAuthor = await UserFactory.createActive({ tenant: otherTenant });
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

  describe('create', () => {
    repeatTest('RLSのtenantIdとは別のtenantIdでUserを作成してみる (エラーになるはず)', async () => {
      await txExecutor.doTestTx(async ({ tx, withOtherTenantRls }) => {
        // Arrange
        const otherTenantId = await withOtherTenantRls(async (otherTenant) => {
          return otherTenant.id;
        });

        // Act
        let error: unknown;
        try {
          await tx.prisma.user.create({
            data: {
              tenantId: otherTenantId,
              name: 'Other Tenant User',
            },
          });
          // エラーが発生しなかった場合はテスト失敗
          throw new Error('Expected error to be thrown');
        } catch (e) {
          error = e;
        }

        // Assert
        assert.instanceOf(error, Prisma.PrismaClientUnknownRequestError);
        assert.strictEqual(error.constructor.name, 'PrismaClientUnknownRequestError');
        console.log('-------------------------');
        console.log(typeof error);
        console.log(error);
        console.log(error.message);
        console.log(' - - - - - - ');
        console.log(error.cause);
        console.log('-------------------------');

        // PrismaClientUnknownRequestError ではエラーの情報が message という文字列になってしまっており、構造化して取り出す術はない (悲しいね)
        assert.match(
          error.message,
          /new row violates row-level security policy for table \\"users\\"/
        );
        assert.match(error.message, /code: "42501"/);
        assert.match(error.message, /severity: "ERROR"/);
      });
    });

    repeatTest('新しい記事を正常に作成できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const author = await UserFactory.createActive({ tenant });
        const authorId = UserId.parse(author.id);

        const articleCreate = {
          title: ArticleTitle.parse('新しい記事のタイトル'),
          content: ArticleContent.parse('新しい記事の内容です。'),
          authorId,
        };

        // Act
        const createdId = await repository.create(tx, articleCreate);

        // Assert
        expect(createdId).toBeDefined();
        expect(createdId).toBeGreaterThan(0);

        // 作成された記事を確認
        const created = await repository.findById(tx, createdId);

        assert.isNotNull(created);
        expect(created.id).toBe(createdId);
        expect(created.title).toBe('新しい記事のタイトル');
        expect(created.content).toBe('新しい記事の内容です。');
        expect(created.author.status).toBe('ACTIVE');
        if (created.author.status === 'ACTIVE') {
          expect(created.author.id).toBe(authorId);
        }
      });
    });

    repeatTest('タイトルが最大長の記事を作成できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const author = await UserFactory.createActive({ tenant });
        const authorId = UserId.parse(author.id);

        const maxLengthTitle = 'あ'.repeat(80); // ArticleTitleの最大長は80文字
        const articleCreate = {
          title: ArticleTitle.parse(maxLengthTitle),
          content: ArticleContent.parse('内容'),
          authorId,
        };

        // Act
        const createdId = await repository.create(tx, articleCreate);

        // Assert
        const created = await repository.findById(tx, createdId);

        assert.isNotNull(created);
        expect(created.title).toBe(maxLengthTitle);
        expect(created.title.length).toBe(80);
      });
    });

    repeatTest('コンテンツが最大長の記事を作成できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const author = await UserFactory.createActive({ tenant });
        const authorId = UserId.parse(author.id);

        const maxLengthContent = 'あ'.repeat(1000); // ArticleContentの最大長は1000文字
        const articleCreate = {
          title: ArticleTitle.parse('タイトル'),
          content: ArticleContent.parse(maxLengthContent),
          authorId,
        };

        // Act
        const createdId = await repository.create(tx, articleCreate);

        // Assert
        const created = await repository.findById(tx, createdId);

        assert.isNotNull(created);
        expect(created.content).toBe(maxLengthContent);
        expect(created.content.length).toBe(1000);
      });
    });
  });

  describe('findMany', () => {
    repeatTest('テナントの全記事を取得できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const author1 = await UserFactory.createActive({ tenant });
        const author2 = await UserFactory.createActive({ tenant });

        // 記事を3つ作成
        const article1 = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author1 },
          title: '記事1',
          content: '内容1',
        });

        const article2 = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author2 },
          title: '記事2',
          content: '内容2',
        });

        const article3 = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author1 },
          title: '記事3',
          content: '内容3',
        });

        // コメントも追加
        await CommentFactory.create({
          tenant: { connect: tenant },
          article: { connect: article1 },
          author: { connect: author2 },
          content: 'コメント1',
        });

        await CommentFactory.create({
          tenant: { connect: tenant },
          article: { connect: article1 },
          author: { connect: author1 },
          content: 'コメント2',
        });

        // Act
        const articles = await repository.findMany(tx, TenantId.parse(tenant.id));

        // Assert
        expect(articles).toHaveLength(3);

        // 新しい順（createdAtの降順）にソートされていることを確認
        const articleIds = articles.map((a) => a.id);
        expect(articleIds).toContain(article1.id);
        expect(articleIds).toContain(article2.id);
        expect(articleIds).toContain(article3.id);

        // コメントも含まれていることを確認
        const articleWithComments = articles.find((a) => a.id === article1.id);
        assert.isDefined(articleWithComments);
        expect(articleWithComments.comments).toHaveLength(2);
      });
    });

    repeatTest('記事がない場合は空配列を返す', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Act
        const articles = await repository.findMany(tx, TenantId.parse(tenant.id));

        // Assert
        expect(articles).toEqual([]);
      });
    });

    repeatTest('異なるテナントの記事は取得しない', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant, withOtherTenantRls }) => {
        // Arrange
        const author1 = await UserFactory.createActive({ tenant });

        // tenant1に2つの記事を作成
        await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author1 },
          title: 'Tenant1の記事1',
        });

        await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author1 },
          title: 'Tenant1の記事2',
        });

        // otherTenantに1つの記事を作成
        await withOtherTenantRls(async (otherTenant) => {
          const author2 = await UserFactory.createActive({ tenant: otherTenant });
          await ArticleFactory.create({
            tenant: { connect: otherTenant },
            author: { connect: author2 },
            title: 'OtherTenantの記事',
          });
        });

        // Act
        const tenantArticles = await repository.findMany(tx, TenantId.parse(tenant.id));

        // Assert
        expect(tenantArticles).toHaveLength(2);
        expect(tenantArticles.every((a) => a.title.startsWith('Tenant1'))).toBeTruthy();
      });
    });

    repeatTest('削除済みユーザーの記事も取得できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const activeAuthor = await UserFactory.createActive({ tenant });
        const deletedAuthor = await UserFactory.createDeleted({ tenant });

        await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: activeAuthor },
          title: 'アクティブユーザーの記事',
        });

        await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: deletedAuthor },
          title: '削除済みユーザーの記事',
        });

        // Act
        const articles = await repository.findMany(tx, TenantId.parse(tenant.id));

        // Assert
        expect(articles).toHaveLength(2);

        const activeUserArticle = articles.find((a) => a.title === 'アクティブユーザーの記事');
        assert.isDefined(activeUserArticle);
        expect(activeUserArticle.author.status).toBe('ACTIVE');

        const deletedUserArticle = articles.find((a) => a.title === '削除済みユーザーの記事');
        assert.isDefined(deletedUserArticle);
        expect(deletedUserArticle.author.status).toBe('DELETED');
      });
    });
  });

  describe('delete', () => {
    repeatTest('記事を正常に削除できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const author = await UserFactory.createActive({ tenant });

        const article = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author },
          title: '削除対象の記事',
          content: '削除される内容',
        });
        const articleId = ArticleId.parse(article.id);

        // Act
        await repository.delete(tx, articleId);

        // Assert
        const deleted = await repository.findById(tx, articleId);
        expect(deleted).toBeNull();
      });
    });

    repeatTest('コメント付きの記事も削除できる', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant }) => {
        // Arrange
        const author = await UserFactory.createActive({ tenant });

        const article = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author },
          title: 'コメント付き記事',
        });
        const articleId = ArticleId.parse(article.id);

        // コメントを追加
        await CommentFactory.create({
          tenant: { connect: tenant },
          article: { connect: article },
          author: { connect: author },
          content: 'コメント1',
        });

        await CommentFactory.create({
          tenant: { connect: tenant },
          article: { connect: article },
          author: { connect: author },
          content: 'コメント2',
        });

        // Act
        await repository.delete(tx, articleId);

        // Assert
        const deleted = await repository.findById(tx, articleId);
        expect(deleted).toBeNull();
      });
    });

    repeatTest('存在しない記事の削除はエラーになる', async () => {
      await txExecutor.doTestTx(async ({ tx }) => {
        // Arrange
        const nonExistentId = ArticleId.parse(999999);

        // Act & Assert
        await expect(repository.delete(tx, nonExistentId)).rejects.toThrow();
      });
    });

    repeatTest('異なるテナントの記事は削除できない', async () => {
      await txExecutor.doTestTx(async ({ tx, tenant, withOtherTenantRls }) => {
        // Arrange
        const author = await UserFactory.createActive({ tenant });

        const article = await ArticleFactory.create({
          tenant: { connect: tenant },
          author: { connect: author },
          title: 'Tenant1の記事',
        });
        const articleId = ArticleId.parse(article.id);

        // otherTenantから記事を削除しようとする
        const { deleteResult } = await withOtherTenantRls(async () => {
          let deleteResult = null;
          try {
            await repository.delete(tx, articleId);
            deleteResult = 'success';
          } catch {
            deleteResult = 'failed';
          }
          return { deleteResult };
        });

        // Assert - 削除が失敗していることを確認
        expect(deleteResult).toBe('failed');

        // 記事が削除されていないことを確認
        const stillExists = await repository.findById(tx, articleId);
        expect(stillExists).not.toBeNull();
      });
    });
  });
});
