"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { http } from "@/shared/lib/api-client";
import { useNavbarNotifications } from "@/shared/hooks/use-navbar-notifications";
import { DesktopNotificationMenu, MobileNotificationMenu } from "./notification-menu";
import { DesktopNavLinks, DrawerNavLinks } from "./navbar-links";
import { ThemeToggle } from "./theme-provider";

export function Navbar() {
  const auth = useAuthStore((state) => state.auth);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);

  const bellRef = useRef<HTMLDivElement>(null);
  const mobileBellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { notifications, unreadCount, markAllRead, markRead, deleteNotification } = useNavbarNotifications();

  const isAdmin = auth?.roles.includes("ADMIN");
  const isMod = auth?.roles.includes("MODERATOR");
  const hasManagementRole = isAdmin || isMod;

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const inBell =
        (bellRef.current && bellRef.current.contains(e.target as Node)) ||
        (mobileBellRef.current && mobileBellRef.current.contains(e.target as Node));
      if (!inBell) setBellOpen(false);

      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
      if (controlRef.current && !controlRef.current.contains(e.target as Node)) {
        setControlOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when toggled open
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

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
      setSearchOpen(false);
    }
  };

  return (
    <header className="w-full sticky top-3 z-50 px-3 md:px-6 transition-all duration-300">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between h-16 gap-4 px-3 md:px-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)]/90 backdrop-blur-xl shadow-[0_14px_34px_rgb(16_20_15_/_8%)]">
        {/* LEFT SECTION: Hamburger Toggle (Mobile Only) + Split Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="Toggle Side Drawer"
            title="Toggle Menu Drawer"
            className="md:hidden p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-all active:scale-95 duration-150 flex items-center justify-center cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-sans text-lg md:text-xl font-black tracking-wider uppercase cursor-pointer select-none">
              <span className="text-[var(--color-text-primary)] group-hover:opacity-90">FOOTBALL</span>{" "}
              <span className="text-[var(--color-accent)] font-black group-hover:opacity-90">VERSE</span>
            </span>
          </Link>
        </div>

        {/* CENTER SECTION: Icon-Only Navigation Bar */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-xl">
          <DesktopNavLinks />
        </div>

        {/* RIGHT SECTION: Search, Control Hub, Notification Bell, User Avatar */}
        <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
          {/* Expandable Search Button */}
          <div className="relative">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 animate-slide-down">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onBlur={() => {
                    if (!q.trim()) setSearchOpen(false);
                  }}
                  placeholder="Search news, posts..."
                  className="w-44 md:w-56 px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-1 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-all active:scale-95 duration-150 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
          </div>

          <ThemeToggle className="p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-all active:scale-95 duration-150" />

          {/* Unified Control Hub Icon (For Admin & Moderator) */}
          {hasManagementRole && (
            <div ref={controlRef} className="relative">
              <button
                onClick={() => setControlOpen(!controlOpen)}
                aria-label="Management Hub"
                className={`p-2 rounded-full transition-all active:scale-95 duration-150 flex items-center justify-center relative cursor-pointer ${
                  controlOpen
                    ? "bg-[var(--color-accent)] text-[var(--color-background-body)] shadow-md"
                    : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                }`}
                title="Management Hub"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-accent)] rounded-full animate-ping" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-accent)] rounded-full" />
              </button>

              {controlOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-50 animate-slide-down">
                  <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/40">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)] block">
                      Control Ops
                    </span>
                    <span className="text-[11px] font-bold text-[var(--color-text-primary)]">
                      Management Hub
                    </span>
                  </div>
                  <div className="p-1 flex flex-col gap-0.5">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setControlOpen(false)}
                        className="px-3.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] rounded-xl transition-colors flex items-center gap-2.5"
                      >
                        <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Admin Dashboard
                      </Link>
                    )}
                    {isMod && (
                      <Link
                        href="/moderator"
                        onClick={() => setControlOpen(false)}
                        className="px-3.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] rounded-xl transition-colors flex items-center gap-2.5"
                      >
                        <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Moderator Hub
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification Bell */}
          {auth && (
            <div ref={bellRef} className="relative">
              <button
                onClick={() => {
                  setBellOpen(!bellOpen);
                  if (!bellOpen && unreadCount > 0) markAllRead();
                }}
                aria-label="Notifications"
                className="relative p-2 rounded-full hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-all active:scale-95 duration-150 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-danger)] text-[var(--color-text-inverse)] text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
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
          )}

          {/* User Profile Avatar / Dropdown */}
          {auth ? (
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen(!userOpen)}
                aria-label="Account menu"
                aria-expanded={userOpen}
                className="w-8 h-8 rounded-full bg-[var(--color-background-body)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-text-primary)] font-extrabold text-xs flex items-center justify-center shadow-xs active:scale-95 transition-all duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {userOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-50 animate-slide-down text-left">
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
                      className="px-3.5 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)] rounded-xl transition-colors flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setUserOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-xl transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <button className="px-4 py-1.5 rounded-full text-xs font-bold text-[var(--color-background-body)] bg-[var(--color-accent)] hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer">
                Login
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* OFF-CANVAS SIDE DRAWER (MOBILE ONLY) */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-xs z-50 animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {drawerOpen && (
        <aside className="md:hidden fixed top-0 left-0 w-80 max-w-[85vw] h-screen bg-[var(--color-background-surface)] border-r border-[var(--color-border)] p-6 flex flex-col gap-6 shadow-2xl z-50 animate-slide-down overflow-y-auto">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
            <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2">
              <span className="font-sans text-lg font-black tracking-wider uppercase select-none">
                <span className="text-[var(--color-text-primary)]">FOOTBALL</span>{" "}
                <span className="text-[var(--color-accent)]">VERSE</span>
              </span>
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              title="Close Drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Field inside Drawer */}
          <form onSubmit={handleSearchSubmit} className="w-full relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search news, posts..."
              className="w-full px-4 py-2.5 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] shadow-inner"
            />
            <svg
              className="w-4 h-4 text-[var(--color-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          {/* Navigation Links inside Drawer */}
          <DrawerNavLinks auth={auth} onNavigate={() => setDrawerOpen(false)} />

          {/* Drawer Footer Account Controls */}
          <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
            {auth ? (
              <div className="flex flex-col gap-2">
                <div className="px-3 py-2 rounded-xl bg-[var(--color-background-body)]/50 border border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{auth.username}</span>
                  <span className="text-[9px] font-bold text-[var(--color-text-secondary)] uppercase">Online</span>
                </div>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-[var(--color-danger)] bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)]/20 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setDrawerOpen(false)} className="w-full block">
                <button className="w-full py-2.5 rounded-xl text-xs font-bold text-[var(--color-background-body)] bg-[var(--color-accent)] hover:opacity-90 transition-colors cursor-pointer">
                  Login
                </button>
              </Link>
            )}
          </div>
        </aside>
      )}

      {bellOpen && <MobileNotificationMenu notifications={notifications} onClose={() => setBellOpen(false)} />}
    </header>
  );
}
