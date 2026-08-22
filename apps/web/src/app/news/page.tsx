import NewsListingPage from "@/features/news/page";
import type { NewsArticleResponse, NewsCategoryResponse } from "@/features/news/types";
import type { PageResponse } from "@/shared/lib/api-types";
import { publicData } from "@/shared/lib/api-server";
import { headers } from "next/headers";

export const runtime = "edge";

export default async function NewsRoute() {
  // Keep rendering runtime-only while retaining the explicit fetch cache below.
  await headers();
  const [categories, pageData] = await Promise.all([
    publicData<NewsCategoryResponse[]>("/news/categories"),
    publicData<PageResponse<NewsArticleResponse>>("/news?page=0&size=24"),
  ]);
  return <NewsListingPage initialData={{ categories, pageData }} />;
}
