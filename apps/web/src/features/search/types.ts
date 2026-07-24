import type { PageResponse } from "@/shared/lib/api-types";
import type { NewsArticleResponse } from "@/features/news/types";
import type { ThreadResponse } from "@/features/forum/types";

export type SearchResponse = {
  news: PageResponse<NewsArticleResponse>;
  forum: PageResponse<ThreadResponse>;
};
