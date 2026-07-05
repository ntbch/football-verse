"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { http, apiBaseUrl } from "@/shared/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";

const nav = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/matches", label: "Matches" },
  { href: "/forum", label: "Forum" },
  { href: "/profile", label: "Profile" }
];

export const PublicShell = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthStore((state) => state.auth);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ id: string; message: string; linkUrl?: string } | null>(null);

  useEffect(() => {
    if (!auth?.accessToken) return;

    const eventSource = new EventSource(`${apiBaseUrl}/notifications/stream?token=${auth.accessToken}`);

    eventSource.addEventListener("notification", (event) => {
      try {
        const notif = JSON.parse(event.data);
        setToast({
          id: String(notif.id),
          message: notif.message,
          linkUrl: notif.linkUrl
        });
        
        // Invalidate notifications query to update UI automatically
        queryClient.invalidateQueries({ queryKey: qk.user.notifications() });
      } catch (err) {
        console.error("Failed to parse notification event", err);
      }
    });

    eventSource.addEventListener("error", (err) => {
      console.warn("SSE connection error", err);
    });

    return () => {
      eventSource.close();
    };
  }, [auth?.accessToken, queryClient]);

  // Dismiss toast after 6 seconds automatically
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleLogout = async () => {
    const refreshToken = auth?.refreshToken;
    logout();
    if (refreshToken) {
      await http.post("/auth/logout", { refreshToken }).catch(() => undefined);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 md:px-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-[var(--fv-line)] bg-black/90 p-4 shadow-2xl backdrop-blur-md transition-all duration-300">
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{toast.message}</p>
            {toast.linkUrl && (
              <Link
                href={toast.linkUrl}
                className="mt-1 block text-xs font-semibold text-[var(--fv-clay)] hover:underline"
                onClick={() => setToast(null)}
              >
                View Details
              </Link>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white text-xs font-bold px-2 py-1 bg-white/5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      <header className="panel touchline mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="display-face text-3xl font-black tracking-tight shrink-0">
          Football Verse
        </Link>
        <form onSubmit={handleSearchSubmit} className="relative flex max-w-md w-full items-center md:max-w-xs">
          <input
            type="search"
            placeholder="Search news, posts..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input w-full !pl-9 text-sm"
          />
          <div className="pointer-events-none absolute left-3 flex items-center">
            <svg
              className="h-4 w-4 text-[var(--fv-ink)] opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </form>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-bold uppercase">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          {auth ? (
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout {auth.username}
            </button>
          ) : (
            <Link className="btn" href="/login">
              Login
            </Link>
          )}
        </nav>
      </header>
      {children}
    </main>
  );
};
