"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { http, data } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { NotificationResponse } from "@/shared/lib/types";

export function Navbar() {
  const auth = useAuthStore((state) => state.auth);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: qk.user.notifications(),
    queryFn: () => data<NotificationResponse[]>(http.get("/notifications")),
    enabled: !!auth,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: () => http.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.notifications() });
    },
  });

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
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
    <div className="w-full sticky top-0 z-50 px-4 md:px-8 py-3.5 bg-[var(--color-background-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)] shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <img
            src="/logo.png"
            alt="Football Verse Logo"
            className="w-9 h-9 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
          />
          <span className="font-serif text-xl md:text-2xl font-black tracking-tight text-[var(--color-text-primary)] cursor-pointer group-hover:opacity-80 transition-opacity duration-300">
            Football Verse
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:block max-w-xs w-full relative">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search news, posts..."
            className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)]/50 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300 shadow-inner"
          />
          <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            {[
              { href: "/", label: "Home" },
              { href: "/news", label: "News" },
              { href: "/forum", label: "Forum" },
              { href: "/predictions", label: "Predictions" },
              { href: "/matches", label: "Tactics Arena" },
            ].map(({ href, label }) => {
              const active = isActive(href);
              if (href === "/matches") {
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 border ${
                      active
                        ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] shadow-md shadow-[var(--color-accent)]/20"
                        : "border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black hover:shadow-md hover:shadow-[var(--color-accent)]/20"
                    }`}
                  >
                    {label}
                  </Link>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative py-1 transition-all duration-200 hover:text-[var(--color-accent)] active:scale-[0.98] ${
                    active ? "text-[var(--color-accent)] font-extrabold" : "text-[var(--color-text-primary)]/70"
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-full animate-fade-in" />
                  )}
                </Link>
              );
            })}

            {auth && hasRole("ADMIN") && (
              <Link
                href="/admin"
                className={`relative py-1 transition-all duration-200 hover:text-[var(--color-accent)] active:scale-[0.98] ${
                  isActive("/admin") ? "text-[var(--color-accent)] font-extrabold" : "text-[var(--color-text-primary)]/70"
                }`}
              >
                Admin
                {isActive("/admin") && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-full animate-fade-in" />
                )}
              </Link>
            )}
            {auth && hasRole("MODERATOR") && (
              <Link
                href="/moderator"
                className={`relative py-1 transition-all duration-200 hover:text-[var(--color-accent)] active:scale-[0.98] ${
                  isActive("/moderator") ? "text-[var(--color-accent)] font-extrabold" : "text-[var(--color-text-primary)]/70"
                }`}
              >
                Moderator
                {isActive("/moderator") && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-full animate-fade-in" />
                )}
              </Link>
            )}
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-4">

            {auth ? (
              <div className="flex items-center gap-3">
                {/* Bell */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => {
                      setBellOpen(!bellOpen);
                      if (!bellOpen && unreadCount > 0) markReadMutation.mutate();
                    }}
                    className="relative p-1.5 rounded-full hover:bg-black/5 transition-all active:scale-95 duration-150"
                  >
                    <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {bellOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/30 flex items-center justify-between">
                        <h4 className="m-0 font-serif font-black text-sm text-[var(--color-text-primary)]">Notifications</h4>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => markReadMutation.mutate()}
                            className="text-[9px] font-bold uppercase text-[var(--color-accent)] hover:underline active:scale-[0.98] transition-all"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)]/30">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-xs text-[var(--color-text-secondary)] font-medium">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.slice(0, 15).map((notif) => (
                            <div
                              key={notif.id}
                              className={`px-4 py-3 transition-colors ${!notif.read ? "bg-[var(--color-accent)]/5" : "hover:bg-[var(--color-background-body)]/20"}`}
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

                {/* User Dropdown */}
                <div ref={userRef} className="relative">
                  <button
                    onClick={() => setUserOpen(!userOpen)}
                    className="w-7 h-7 rounded-full bg-[var(--color-background-body)] flex items-center justify-center font-bold text-xs text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] active:scale-95 transition-all duration-150 shadow-sm"
                  >
                    {auth.username[0].toUpperCase()}
                  </button>

                  {userOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in text-left">
                      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/30">
                        <p className="text-[11px] font-bold text-[var(--color-text-primary)] truncate m-0">
                          {auth.username}
                        </p>
                        <span className="text-[9px] text-[var(--color-text-secondary)] block truncate mt-0.5">
                          Logged in
                        </span>
                      </div>
                      <div className="p-1 flex flex-col gap-0.5">
                        <Link
                          href="/profile"
                          onClick={() => setUserOpen(false)}
                          className="px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setUserOpen(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50/50 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/login">
                <button className="btn btn-primary !px-5 !py-2 !text-[10px] active:scale-[0.98] transition-all">
                  Login
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          {auth && (
            <button
              onClick={() => {
                setBellOpen(!bellOpen);
                if (!bellOpen && unreadCount > 0) markReadMutation.mutate();
              }}
              className="relative p-1.5 rounded-full hover:bg-black/5 transition-colors active:scale-95 duration-150"
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
            className="p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 transition-colors active:scale-95 duration-150 flex items-center justify-center"
            title="Toggle Menu"
          >
            {mobileOpen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
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
              className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none"
            />
            <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <div className="flex flex-col gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            {[
              { href: "/", label: "Home" },
              { href: "/news", label: "News" },
              { href: "/forum", label: "Forum" },
              { href: "/predictions", label: "Predictions" },
              { href: "/matches", label: "Tactics Arena" },
            ].map(({ href, label }) => {
              const active = isActive(href);
              if (href === "/matches") {
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`transition-all duration-300 py-2.5 my-1.5 px-3.5 rounded-xl border flex items-center justify-between font-black active:scale-[0.98] ${
                      active
                        ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] shadow-md shadow-[var(--color-accent)]/20"
                        : "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5 hover:bg-[var(--color-accent)] hover:text-black"
                    }`}
                  >
                    <span>{label}</span>
                    <svg className={`w-3.5 h-3.5 ${active ? "text-black" : "text-[var(--color-accent)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`transition-all duration-200 py-2 border-b border-black/5 flex items-center justify-between active:scale-[0.98] ${
                    active ? "text-[var(--color-accent)] font-extrabold pl-2 border-l-2 border-l-[var(--color-accent)] bg-[var(--color-background-body)]/40 rounded-r-lg" : "text-[var(--color-text-primary)]/80 hover:text-[var(--color-accent)]"
                  }`}
                >
                  <span>{label}</span>
                  {active && (
                    <svg className="w-3 h-3 text-[var(--color-accent)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Link>
              );
            })}
            {auth && hasRole("ADMIN") && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={`transition-all duration-200 py-2 border-b border-black/5 flex items-center justify-between active:scale-[0.98] ${
                  isActive("/admin") ? "text-[var(--color-accent)] font-extrabold pl-2 border-l-2 border-l-[var(--color-accent)] bg-[var(--color-background-body)]/40 rounded-r-lg" : "text-[var(--color-text-primary)]/80 hover:text-[var(--color-accent)]"
                }`}
              >
                <span>Admin</span>
                {isActive("/admin") && (
                  <svg className="w-3 h-3 text-[var(--color-accent)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            )}
            {auth && hasRole("MODERATOR") && (
              <Link
                href="/moderator"
                onClick={() => setMobileOpen(false)}
                className={`transition-all duration-200 py-2 border-b border-black/5 flex items-center justify-between active:scale-[0.98] ${
                  isActive("/moderator") ? "text-[var(--color-accent)] font-extrabold pl-2 border-l-2 border-l-[var(--color-accent)] bg-[var(--color-background-body)]/40 rounded-r-lg" : "text-[var(--color-text-primary)]/80 hover:text-[var(--color-accent)]"
                }`}
              >
                <span>Moderator</span>
                {isActive("/moderator") && (
                  <svg className="w-3 h-3 text-[var(--color-accent)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            )}
            {auth && (
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className={`transition-all duration-200 py-2 border-b border-black/5 flex items-center justify-between active:scale-[0.98] ${
                  isActive("/profile") ? "text-[var(--color-accent)] font-extrabold pl-2 border-l-2 border-l-[var(--color-accent)] bg-[var(--color-background-body)]/40 rounded-r-lg" : "text-[var(--color-text-primary)]/80 hover:text-[var(--color-accent)]"
                }`}
              >
                <span>Profile</span>
                {isActive("/profile") && (
                  <svg className="w-3 h-3 text-[var(--color-accent)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--color-border)]">

            {auth ? (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Hi, {auth.username}</span>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="w-full btn btn-secondary !py-2.5 !text-xs"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full block">
                <button className="w-full btn btn-primary !py-2.5 !text-xs">Login</button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Mobile notifications */}
      {bellOpen && (
        <div className="md:hidden absolute right-4 top-16 w-[calc(100%-2rem)] max-w-sm bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/30 flex items-center justify-between">
            <h4 className="m-0 font-serif font-black text-sm text-[var(--color-text-primary)]">Notifications</h4>
            <button
              onClick={() => setBellOpen(false)}
              className="p-1 rounded-lg text-[var(--color-text-secondary)] hover:bg-black/5 transition-colors active:scale-95 duration-150"
              title="Close notifications"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-border)]/30">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-[var(--color-text-secondary)] font-medium">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 transition-colors ${!notif.read ? "bg-[var(--color-accent)]/5" : "hover:bg-[var(--color-background-body)]/20"}`}
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
