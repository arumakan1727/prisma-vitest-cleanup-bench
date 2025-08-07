import type { Prisma } from '@prisma/client';
import { ArticleCommentDto, ArticleDto } from '~/core/article/usecase/+dto';
import { toUserDto } from './user';

type $Article = Prisma.ArticleGetPayload<{
  include: {
    author: {
      include: {
        active: true;
        deleted: true;
      };
    };
    comments: {
      include: {
        author: {
          include: {
            active: true;
            deleted: true;
          };
        };
      };
    };
  };
}>;

type $ArticleComment = Prisma.CommentGetPayload<{
  include: {
    author: {
      include: {
        active: true;
        deleted: true;
      };
    };
  };
}>;

export const toArticleDto = (a: $Article): ArticleDto => {
  return ArticleDto.parse({
    id: a.id,
    title: a.title,
    content: a.content,
    author: toUserDto(a.author),
    comments: a.comments.map(toArticleCommentDto),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  });
};

export const toArticleCommentDto = (c: $ArticleComment): ArticleCommentDto => {
  return ArticleCommentDto.parse({
    id: c.id,
    content: c.content,
    author: toUserDto(c.author),
  });
};
