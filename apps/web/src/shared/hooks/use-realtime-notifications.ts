"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { useToast } from "@/shared/components/toast";
import { apiBaseUrl } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { qk } from "@/shared/lib/query-keys";

type RealtimeNotification = {
  message: string;
  type?: string;
};

export function useRealtimeNotifications() {
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!auth?.accessToken || !auth.userId) return;

    let socketUrl = "http://localhost:8000";
    try {
      socketUrl = new URL(apiBaseUrl).origin;
    } catch (error) {
      console.error("Failed to parse apiBaseUrl for socket connection", error);
    }

    const socket: Socket = io(socketUrl, {
      auth: { token: auth.accessToken },
      transports: ["polling", "websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to Realtime Gateway Socket.io server");
    });

    socket.on("notification", (notification: RealtimeNotification) => {
      try {
        toast({
          body: notification.message,
          type: "info",
          autoHideDuration: 6000,
        });
        queryClient.invalidateQueries({ queryKey: qk.user.notifications() });

        if (notification.type === "PREDICTION_SCORED") {
          queryClient.invalidateQueries({ queryKey: ["predictions"] });
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
          queryClient.invalidateQueries({ queryKey: ["match-centre"] });
        }
      } catch (error) {
        console.error("Failed to handle Socket.io notification", error);
      }
    });

    socket.on("connect_error", (error) => {
      console.warn("Socket.io connection error", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [auth?.accessToken, auth?.userId, queryClient, toast]);
}
