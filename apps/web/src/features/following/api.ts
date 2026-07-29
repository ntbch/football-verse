"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { FollowTarget, FollowingFeed } from "./types";

const key = ["following"] as const;

export const useFollowTargets = (enabled: boolean) =>
  useQuery({
    queryKey: [...key, "targets"],
    queryFn: () => data<FollowTarget[]>(http.get("/users/me/follows")),
    enabled,
    staleTime: 60_000,
  });

export const useFollowingFeed = (enabled: boolean) =>
  useQuery({
    queryKey: [...key, "feed"],
    queryFn: () => data<FollowingFeed>(http.get("/users/me/following-feed", { params: { limit: 10 } })),
    enabled,
    staleTime: 60_000,
  });

export const useSetFollowTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (target: Required<Pick<FollowTarget, "targetType" | "targetKey" | "targetName">> & { following: boolean }) =>
      data<FollowTarget>(http.put("/users/me/follows", target)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
};
