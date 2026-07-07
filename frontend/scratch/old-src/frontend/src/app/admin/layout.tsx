"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AdminShell } from "@/shared/components/page-shell";
import { useAuthStore } from "@/shared/lib/auth-store";
import { LoadingBlock } from "@/shared/components/state-blocks";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/news", label: "Articles" },
  { href: "/admin/news/sources", label: "RSS Crawler" },
  { href: "/admin/forum", label: "Forum Categories" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready) {
      if (!auth) {
        router.push("/login");
      } else if (!auth.roles.includes("ADMIN")) {
        router.push("/profile");
      }
    }
  }, [auth, ready, router]);

  if (!ready || !auth || !auth.roles.includes("ADMIN")) {
    return (
      <AdminShell>
        <LoadingBlock label="Verifying Administrator Privilege" />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6 w-full text-white animate-fade-in">
        {/* Admin Header */}
        <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-4">
          <h2 className="m-0 font-black text-2xl tracking-tight text-[var(--color-accent)]">
            ADMINISTRATIVE DESK
          </h2>
          <p className="text-[10px] text-[var(--color-text-secondary)] font-semibold">
            System logs, database entities, content CMS, and moderation reports.
          </p>
        </div>

        {/* Horizontal Navigation rail */}
        <div className="py-2 border-b border-[var(--color-border)] overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-3 min-w-max pb-1 text-xs font-bold uppercase tracking-wider">
            {ADMIN_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[var(--color-accent)] text-black shadow-sm"
                      : "text-gray-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Page content */}
        <div className="w-full">{children}</div>
      </div>
    </AdminShell>
  );
}
