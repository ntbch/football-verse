"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { CareerDetails, CareerSave, ClubStanding, PageResult, Player, PlayerSeasonStats, TrainingFocus } from "../_types";
import { body, game } from "./shared";
import { useCareerOperationMutation } from "./operation";

export const useCareerSaves = (enabled = true) => useQuery({ queryKey: qk.game.saves(), queryFn: () => body<CareerSave[]>(http.get(game("/saves"))), enabled });
export const useCareer = (saveId: string) => useQuery({ queryKey: qk.game.save(saveId), queryFn: () => body<CareerDetails>(http.get(game(`/saves/${saveId}`))), enabled: Boolean(saveId) });
export const useSquad = (saveId: string, clubId: string) => useQuery({ queryKey: qk.game.squad(saveId, clubId), queryFn: () => body<Player[]>(http.get(game(`/saves/${saveId}/clubs/${clubId}/squad`))), enabled: Boolean(saveId && clubId) });
export const useStandings = (saveId: string) => useQuery({ queryKey: qk.game.standings(saveId), queryFn: () => body<ClubStanding[]>(http.get(game(`/saves/${saveId}/standings`))), enabled: Boolean(saveId) });

export const usePlayerStatsPage = (saveId: string, page: number, query: string, enabled = true) => useQuery({
  queryKey: qk.game.key("player-stats-page", saveId, page, query),
  queryFn: ({ signal }) => body<PageResult<PlayerSeasonStats>>(http.get(game(`/saves/${saveId}/player-stats/paged`), { params: { page, size: 25, q: query }, signal })),
  enabled: Boolean(saveId && enabled), placeholderData: (previous) => previous,
});

export const useCreateCareer = () => {
  const client = useQueryClient();
  return useMutation({ mutationFn: (name: string) => body<CareerSave>(http.post(game("/saves"), { name })), onSuccess: () => client.invalidateQueries({ queryKey: qk.game.saves() }) });
};
export const useRenameCareer = (saveId: string) => {
  const client = useQueryClient();
  return useMutation({ mutationFn: (name: string) => body<CareerSave>(http.patch(game(`/saves/${saveId}`), { name })), onSuccess: () => { client.invalidateQueries({ queryKey: qk.game.saves() }); client.invalidateQueries({ queryKey: qk.game.save(saveId) }); } });
};
export const useDeleteCareer = (saveId: string) => {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => http.delete(game(`/saves/${saveId}`)), onSuccess: () => { client.removeQueries({ queryKey: qk.game.key() }); client.invalidateQueries({ queryKey: qk.game.saves() }); } });
};

const saveMutation = (saveId: string, path: string) => {
  const client = useQueryClient();
  return useCareerOperationMutation<CareerSave, void>(
    saveId,
    (_, requestId) => body(http.post(game(path), undefined, { headers: { "X-Request-ID": requestId } })),
    { onSuccess: () => { client.invalidateQueries({ queryKey: qk.game.save(saveId) }); client.invalidateQueries({ queryKey: qk.game.key("squad", saveId) }); client.invalidateQueries({ queryKey: qk.game.standings(saveId) }); } },
  );
};
export const useAdvanceDay = (saveId: string) => saveMutation(saveId, `/saves/${saveId}/advance-day`);
export const useNextSeason = (saveId: string) => saveMutation(saveId, `/saves/${saveId}/next-season`);
export const useTrainingFocus = (saveId: string) => {
  const client = useQueryClient();
  return useMutation({ mutationFn: (focus: TrainingFocus) => body<CareerSave>(http.post(game(`/saves/${saveId}/training-focus`), { focus })), onSuccess: () => client.invalidateQueries({ queryKey: qk.game.save(saveId) }) });
};
