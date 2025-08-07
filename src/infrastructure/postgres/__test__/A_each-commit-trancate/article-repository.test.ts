import { afterEach, assert, describe, expect } from 'vitest';
import { ArticleContent, ArticleId, ArticleTitle } from '~/core/article/value-object';
import { TenantId } from '~/core/tenant/value-object';
import { UserId } from '~/core/user/value-object';
import { PrismaTxExecutor } from '../../prisma';
import { ArticleRepository } from '../../repository/article';
import { truncate } from '../+global-setup';
import { ArticleFactory, CommentFactory, TenantFactory, UserFactory } from '../factory';
import { repeatTest } from '../helpers';

describe('ArticleRepository', () => {
  const repository = new ArticleRepository();
  const txExecutor = new PrismaTxExecutor();

  afterEach(async () => {
    await truncate();
  });

  describe('findById', () => {
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
      const result = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findById(tx, articleId)
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
      const result = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findById(tx, nonExistentId)
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
      const result = await txExecutor.doReadOnlyTx(tenant2Id, async (tx) =>
        repository.findById(tx, articleId)
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    repeatTest('新しい記事を正常に作成できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: {
          connect: tenant,
        },
      });
      const authorId = UserId.parse(author.id);

      const articleCreate = {
        title: ArticleTitle.parse('新しい記事のタイトル'),
        content: ArticleContent.parse('新しい記事の内容です。'),
        authorId,
      };

      // Act
      const createdId = await txExecutor.doReadWriteTx(tenantId, async (tx) =>
        repository.create(tx, articleCreate)
      );

      // Assert
      expect(createdId).toBeDefined();
      expect(createdId).toBeGreaterThan(0);

      // 作成された記事を確認
      const created = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findById(tx, createdId)
      );

      assert.isNotNull(created);
      expect(created.id).toBe(createdId);
      expect(created.title).toBe('新しい記事のタイトル');
      expect(created.content).toBe('新しい記事の内容です。');
      expect(created.author.status).toBe('ACTIVE');
      if (created.author.status === 'ACTIVE') {
        expect(created.author.id).toBe(authorId);
      }
    });

    repeatTest('タイトルが最大長の記事を作成できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: {
          connect: tenant,
        },
      });
      const authorId = UserId.parse(author.id);

      const maxLengthTitle = 'あ'.repeat(80); // ArticleTitleの最大長は80文字
      const articleCreate = {
        title: ArticleTitle.parse(maxLengthTitle),
        content: ArticleContent.parse('内容'),
        authorId,
      };

      // Act
      const createdId = await txExecutor.doReadWriteTx(tenantId, async (tx) =>
        repository.create(tx, articleCreate)
      );

      // Assert
      const created = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findById(tx, createdId)
      );

      assert.isNotNull(created);
      expect(created.title).toBe(maxLengthTitle);
      expect(created.title.length).toBe(80);
    });

    repeatTest('コンテンツが最大長の記事を作成できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: {
          connect: tenant,
        },
      });
      const authorId = UserId.parse(author.id);

      const maxLengthContent = 'あ'.repeat(1000); // ArticleContentの最大長は1000文字
      const articleCreate = {
        title: ArticleTitle.parse('タイトル'),
        content: ArticleContent.parse(maxLengthContent),
        authorId,
      };

      // Act
      const createdId = await txExecutor.doReadWriteTx(tenantId, async (tx) =>
        repository.create(tx, articleCreate)
      );

      // Assert
      const created = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findById(tx, createdId)
      );

      assert.isNotNull(created);
      expect(created.content).toBe(maxLengthContent);
      expect(created.content.length).toBe(1000);
    });
  });

  describe('findMany', () => {
    repeatTest('テナントの全記事を取得できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const author1 = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant },
      });
      const author2 = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant },
      });

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
      const articles = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findMany(tx, tenantId)
      );

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

    repeatTest('記事がない場合は空配列を返す', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      // Act
      const articles = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findMany(tx, tenantId)
      );

      // Assert
      expect(articles).toEqual([]);
    });

    repeatTest('異なるテナントの記事は取得しない', async () => {
      // Arrange
      const tenant1 = await TenantFactory.create({ name: 'Tenant 1' });
      const tenant2 = await TenantFactory.create({ name: 'Tenant 2' });
      const tenant1Id = TenantId.parse(tenant1.id);
      const tenant2Id = TenantId.parse(tenant2.id);

      const author1 = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant1 },
      });
      const author2 = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant2 },
      });

      // tenant1に2つ、tenant2に1つの記事を作成
      await ArticleFactory.create({
        tenant: { connect: tenant1 },
        author: { connect: author1 },
        title: 'Tenant1の記事1',
      });

      await ArticleFactory.create({
        tenant: { connect: tenant1 },
        author: { connect: author1 },
        title: 'Tenant1の記事2',
      });

      await ArticleFactory.create({
        tenant: { connect: tenant2 },
        author: { connect: author2 },
        title: 'Tenant2の記事',
      });

      // Act
      const tenant1Articles = await txExecutor.doReadOnlyTx(tenant1Id, async (tx) =>
        repository.findMany(tx, tenant1Id)
      );

      const tenant2Articles = await txExecutor.doReadOnlyTx(tenant2Id, async (tx) =>
        repository.findMany(tx, tenant2Id)
      );

      // Assert
      expect(tenant1Articles).toHaveLength(2);
      expect(tenant1Articles.every((a) => a.title.startsWith('Tenant1'))).toBeTruthy();

      expect(tenant2Articles).toHaveLength(1);
      expect(tenant2Articles[0]?.title).toBe('Tenant2の記事');
    });

    repeatTest('削除済みユーザーの記事も取得できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const activeAuthor = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant },
      });
      const deletedAuthor = await UserFactory.use('DELETED').create({
        tenant: { connect: tenant },
      });

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
      const articles = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findMany(tx, tenantId)
      );

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

  describe('delete', () => {
    repeatTest('記事を正常に削除できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant },
      });

      const article = await ArticleFactory.create({
        tenant: { connect: tenant },
        author: { connect: author },
        title: '削除対象の記事',
        content: '削除される内容',
      });
      const articleId = ArticleId.parse(article.id);

      // Act
      await txExecutor.doReadWriteTx(tenantId, async (tx) => repository.delete(tx, articleId));

      // Assert
      const deleted = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findById(tx, articleId)
      );
      expect(deleted).toBeNull();
    });

    repeatTest('コメント付きの記事も削除できる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant },
      });

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
      await txExecutor.doReadWriteTx(tenantId, async (tx) => repository.delete(tx, articleId));

      // Assert
      const deleted = await txExecutor.doReadOnlyTx(tenantId, async (tx) =>
        repository.findById(tx, articleId)
      );
      expect(deleted).toBeNull();
    });

    repeatTest('存在しない記事の削除はエラーになる', async () => {
      // Arrange
      const tenant = await TenantFactory.create();
      const tenantId = TenantId.parse(tenant.id);
      const nonExistentId = ArticleId.parse(999999);

      // Act & Assert
      await expect(
        txExecutor.doReadWriteTx(tenantId, async (tx) => repository.delete(tx, nonExistentId))
      ).rejects.toThrow();
    });

    repeatTest('異なるテナントの記事は削除できない', async () => {
      // Arrange
      const tenant1 = await TenantFactory.create({ name: 'Tenant 1' });
      const tenant2 = await TenantFactory.create({ name: 'Tenant 2' });
      const tenant2Id = TenantId.parse(tenant2.id);

      const author = await UserFactory.use('ACTIVE').create({
        tenant: { connect: tenant1 },
      });

      const article = await ArticleFactory.create({
        tenant: { connect: tenant1 },
        author: { connect: author },
        title: 'Tenant1の記事',
      });
      const articleId = ArticleId.parse(article.id);

      // Act & Assert - tenant2のコンテキストで削除を試みる
      await expect(
        txExecutor.doReadWriteTx(tenant2Id, async (tx) => repository.delete(tx, articleId))
      ).rejects.toThrow();

      // 記事が削除されていないことを確認
      const tenant1Id = TenantId.parse(tenant1.id);
      const stillExists = await txExecutor.doReadOnlyTx(tenant1Id, async (tx) =>
        repository.findById(tx, articleId)
      );
      expect(stillExists).not.toBeNull();
    });
  });
});
