"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { qk } from "@/shared/lib/query-keys";
import type { NotificationResponse } from "@/features/notifications/types";

export function useNavbarNotifications() {
  const authenticated = useAuthStore((state) => Boolean(state.auth));
  const queryClient = useQueryClient();
  const notificationKey = qk.user.notifications();

  const { data: notifications = [] } = useQuery({
    queryKey: notificationKey,
    queryFn: () => data<NotificationResponse[]>(http.get("/notifications")),
    enabled: authenticated,
    refetchInterval: 30_000,
  });

  const invalidateNotifications = () => queryClient.invalidateQueries({ queryKey: notificationKey });
  const markAllReadMutation = useMutation({
    mutationFn: () => http.patch("/notifications/read-all"),
    onSuccess: invalidateNotifications,
  });
  const markReadMutation = useMutation({
    mutationFn: (id: number) => http.patch(`/notifications/${id}/read`),
    onSuccess: invalidateNotifications,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => http.delete(`/notifications/${id}`),
    onSuccess: invalidateNotifications,
  });

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    markAllRead: () => markAllReadMutation.mutate(),
    markRead: (id: number) => markReadMutation.mutate(id),
    deleteNotification: (id: number) => deleteMutation.mutate(id),
  };
}
