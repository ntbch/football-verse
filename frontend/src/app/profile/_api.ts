"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { NotificationItem, Profile } from "./_types";

export const useProfile = (enabled: boolean, onLoaded: (p: Profile) => void) =>
  useQuery({
    queryKey: qk.user.profile(),
    // ponytail: side-effect (seed form state) preserved from pre-refactor queryFn. Behavior-identical.
    queryFn: async () => {
      const result = await data<Profile>(http.get("/users/me/profile"));
      onLoaded(result);
      return result;
    },
    enabled
  });

export const useNotifications = (enabled: boolean) =>
  useQuery({
    queryKey: qk.user.notifications(),
    queryFn: () => data<NotificationItem[]>(http.get("/notifications")),
    enabled
  });

export const useSaveProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { displayName: string; bio: string }) =>
      data<Profile>(http.patch("/users/me/profile", payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.user.profile() })
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => data<NotificationItem>(http.patch(`/notifications/${id}/read`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.user.notifications() })
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => data<null>(http.patch("/notifications/read-all")),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.user.notifications() })
  });
};
