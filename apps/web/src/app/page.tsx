import HomePage from "@/features/home/page";
import type { NewsArticleResponse } from "@/features/news/types";
import type { LeaderboardEntryResponse, MatchCentreResponse } from "@/features/predictions/types";
import type { ForumCategoryResponse, ThreadResponse } from "@/features/forum/types";
import type { PageResponse } from "@/shared/lib/api-types";
import { publicData } from "@/shared/lib/api-server";
import { headers } from "next/headers";

export const runtime = "edge";

export default async function HomeRoute() {
  // Render at request time so the Docker image build never captures an unavailable gateway.
  // Individual public API calls retain their 60-second Data Cache entries below.
  await headers();
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
