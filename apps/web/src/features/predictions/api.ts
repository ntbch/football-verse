"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { CommunityPredictionDistribution, CurrentLeaderboard, Fixture, UserPrediction, StatsResponse, LeaderboardEntry, MatchCentreResponse, MatchDetailResponse, PredictionScoreLog, PrivateLeague } from "./types";
import type { SearchResponse } from "@/features/search/types";
import type { NewsArticleResponse } from "@/features/news/types";
import type { ThreadResponse } from "@/features/forum/types";
import type { PageResponse } from "@/shared/lib/api-types";

export const usePredictionFixtures = (league = "premier-league") =>
  useQuery({
    queryKey: ["predictions", "fixtures", league],
    queryFn: () => data<Fixture[]>(http.get(`/predictions/fixtures?league=${league}`)),
    refetchInterval: 30000,
  });

export const useMyPredictions = (league = "premier-league") =>
  useQuery({
    queryKey: ["predictions", "mine", league],
    queryFn: () => data<UserPrediction[]>(http.get(`/predictions/mine?league=${league}`)),
  });

export const useSubmitPrediction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      pick,
      homeScore,
      awayScore,
      pickOu25,
      pickBtts,
    }: {
      matchId: number;
      pick: string;
      homeScore?: number | null;
      awayScore?: number | null;
      pickOu25?: string | null;
      pickBtts?: string | null;
    }) =>
      data<UserPrediction>(
        http.post(`/predictions/${matchId}`, { pick, homeScore, awayScore, pickOu25, pickBtts }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["predictions"] }),
  });
};

export const usePredictionStats = () =>
  useQuery({
    queryKey: ["predictions", "stats"],
    queryFn: () => data<StatsResponse>(http.get("/predictions/stats")),
  });

export const usePredictionScoreLog = (fixtureId: number, enabled: boolean) =>
  useQuery({
    queryKey: ["predictions", "score-log", fixtureId],
    queryFn: () => data<PredictionScoreLog>(http.get(`/predictions/${fixtureId}/score-log`)),
    enabled: enabled && Number.isFinite(fixtureId),
  });

export const useLeaderboard = (period: "weekly" | "monthly" | "all" = "weekly") =>
  useQuery({
    queryKey: ["predictions", "leaderboard", period],
    queryFn: () => data<LeaderboardEntry[]>(http.get(`/predictions/leaderboard?period=${period}`)),
    staleTime: 120_000,
  });

export const useLeaderboardPage = (period: "weekly" | "monthly" | "all", page: number) =>
  useQuery({
    queryKey: ["predictions", "leaderboard-page", period, page],
    queryFn: () => data<PageResponse<LeaderboardEntry>>(http.get("/predictions/leaderboard/page", { params: { period, page, size: 20 } })),
    staleTime: 120_000,
  });

export const useCurrentLeaderboard = (period: "weekly" | "monthly" | "all", enabled: boolean) =>
  useQuery({
    queryKey: ["predictions", "leaderboard", "me", period],
    queryFn: () => data<CurrentLeaderboard>(http.get("/predictions/leaderboard/me", { params: { period } })),
    enabled,
    staleTime: 120_000,
  });

export const useCommunityPredictionDistribution = (fixtureId: number, enabled: boolean) =>
  useQuery({
    queryKey: ["predictions", "community-distribution", fixtureId],
    queryFn: () => data<CommunityPredictionDistribution>(http.get(`/predictions/${fixtureId}/community-distribution`)),
    enabled: enabled && Number.isFinite(fixtureId),
    staleTime: 30_000,
  });

/** Single-source match centre: fixtures + AI predictions + standings + rounds + user picks. */
export const useMatchCentre = (league = "premier-league", round?: string) =>
  useQuery({
    queryKey: ["predictions", "match-centre", league, round],
    queryFn: () => {
      const params = new URLSearchParams({ league });
      if (round) params.set("round", round);
      return data<MatchCentreResponse>(http.get(`/predictions/match-centre?${params.toString()}`));
    },
    refetchInterval: 30000,
  });

export const useMatchDetail = (fixtureId: string, league = "premier-league") =>
  useQuery({
    queryKey: ["predictions", "match-detail", league, fixtureId],
    queryFn: () => data<MatchDetailResponse>(http.get(`/predictions/match-centre/${encodeURIComponent(fixtureId)}?league=${encodeURIComponent(league)}`)),
    enabled: Boolean(fixtureId),
    refetchInterval: 30000,
  });

export const useMatchRelatedContent = (homeTeam: string, awayTeam: string, enabled: boolean) =>
  useQuery({
    queryKey: ["predictions", "match-related", homeTeam, awayTeam],
    queryFn: async () => {
      const teams = [...new Set([homeTeam, awayTeam].filter(Boolean))];
      const results = await Promise.allSettled(
        teams.map((team) => data<SearchResponse>(http.get("/search", { params: { q: team, page: 0, size: 4 } })))
      );
      const resolved = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      if (resolved.length === 0) throw new Error("Related content is unavailable");
      const unique = <T extends { id: number }>(items: T[]) => [...new Map(items.map((item) => [item.id, item])).values()];
      return {
        articles: unique<NewsArticleResponse>(resolved.flatMap((result) => result.news.content)).slice(0, 4),
        threads: unique<ThreadResponse>(resolved.flatMap((result) => result.forum.content)).slice(0, 4),
      };
    },
    enabled,
    staleTime: 120_000,
  });

const privateLeagueKey = ["predictions", "private-leagues"] as const;

export const usePrivateLeagues = (enabled: boolean, page: number) => useQuery({
  queryKey: [...privateLeagueKey, page],
  queryFn: () => data<PageResponse<PrivateLeague>>(http.get("/predictions/leagues", { params: { page, size: 10 } })),
  enabled,
});

export const useCreatePrivateLeague = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, requestId }: { name: string; requestId: string }) => data<PrivateLeague>(http.post("/predictions/leagues", { name }, { headers: { "X-Request-ID": requestId } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: privateLeagueKey }),
  });
};

export const useJoinPrivateLeague = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => data<PrivateLeague>(http.post("/predictions/leagues/join", { inviteCode })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: privateLeagueKey }),
  });
};
