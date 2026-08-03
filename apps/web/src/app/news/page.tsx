import NewsListingPage from "@/features/news/page";
import type { NewsArticleResponse, NewsCategoryResponse } from "@/features/news/types";
import type { PageResponse } from "@/shared/lib/api-types";
import { apiBaseUrl } from "@/shared/lib/api-config";

export const runtime = "edge";
export const dynamic = "force-dynamic";

async function publicData<T>(path: string): Promise<T | undefined> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { next: { revalidate: 60 } });
    return response.ok ? ((await response.json()) as { data: T }).data : undefined;
  } catch {
    return undefined;
  }
}

export default async function NewsRoute() {
  const [categories, pageData] = await Promise.all([
    publicData<NewsCategoryResponse[]>("/news/categories"),
    publicData<PageResponse<NewsArticleResponse>>("/news?page=0&size=24"),
  ]);
  return <NewsListingPage initialData={{ categories, pageData }} />;
}
