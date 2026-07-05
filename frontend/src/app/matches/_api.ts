"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { FixtureResponse, PredictionsResponse, RoundsResponse, StandingsResponse } from "./_types";

const matchBaseUrl = process.env.NEXT_PUBLIC_MATCH_ENGINE_URL ?? "http://localhost:8090";

export const matchHttp = axios.create({ baseURL: matchBaseUrl });

// ponytail: kept for backward compat until match-centre endpoint fully covers all consumers.
// These are no longer used by match/page.tsx (now uses useMatchCentre).

export const useLeagueRounds = (leagueSlug = "premier-league") =>
  useQuery({
    queryKey: ["matches", leagueSlug, "rounds"],
    queryFn: async () => (await matchHttp.get<RoundsResponse>(`/matches/${leagueSlug}/rounds`)).data
  });

export const useLeagueFixtures = (leagueSlug = "premier-league", round?: string) =>
  useQuery({
    queryKey: ["matches", leagueSlug, "fixtures", round],
    queryFn: async () => (await matchHttp.get<FixtureResponse>(`/matches/${leagueSlug}/fixtures`, { params: { round } })).data,
    refetchInterval: 30000
  });

export const useLeagueLiveFixtures = (leagueSlug = "premier-league") =>
  useQuery({
    queryKey: ["matches", leagueSlug, "live"],
    queryFn: async () => (await matchHttp.get<FixtureResponse>(`/matches/${leagueSlug}/live`)).data,
    refetchInterval: 15000
  });

export const useLeagueStandings = (leagueSlug = "premier-league") =>
  useQuery({
    queryKey: ["matches", leagueSlug, "standings"],
    queryFn: async () => (await matchHttp.get<StandingsResponse>(`/standings/${leagueSlug}`)).data,
    refetchInterval: 60000
  });

export const useLeaguePredictions = (leagueSlug = "premier-league", round?: string) =>
  useQuery({
    queryKey: ["predictions", leagueSlug, round],
    queryFn: async () => (await matchHttp.get<PredictionsResponse>(`/predictions/${leagueSlug}`, { params: { round } })).data,
    refetchInterval: 30000
  });
