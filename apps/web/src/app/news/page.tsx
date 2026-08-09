import NewsListingPage from "@/features/news/page";
import type { NewsArticleResponse, NewsCategoryResponse } from "@/features/news/types";
import type { PageResponse } from "@/shared/lib/api-types";
import { apiBaseUrl } from "@/shared/lib/api-config";
import { headers } from "next/headers";

export const runtime = "edge";

async function publicData<T>(path: string): Promise<T | undefined> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { next: { revalidate: 60 } });
    return response.ok ? ((await response.json()) as { data: T }).data : undefined;
  } catch {
    return undefined;
  }
}

export default async function NewsRoute() {
  // Keep rendering runtime-only while retaining the explicit fetch cache below.
  await headers();
  const [categories, pageData] = await Promise.all([
    publicData<NewsCategoryResponse[]>("/news/categories"),
    publicData<PageResponse<NewsArticleResponse>>("/news?page=0&size=24"),
  ]);
  return <NewsListingPage initialData={{ categories, pageData }} />;
}
