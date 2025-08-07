import type { IReadOnlyTxHandle, IReadWriteTxHandle } from '~/core/+shared/interface/transaction';
import type { TenantId } from '~/core/tenant/value-object';
import type { UserId } from '~/core/user/value-object';
import type { ArticleContent, ArticleId, ArticleTitle } from '../value-object';
import type { ArticleDto } from './+dto';

export interface IArticleRepository<
  ReadOnlyTx extends IReadOnlyTxHandle = IReadOnlyTxHandle,
  ReadWriteTx extends IReadWriteTxHandle = IReadWriteTxHandle,
> {
  findById(tx: ReadOnlyTx, id: ArticleId): Promise<ArticleDto | null>;

  findMany(tx: ReadOnlyTx, tenantId: TenantId): Promise<ArticleDto[]>;

  create(tx: ReadWriteTx, article: ArticleCreate): Promise<ArticleId>;

  delete(tx: ReadWriteTx, id: ArticleId): Promise<void>;
}

export type ArticleCreate = {
  title: ArticleTitle;
  content: ArticleContent;
  authorId: UserId;
};
