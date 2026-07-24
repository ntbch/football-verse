"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { Fixture, UserPrediction, StatsResponse, LeaderboardEntry, MatchCentreResponse } from "./types";

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

export const useLeaderboard = (period: "weekly" | "all" = "weekly") =>
  useQuery({
    queryKey: ["predictions", "leaderboard", period],
    queryFn: () => data<LeaderboardEntry[]>(http.get(`/predictions/leaderboard?period=${period}`)),
    refetchInterval: 60000,
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
