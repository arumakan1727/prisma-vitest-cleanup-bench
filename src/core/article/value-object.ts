import * as z from 'zod';
import { zodParser } from '~/core/+shared/helpers/zod';

export const zArticleId = z.int().min(0).brand<'ArticleId'>();
export type ArticleId = z.infer<typeof zArticleId>;
export const ArticleId = {
  parse: zodParser(zArticleId),
};

export const zArticleTitle = z.string().min(1).max(80).brand<'ArticleTitle'>();
export type ArticleTitle = z.infer<typeof zArticleTitle>;
export const ArticleTitle = {
  parse: zodParser(zArticleTitle),
};

export const zArticleContent = z.string().min(1).max(1000).brand<'ArticleContent'>();
export type ArticleContent = z.infer<typeof zArticleContent>;
export const ArticleContent = {
  parse: zodParser(zArticleContent),
};

export const zArticleCommentId = z.int().min(0).brand<'ArticleCommentId'>();
export type ArticleCommentId = z.infer<typeof zArticleCommentId>;
export const ArticleCommentId = {
  parse: zodParser(zArticleCommentId),
};

export const zArticleCommentContent = z.string().min(1).max(1000).brand<'ArticleCommentContent'>();
export type ArticleCommentContent = z.infer<typeof zArticleCommentContent>;
export const ArticleCommentContent = {
  parse: zodParser(zArticleCommentContent),
};
