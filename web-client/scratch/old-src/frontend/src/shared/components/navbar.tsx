"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { http, data } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import { NotificationResponse } from "@/shared/lib/types";

export function Navbar() {
  const auth = useAuthStore((state) => state.auth);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: qk.user.notifications(),
    queryFn: () => data<NotificationResponse[]>(http.get("/notifications")),
    enabled: !!auth,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark all as read
  const markReadMutation = useMutation({
    mutationFn: () => http.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.notifications() });
    },
  });

  // Close bell dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const refreshToken = auth?.refreshToken;
    logout();
    if (refreshToken) {
      await http.post("/auth/logout", { refreshToken }).catch(() => undefined);
    }
    router.push("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  const hasRole = (role: string) => {
    return auth?.roles?.includes(role as any) ?? false;
  };

  const navLinkClass = "font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[var(--color-accent)] hover:after:w-full after:transition-all after:duration-300";

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="w-full sticky top-0 z-50 px-4 md:px-8 py-3 bg-[var(--color-background-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)] shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">

        {/* Left Side: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <span className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white font-serif font-black text-base shadow-md group-hover:scale-105 transition-transform duration-300">
            F
          </span>
          <span className="font-serif text-xl md:text-2xl font-black tracking-tight text-[var(--color-text-primary)] cursor-pointer group-hover:opacity-85 transition-opacity duration-300">
            Football Verse
          </span>
        </Link>

        {/* Center: Search input */}
        <form onSubmit={handleSearchSubmit} className="hidden md:block max-w-xs w-full relative">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search news, posts..."
            className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)]/50 text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] focus:bg-[var(--color-background-body)] transition-all duration-300 shadow-inner"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">
            🔍
          </span>
        </form>

        {/* Right Side: Links & Auth */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-5">
            <Link href="/" className={navLinkClass}>Home</Link>
            <Link href="/news" className={navLinkClass}>News</Link>
            <Link href="/matches" className={navLinkClass}>Simulator</Link>
            <Link href="/predictions" className={navLinkClass}>Predictions</Link>
            <Link href="/forum" className={navLinkClass}>Forum</Link>

            {/* Conditional Roles Links */}
            {auth && hasRole("ADMIN") && (
              <Link href="/admin" className="font-bold text-xs uppercase tracking-wider text-[var(--color-accent)] hover:underline decoration-2 underline-offset-4 transition-all duration-300">
                Admin
              </Link>
            )}
            {auth && hasRole("MODERATOR") && (
              <Link href="/moderator" className="font-bold text-xs uppercase tracking-wider text-[var(--color-accent)] hover:underline decoration-2 underline-offset-4 transition-all duration-300">
                Moderator
              </Link>
            )}
          </div>

          <div className="h-4 w-[1px] bg-[var(--color-border)]"></div>

          {/* User Section */}
          <div className="flex items-center gap-3">
            {auth ? (
              <div className="flex items-center gap-3.5">
                {/* 🔔 Notification Bell */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => {
                      setBellOpen(!bellOpen);
                      if (!bellOpen && unreadCount > 0) {
                        markReadMutation.mutate();
                      }
                    }}
                    className="relative p-1.5 rounded-full hover:bg-gray-100 transition-colors duration-200"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown */}
                  {bellOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-gray-50/50 flex items-center justify-between">
                        <h4 className="m-0 font-serif font-black text-sm text-[var(--color-text-primary)]">Notifications</h4>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => markReadMutation.mutate()}
                            className="text-[9px] font-bold uppercase text-[var(--fv-clay)] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-xs text-[var(--color-text-secondary)] font-medium">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.slice(0, 15).map((notif) => (
                            <div
                              key={notif.id}
                              className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                                !notif.read ? "bg-blue-50/40" : "hover:bg-gray-50"
                              }`}
                            >
                              <p className="text-[11px] text-[var(--color-text-primary)] font-medium leading-snug m-0">
                                {notif.message}
                              </p>
                              <span className="text-[9px] text-[var(--color-text-secondary)] mt-1 block">
                                {timeAgo(notif.createdAt)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link href="/profile" className="flex items-center gap-2 group">
                  <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-[var(--color-text-primary)] border border-[var(--color-border)] group-hover:border-[var(--color-accent)] transition-colors duration-300">
                    {auth.username[0].toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-300">
                    {auth.username}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all duration-300 border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login">
                <button className="px-5 py-2 rounded-full text-[10px] font-bold uppercase transition-all duration-300 bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-95 shadow-sm">
                  Login
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile bell */}
          {auth && (
            <button
              onClick={() => {
                setBellOpen(!bellOpen);
                if (!bellOpen && unreadCount > 0) markReadMutation.mutate();
              }}
              className="relative p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 transition-all duration-300"
          >
            {mobileOpen ? (
              <span className="text-sm font-bold px-1">✕</span>
            ) : (
              <span className="text-sm font-bold px-0.5">☰</span>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="md:hidden flex flex-col gap-4 mt-3 bg-[var(--color-background-surface)] border-t border-[var(--color-border)] pt-4 px-2 w-full animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search news, posts..."
              className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] placeholder-gray-400 focus:outline-none"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs">🔍</span>
          </form>

          <div className="flex flex-col gap-3.5">
            {[
              { href: "/", label: "Home" },
              { href: "/news", label: "News" },
              { href: "/matches", label: "Simulator" },
              { href: "/predictions", label: "Predictions" },
              { href: "/forum", label: "Forum" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5"
              >
                {label}
              </Link>
            ))}
            {auth && hasRole("ADMIN") && (
              <Link href="/admin" onClick={() => setMobileOpen(false)} className="font-bold text-xs uppercase tracking-wider text-[var(--color-accent)] py-1 border-b border-black/5">
                Admin
              </Link>
            )}
            {auth && hasRole("MODERATOR") && (
              <Link href="/moderator" onClick={() => setMobileOpen(false)} className="font-bold text-xs uppercase tracking-wider text-[var(--color-accent)] py-1 border-b border-black/5">
                Moderator
              </Link>
            )}
            {auth && (
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5">
                Profile
              </Link>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--color-border)]">
            {auth ? (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Hi, {auth.username}
                </span>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full py-2.5 rounded-full text-xs font-bold uppercase transition-all duration-300 border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full block">
                <button className="w-full py-2.5 rounded-full text-xs font-bold uppercase transition-all duration-300 bg-[var(--color-accent)] text-white hover:opacity-90">
                  Login
                </button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Mobile notification dropdown (rendered outside mobile menu) */}
      {bellOpen && (
        <div className="md:hidden absolute right-4 top-16 w-[calc(100%-2rem)] max-w-sm bg-white border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-gray-50/50 flex items-center justify-between">
            <h4 className="m-0 font-serif font-black text-sm text-[var(--color-text-primary)]">Notifications</h4>
            <button onClick={() => setBellOpen(false)} className="text-xs font-bold text-[var(--color-text-secondary)]">✕</button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!notif.read ? "bg-blue-50/40" : ""}`}
                >
                  <p className="text-[11px] text-[var(--color-text-primary)] font-medium leading-snug m-0">{notif.message}</p>
                  <span className="text-[9px] text-[var(--color-text-secondary)] mt-1 block">{timeAgo(notif.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
