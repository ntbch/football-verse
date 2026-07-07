"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "../lib/auth-store";
import { apiBaseUrl } from "../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "../lib/query-keys";
import { useToast } from "@/shared/components/toast";
import { Navbar } from "./navbar";

// Shared SSE Notifications Stream Hook
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

        // Invalidate notifications query to trigger navbar update
        queryClient.invalidateQueries({ queryKey: qk.user.notifications() });
      } catch (err) {
        console.error("Failed to parse SSE notification", err);
      }
    };

    eventSource.addEventListener("notification", handleNotification);

    eventSource.addEventListener("error", (err) => {
      console.warn("SSE stream connection closed or error occurred", err);
    });

    return () => {
      eventSource.removeEventListener("notification", handleNotification);
      eventSource.close();
    };
  }, [auth?.accessToken, queryClient, toast]);
}

// 1. Public Shell (Editorial Magazine layout wrapper)
export function PublicShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-magazine min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 animate-fade-in">{children}</main>
    </div>
  );
}

// 2. Sports Shell (Command Center style wrapper)
export function SportsShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-magazine min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 animate-fade-in">{children}</main>
    </div>
  );
}

// 3. Fan Arena Shell (Sleek Community wrapper)
export function CommunityShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-magazine min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 animate-fade-in">{children}</main>
    </div>
  );
}

// 4. Admin Shell (Operational Layout with Sidebar)
export function AdminShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-magazine min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 md:p-8 animate-fade-in">
        {/* Admin Sidebar Navigation */}
        <aside className="w-full md:w-60 shrink-0 flex flex-col gap-2">
          <div className="card p-5 flex flex-col gap-2 bg-[var(--color-background-surface)] border-[var(--color-border)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 px-1">
              Admin Control Ops
            </span>
            <Link
              href="/admin"
              className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-white/5 hover:text-[var(--color-accent)] transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
              </svg>
              <span>System Dashboard</span>
            </Link>
            <Link
              href="/admin/users"
              className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-white/5 hover:text-[var(--color-accent)] transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>User Management</span>
            </Link>
            <Link
              href="/admin/news"
              className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-white/5 hover:text-[var(--color-accent)] transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6M7 12h4" />
              </svg>
              <span>News Articles</span>
            </Link>
            <Link
              href="/admin/reports"
              className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-white/5 hover:text-[var(--color-accent)] transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Reports Queue</span>
            </Link>
            <Link
              href="/admin/settings"
              className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-white/5 hover:text-[var(--color-accent)] transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
          </div>
        </aside>

        {/* Content main */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

// 5. Moderator Shell (Operational layout with Sidebar)
export function ModeratorShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();

  return (
    <div className="theme-magazine min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 md:p-8 animate-fade-in">
        {/* Moderator Sidebar Navigation */}
        <aside className="w-full md:w-60 shrink-0 flex flex-col gap-2">
          <div className="card p-5 flex flex-col gap-2 bg-[var(--color-background-surface)] border-[var(--color-border)]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 px-1">
              Moderator Ops
            </span>
            <Link
              href="/moderator"
              className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-white/5 hover:text-[var(--color-accent)] transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
              </svg>
              <span>Mod Dashboard</span>
            </Link>
            <Link
              href="/moderator/reports"
              className="px-3 py-2 text-xs font-bold rounded-lg hover:bg-white/5 hover:text-[var(--color-accent)] transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Flagged Queue</span>
            </Link>
          </div>
        </aside>

        {/* Content main */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
