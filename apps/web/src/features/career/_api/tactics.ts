"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { PlayerAnalysis, TacticalSetup } from "../_types";
import { body, game } from "./shared";

export const useCareerTactics = (saveId: string) => useQuery({ queryKey: qk.game.key("tactics", saveId), queryFn: () => body<TacticalSetup | null>(http.get(game(`/saves/${saveId}/tactics`))), enabled: Boolean(saveId) });
export const useSaveCareerTactics = (saveId: string) => {
  const client = useQueryClient();
  return useMutation({ mutationFn: (setup: TacticalSetup) => body<TacticalSetup>(http.put(game(`/saves/${saveId}/tactics`), setup)), onSuccess: (setup) => client.setQueryData(qk.game.key("tactics", saveId), setup) });
};
export const usePlayerAnalysis = (saveId: string, clubId: string) => useQuery({ queryKey: qk.game.key("player-analysis", saveId, clubId), queryFn: () => body<PlayerAnalysis[]>(http.get(game(`/saves/${saveId}/clubs/${clubId}/analysis`))), enabled: Boolean(saveId && clubId) });
