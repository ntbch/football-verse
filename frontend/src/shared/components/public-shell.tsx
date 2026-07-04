"use client";

import Link from "next/link";
import { useAuthStore } from "@/shared/lib/auth-store";
import { http } from "@/shared/lib/api-client";

const nav = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/forum", label: "Forum" },
  { href: "/profile", label: "Profile" }
];

export const PublicShell = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthStore((state) => state.auth);
  const logout = useAuthStore((state) => state.logout);
  const handleLogout = async () => {
    const refreshToken = auth?.refreshToken;
    logout();
    if (refreshToken) {
      await http.post("/auth/logout", { refreshToken }).catch(() => undefined);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 md:px-8">
      <header className="panel touchline mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="display-face text-3xl font-black tracking-tight">
          Football Verse
        </Link>
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
