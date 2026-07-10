"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl, http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { CareerDetails, CareerSave, ClubStanding, MatchResult, PlayRequest, PlayResponse, Player } from "./_types";

const gateway = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
const game = (path: string) => `${gateway}/game${path}`;
const body = async <T>(request: Promise<{ data: T }>) => (await request).data;

export const useCareerSaves = (enabled = true) => useQuery({
  queryKey: qk.game.saves(),
  queryFn: () => body<CareerSave[]>(http.get(game("/saves"))),
  enabled,
});

export const useCareer = (saveId: string) => useQuery({
  queryKey: qk.game.save(saveId),
  queryFn: () => body<CareerDetails>(http.get(game(`/saves/${saveId}`))),
  enabled: Boolean(saveId),
});

export const useSquad = (saveId: string, clubId: string) => useQuery({
  queryKey: qk.game.squad(saveId, clubId),
  queryFn: () => body<Player[]>(http.get(game(`/saves/${saveId}/clubs/${clubId}/squad`))),
  enabled: Boolean(saveId && clubId),
});

export const useStoredMatch = (saveId: string, matchId: string) => useQuery({
  queryKey: qk.game.match(saveId, matchId),
  queryFn: () => body<MatchResult>(http.get(game(`/saves/${saveId}/matches/${matchId}`))),
  enabled: Boolean(saveId && matchId),
});

export const useStandings = (saveId: string) => useQuery({
  queryKey: qk.game.standings(saveId),
  queryFn: () => body<ClubStanding[]>(http.get(game(`/saves/${saveId}/standings`))),
  enabled: Boolean(saveId),
});

export const useCreateCareer = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => body<CareerSave>(http.post(game("/saves"), { name })),
    onSuccess: () => client.invalidateQueries({ queryKey: qk.game.saves() }),
  });
};

export const usePlayFixture = (saveId: string, fixtureId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: PlayRequest) => body<PlayResponse>(
      http.post(game(`/saves/${saveId}/fixtures/${fixtureId}/play`), request),
    ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.game.save(saveId) });
      client.invalidateQueries({ queryKey: ["game", "squad", saveId] });
      client.invalidateQueries({ queryKey: qk.game.standings(saveId) });
    },
  });
};

export const useAdvanceDay = (saveId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => body<CareerSave>(http.post(game(`/saves/${saveId}/advance-day`))),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.game.save(saveId) });
      client.invalidateQueries({ queryKey: ["game", "squad", saveId] });
      client.invalidateQueries({ queryKey: qk.game.standings(saveId) });
    },
  });
};

export const useNextSeason = (saveId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => body<CareerSave>(http.post(game(`/saves/${saveId}/next-season`))),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: qk.game.save(saveId) });
      client.invalidateQueries({ queryKey: qk.game.standings(saveId) });
    },
  });
};
