import type { PageResponse } from "@/shared/lib/api-types";
import type { NewsArticleResponse } from "@/features/news/types";
import type { ThreadResponse } from "@/features/forum/types";

export type SearchArticleSummary = Omit<NewsArticleResponse, "content">;

export type SearchResponse = {
  news: PageResponse<SearchArticleSummary>;
  forum: PageResponse<ThreadResponse>;
};
