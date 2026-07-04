"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { ForumReport } from "@/app/admin/_types";
import type { ModeratorStats } from "./_types";
import { qk } from "@/shared/lib/query-keys";

export const useModeratorStats = () =>
  useQuery({
    queryKey: qk.moderator.stats(),
    queryFn: () => data<ModeratorStats>(http.get("/moderator/dashboard/stats"))
  });

export const useModeratorReports = () =>
  useQuery({
    queryKey: qk.moderator.reports(),
    queryFn: () => data<ForumReport[]>(http.get("/moderator/forum/reports"))
  });

export const useResolveReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => data<ForumReport>(http.patch(`/moderator/forum/reports/${id}/resolve`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.moderator.reports() });
      qc.invalidateQueries({ queryKey: qk.moderator.stats() });
    }
  });
};

export const useHideForumTarget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, hidden }: { type: ForumReport["targetType"]; id: number; hidden: boolean }) =>
      data(http.patch(`/moderator/forum/${type === "THREAD" ? "threads" : "posts"}/${id}/hide?value=${hidden}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.moderator.reports() });
      qc.invalidateQueries({ queryKey: qk.moderator.stats() });
    }
  });
};
