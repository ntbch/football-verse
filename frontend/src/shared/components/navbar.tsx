"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { http } from "@/shared/lib/api-client";

export function Navbar() {
  const auth = useAuthStore((state) => state.auth);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <Link href="/" className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[var(--color-accent)] hover:after:w-full after:transition-all after:duration-300">
              Home
            </Link>
            <Link href="/news" className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[var(--color-accent)] hover:after:w-full after:transition-all after:duration-300">
              News
            </Link>
            <Link href="/matches" className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[var(--color-accent)] hover:after:w-full after:transition-all after:duration-300">
              Simulator
            </Link>
            <Link href="/predictions" className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[var(--color-accent)] hover:after:w-full after:transition-all after:duration-300">
              Predictions
            </Link>
            <Link href="/forum" className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[var(--color-accent)] hover:after:w-full after:transition-all after:duration-300">
              Forum
            </Link>
            
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
        <div className="md:hidden flex items-center">
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
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5"
            >
              Home
            </Link>
            <Link
              href="/news"
              onClick={() => setMobileOpen(false)}
              className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5"
            >
              News
            </Link>
            <Link
              href="/matches"
              onClick={() => setMobileOpen(false)}
              className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5"
            >
              Simulator
            </Link>
            <Link
              href="/predictions"
              onClick={() => setMobileOpen(false)}
              className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5"
            >
              Predictions
            </Link>
            <Link
              href="/forum"
              onClick={() => setMobileOpen(false)}
              className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5"
            >
              Forum
            </Link>
            {auth && hasRole("ADMIN") && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="font-bold text-xs uppercase tracking-wider text-[var(--color-accent)] py-1 border-b border-black/5"
              >
                Admin
              </Link>
            )}
            {auth && hasRole("MODERATOR") && (
              <Link
                href="/moderator"
                onClick={() => setMobileOpen(false)}
                className="font-bold text-xs uppercase tracking-wider text-[var(--color-accent)] py-1 border-b border-black/5"
              >
                Moderator
              </Link>
            )}
            {auth && (
              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="font-bold text-xs uppercase tracking-wider text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors duration-300 py-1 border-b border-black/5"
              >
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
    </div>
  );
}
