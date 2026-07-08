"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "../lib/auth-store";
import { apiBaseUrl } from "../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "../lib/query-keys";
import { useToast } from "@/shared/components/toast";
import { Navbar } from "./navbar";
import { usePathname as usePathnameHook } from "next/navigation";
import { io, Socket } from "socket.io-client";

// Shared Socket.io Notifications Hook
function useNotificationsSSE() {
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!auth?.accessToken || !auth?.userId) return;

    let socketUrl = "http://localhost:8000";
    try {
      socketUrl = new URL(apiBaseUrl).origin;
    } catch (e) {
      console.error("Failed to parse apiBaseUrl for socket connection", e);
    }

    const socket: Socket = io(socketUrl, {
      query: {
        userId: auth.userId.toString(),
      },
      transports: ["polling", "websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to Realtime Gateway Socket.io server");
    });

    socket.on("notification", (data: any) => {
      try {
        toast({
          body: data.message,
          type: "info",
          autoHideDuration: 6000,
        });

        // Invalidate notifications query to trigger navbar update
        queryClient.invalidateQueries({ queryKey: qk.user.notifications() });
      } catch (err) {
        console.error("Failed to parse Socket.io notification", err);
      }
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket.io connection error", err);
    });

    return () => {
      socket.disconnect();
    };
  }, [auth?.accessToken, auth?.userId, queryClient, toast]);
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

// 4. Admin Shell — Full sidebar layout, no top navbar
export function AdminShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();
  const auth = useAuthStore((state) => state.auth);
  const pathname = usePathnameHook();

  const ADMIN_NAV = [
    {
      href: "/admin",
      label: "Dashboard",
      exact: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      href: "/admin/news",
      label: "Articles",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6M7 12h4" />
        </svg>
      ),
    },
    {
      href: "/admin/news/sources",
      label: "News Sources",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z" />
        </svg>
      ),
    },
    {
      href: "/admin/forum",
      label: "Forum",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="theme-magazine min-h-[100dvh] flex" style={{ backgroundColor: "var(--color-background-body)" }}>
      {/* ── Fixed Sidebar ── */}
      <aside className="w-56 shrink-0 fixed inset-y-0 left-0 z-30 flex flex-col" style={{ backgroundColor: "var(--color-background-surface)", borderRight: "1px solid var(--color-border)" }}>
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Football Verse Logo"
              className="w-7 h-7 rounded-lg object-cover shadow-sm shrink-0"
            />
            <div>
              <div className="text-xs font-black tracking-tight leading-none" style={{ color: "var(--color-text-primary)" }}>Football Verse</div>
              <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "var(--color-accent)" }}>Admin</div>
            </div>
          </Link>
        </div>

        {/* Nav section */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          <span className="text-[9px] font-black uppercase tracking-widest px-2 mb-2" style={{ color: "var(--color-text-secondary)" }}>Control Ops</span>
          {ADMIN_NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) &&
                (item.href === "/admin/news" ? !pathname.startsWith("/admin/news/sources") : true) &&
                item.href !== "/admin";
            const isExactActive = item.exact && pathname === item.href;
            const active = isActive || isExactActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { backgroundColor: "var(--color-accent)", color: "#fff" } : {}}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                  active ? "shadow-sm" : "hover:bg-black/5"
                }`}
              >
                <span style={{ color: active ? "#fff" : "var(--color-text-secondary)" }}>{item.icon}</span>
                <span style={{ color: active ? "#fff" : "var(--color-text-primary)" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + back link */}
        <div className="px-3 py-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--color-border)" }}>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-black/5 transition-all active:scale-[0.98]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Site
          </Link>
          {auth && (
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-[10px]" style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}>
                {(auth.username || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{auth.username}</div>
                <div className="text-[9px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>Administrator</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content area (offset by sidebar width) ── */}
      <div className="flex-1 ml-56 min-h-[100dvh] flex flex-col" style={{ backgroundColor: "var(--color-background-body)" }}>
        <main className="flex-1 p-6 animate-fade-in" style={{ color: "var(--color-text-primary)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// 5. Moderator Shell — Full sidebar layout, no top navbar
export function ModeratorShell({ children }: { children: React.ReactNode }) {
  useNotificationsSSE();
  const auth = useAuthStore((state) => state.auth);
  const pathname = usePathnameHook();

  const MOD_NAV = [
    {
      href: "/moderator",
      label: "Mod Dashboard",
      exact: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
        </svg>
      ),
    },
    {
      href: "/moderator/reports",
      label: "Flagged Queue",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="theme-magazine min-h-[100dvh] flex" style={{ backgroundColor: "var(--color-background-body)" }}>
      {/* ── Fixed Sidebar ── */}
      <aside className="w-56 shrink-0 fixed inset-y-0 left-0 z-30 flex flex-col" style={{ backgroundColor: "var(--color-background-surface)", borderRight: "1px solid var(--color-border)" }}>
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="Football Verse Logo"
              className="w-7 h-7 rounded-lg object-cover shadow-sm shrink-0"
            />
            <div>
              <div className="text-xs font-black tracking-tight leading-none" style={{ color: "var(--color-text-primary)" }}>Football Verse</div>
              <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "var(--color-accent)" }}>Moderator</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest px-2 mb-2" style={{ color: "var(--color-text-secondary)" }}>Mod Tools</span>
          {MOD_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { backgroundColor: "var(--color-accent)", color: "#fff" } : {}}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${
                  active ? "shadow-sm" : "hover:bg-black/5"
                }`}
              >
                <span style={{ color: active ? "#fff" : "var(--color-text-secondary)" }}>{item.icon}</span>
                <span style={{ color: active ? "#fff" : "var(--color-text-primary)" }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--color-border)" }}>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-black/5 transition-all active:scale-[0.98]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Site
          </Link>
          {auth && (
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-[10px]" style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}>
                {(auth.username || "M").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{auth.username}</div>
                <div className="text-[9px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>Moderator</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 ml-56 min-h-[100dvh] flex flex-col" style={{ backgroundColor: "var(--color-background-body)" }}>
        <main className="flex-1 p-6 animate-fade-in" style={{ color: "var(--color-text-primary)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

