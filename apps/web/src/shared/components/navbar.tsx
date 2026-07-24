"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { http } from "@/shared/lib/api-client";
import { useNavbarNotifications } from "@/shared/hooks/use-navbar-notifications";
import { DesktopNotificationMenu, MobileNotificationMenu } from "./notification-menu";
import { DesktopNavLinks, MobileNavLinks } from "./navbar-links";

export function Navbar() {
  const auth = useAuthStore((state) => state.auth);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const mobileBellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead, markRead, deleteNotification } = useNavbarNotifications();

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const inBell = (bellRef.current && bellRef.current.contains(e.target as Node)) ||
                     (mobileBellRef.current && mobileBellRef.current.contains(e.target as Node));
      if (!inBell) {
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
    await http.post("/auth/logout", {}).catch(() => undefined);
    logout();
    queryClient.clear();
    router.push("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
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
          <DesktopNavLinks auth={auth} />

          {/* User Section */}
          <div className="flex items-center gap-4">

            {auth ? (
              <div className="flex items-center gap-3">
                {/* Bell */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => {
                      setBellOpen(!bellOpen);
                      if (!bellOpen && unreadCount > 0) markAllRead();
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
                    <DesktopNotificationMenu
                      notifications={notifications}
                      onClose={() => setBellOpen(false)}
                      onMarkAllRead={markAllRead}
                      onMarkRead={markRead}
                      onDelete={deleteNotification}
                    />
                  )}
                </div>

                {/* User Dropdown */}
                <div ref={userRef} className="relative">
                  <button
                    onClick={() => setUserOpen(!userOpen)}
                    aria-label="Open account menu"
                    aria-expanded={userOpen}
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
            <div ref={mobileBellRef} className="relative">
              <button
                onClick={() => {
                  setBellOpen(!bellOpen);
                  if (!bellOpen && unreadCount > 0) markAllRead();
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
            </div>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 transition-colors active:scale-95 duration-150 flex items-center justify-center"
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

      {/* Backdrop for mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden absolute inset-x-0 top-full h-screen bg-black/45 backdrop-blur-sm z-40 transition-opacity duration-300 animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[var(--color-background-surface)] border-b border-[var(--color-border)] py-6 px-6 flex flex-col gap-5 shadow-xl animate-slide-down z-50 max-h-[calc(100vh-70px)] overflow-y-auto">
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search news, posts..."
              className="w-full px-4 py-2.5 pl-10 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)]/50 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300 shadow-inner"
            />
            <svg className="w-4 h-4 text-[var(--color-text-secondary)]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          <MobileNavLinks auth={auth} onNavigate={() => setMobileOpen(false)} />

          <div className="pt-3 border-t border-[var(--color-border)]">
            {auth ? (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="w-full btn btn-secondary !py-2.5 !text-xs cursor-pointer"
              >
                Logout
              </button>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full block">
                <button className="w-full btn btn-primary !py-2.5 !text-xs cursor-pointer">Login</button>
              </Link>
            )}
          </div>
        </div>
      )}

      {bellOpen && <MobileNotificationMenu notifications={notifications} onClose={() => setBellOpen(false)} />}
    </div>
  );
}
