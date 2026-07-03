"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/shared/lib/auth-store";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/news/new", label: "New Article" },
  { href: "/admin/news/sources", label: "RSS Sources" },
  { href: "/admin/forum", label: "Forum" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" }
];

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);

  useEffect(() => {
    if (ready && !auth?.roles.includes("ADMIN")) {
      router.replace("/login");
    }
  }, [auth, ready, router]);

  return (
    <div className="min-h-screen bg-[var(--fv-night)] text-[var(--fv-paper)] md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
        <Link href="/" className="display-face text-2xl font-black">
          FV Control
        </Link>
        <nav className="mt-8 grid gap-2 text-sm font-bold uppercase">
          {nav.map((item) => (
            <Link className="border border-white/10 px-3 py-2 hover:bg-white/10" key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="p-4 md:p-8">{children}</section>
    </div>
  );
};
