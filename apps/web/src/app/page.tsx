import HomePage from "@/features/home/page";
import type { NewsArticleResponse } from "@/features/news/types";
import type { LeaderboardEntryResponse, MatchCentreResponse } from "@/features/predictions/types";
import type { ForumCategoryResponse, ThreadResponse } from "@/features/forum/types";
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

export default async function HomeRoute() {
  const [newsPage, leaderboard, matchday, categories] = await Promise.all([
    publicData<PageResponse<NewsArticleResponse>>("/news?page=0&size=15"),
    publicData<LeaderboardEntryResponse[]>("/predictions/leaderboard?period=weekly&limit=5"),
    publicData<MatchCentreResponse>("/predictions/match-centre?league=premier-league"),
    publicData<ForumCategoryResponse[]>("/forum/categories"),
  ]);
  const firstCategory = categories?.[0]?.slug;
  const threadsPage = firstCategory
    ? await publicData<PageResponse<ThreadResponse>>(`/forum/categories/${encodeURIComponent(firstCategory)}/threads?size=4`)
    : undefined;

  return <HomePage initialData={{ newsPage, leaderboard, matchday, categories, threadsPage }} />;
}
