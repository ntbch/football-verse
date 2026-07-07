"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "../lib/auth-store";
import { apiBaseUrl } from "../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "../lib/query-keys";
import { useToast } from "@/shared/components/toast";
import { Navbar } from "./navbar";

// Shared SSE Notifications Hook
function useNotificationsSSE() {
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!auth?.accessToken) return;

    const eventSource = new EventSource(`${apiBaseUrl}/notifications/stream?token=${auth.accessToken}`);

    const handleNotification = (event: MessageEvent) => {
      try {
        const notif = JSON.parse(event.data);
        toast({
          body: notif.message,
          type: "info",
          autoHideDuration: 6000,
        });
        
        // Invalidate notifications query to update UI automatically
        queryClient.invalidateQueries({ queryKey: qk.user.notifications() });
      } catch (err) {
        console.error("Failed to parse notification event", err);
      }
    };

    eventSource.addEventListener("notification", handleNotification);

    eventSource.addEventListener("error", (err) => {
      console.warn("SSE connection error", err);
    });

    return () => {
      eventSource.removeEventListener("notification", handleNotification);
      eventSource.close();
    };
  }, [auth?.accessToken, queryClient, toast]);
}

// 1. Public / Editorial Magazine Shell
export function PublicShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-magazine min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all-300">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

// 2. Sports Command Center Shell
export function SportsShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-sports min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all-300">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

// 3. Fan Community Arena Shell
export function CommunityShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-community min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all-300">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

// 4. Admin Shell (Operational Layout, reusing Sports theme for dark operational)
export function AdminShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-sports min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all-300">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

// 5. Moderator Shell (Operational Layout)
export function ModeratorShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-sports min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all-300">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
