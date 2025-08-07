import type { ArticleDto } from '~/core/article/usecase/+dto';
import type { ArticleCreate, IArticleRepository } from '~/core/article/usecase/+repository';
import { ArticleId } from '~/core/article/value-object';
import type { TenantId } from '~/core/tenant/value-object';
import { toArticleDto } from '../converter/article';
import type { PrismaReadOnlyTxHandle, PrismaReadWriteTxHandle } from '../prisma';

export class ArticleRepository
  implements IArticleRepository<PrismaReadOnlyTxHandle, PrismaReadWriteTxHandle>
{
  async findById(tx: PrismaReadOnlyTxHandle, id: ArticleId): Promise<ArticleDto | null> {
    const res = await tx.prisma.article.findUnique({
      where: {
        id,
        tenantId: tx.tenantId,
      },
      include: {
        author: {
          include: {
            active: true,
            deleted: true,
          },
        },
        comments: {
          include: {
            author: {
              include: {
                active: true,
                deleted: true,
              },
            },
          },
        },
      },
    });
    return res ? toArticleDto(res) : null;
  }

  async findMany(tx: PrismaReadOnlyTxHandle, tenantId: TenantId): Promise<ArticleDto[]> {
    const res = await tx.prisma.article.findMany({
      where: {
        tenantId,
      },
      include: {
        author: {
          include: {
            active: true,
            deleted: true,
          },
        },
        comments: {
          include: {
            author: {
              include: {
                active: true,
                deleted: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.map(toArticleDto);
  }

  async create(tx: PrismaReadWriteTxHandle, article: ArticleCreate): Promise<ArticleId> {
    const res = await tx.prisma.article.create({
      data: {
        ...article,
        tenantId: tx.tenantId,
      },
    });
    return ArticleId.parse(res.id);
  }

  async delete(tx: PrismaReadWriteTxHandle, id: ArticleId): Promise<void> {
    await tx.prisma.article.delete({
      where: {
        id,
        tenantId: tx.tenantId,
      },
    });
  }
}
