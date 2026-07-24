"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { ManagerDashboard, ManagerJob } from "../_types";
import { body, game } from "./shared";
import { useCareerOperationMutation } from "./operation";

export const useManager = (saveId: string) => useQuery({ queryKey: qk.game.key("manager", saveId), queryFn: () => body<ManagerDashboard>(http.get(game(`/saves/${saveId}/manager`))), enabled: Boolean(saveId) });
export const useManagerDecisions = (saveId: string) => useQuery({ queryKey: qk.game.key("manager-decisions", saveId), queryFn: () => body<Record<string, unknown>[]>(http.get(game(`/saves/${saveId}/manager/decisions`))), enabled: Boolean(saveId) });
export const useManagerJobs = (saveId: string) => useQuery({ queryKey: qk.game.key("manager-jobs", saveId), queryFn: () => body<ManagerJob[]>(http.get(game(`/saves/${saveId}/jobs`))), enabled: Boolean(saveId) });
export const useAcceptManagerJob = (saveId: string) => {
  const client = useQueryClient();
  return useCareerOperationMutation<string, string>(
    saveId,
    (clubId, requestId) => body(http.post(game(`/saves/${saveId}/jobs/${clubId}/accept`), undefined, { headers: { "X-Request-ID": requestId } })),
    { onSuccess: () => { client.invalidateQueries({ queryKey: qk.game.save(saveId) }); client.invalidateQueries({ queryKey: qk.game.key("manager", saveId) }); client.invalidateQueries({ queryKey: qk.game.key("manager-jobs", saveId) }); } },
  );
};
