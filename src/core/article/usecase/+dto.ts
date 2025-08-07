import * as z from 'zod';
import { zodParser } from '~/core/+shared/helpers/zod';
import { zUserDto } from '~/core/user/usecase/dto';
import {
  zArticleCommentContent,
  zArticleCommentId,
  zArticleContent,
  zArticleId,
  zArticleTitle,
} from '../value-object';

export const zArticleCommentDto = z
  .object({
    id: zArticleCommentId,
    content: zArticleCommentContent,
    author: zUserDto,
  })
  .brand<'ArticleCommentDto'>();
export type ArticleCommentDto = z.infer<typeof zArticleCommentDto>;
export const ArticleCommentDto = {
  parse: zodParser(zArticleCommentDto),
};

export const zArticleDto = z
  .object({
    id: zArticleId,
    title: zArticleTitle,
    content: zArticleContent,
    comments: z.array(zArticleCommentDto),
    author: zUserDto,
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .brand<'ArticleDto'>();
export type ArticleDto = z.infer<typeof zArticleDto>;
export const ArticleDto = {
  parse: zodParser(zArticleDto),
};
