import type { TenantId } from "~/core/tenant/value-object";
import type { UserId } from "~/core/user/value-object";
import type { ArticleContent, ArticleId, ArticleTitle } from "../value-object";
import type { ArticleDto } from "./dto";

export interface IArticleRepository {
	findById(id: ArticleId): Promise<ArticleDto | null>;

	findMany(tenantId: TenantId): Promise<ArticleDto[]>;

	create(article: ArticleCreate): Promise<ArticleId>;

	delete(id: ArticleId): Promise<void>;
}

export type ArticleCreate = {
	title: ArticleTitle;
	content: ArticleContent;
	authorId: UserId;
};
