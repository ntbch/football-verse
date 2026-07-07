"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { SportsShell } from "@/shared/components/page-shell";
import { useAuthStore } from "@/shared/lib/auth-store";
import { LoadingBlock } from "@/shared/components/state-blocks";

const MOD_LINKS = [
  { href: "/moderator", label: "Mod Dashboard" },
  { href: "/moderator/reports", label: "Open Reports" },
];

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready) {
      if (!auth) {
        router.push("/login");
      } else if (!auth.roles.includes("MODERATOR") && !auth.roles.includes("ADMIN")) {
        router.push("/profile");
      }
    }
  }, [auth, ready, router]);

  if (!ready || !auth || (!auth.roles.includes("MODERATOR") && !auth.roles.includes("ADMIN"))) {
    return (
      <SportsShell>
        <LoadingBlock label="Verifying Moderation Permissions" />
      </SportsShell>
    );
  }

  return (
    <SportsShell>
      <div className="flex flex-col gap-6 w-full text-white animate-fade-in">
        {/* Moderator Header */}
        <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-4">
          <h2 className="m-0 font-serif-title font-black text-2xl tracking-tight text-[var(--color-accent)]">
            MODERATOR CONSOLE
          </h2>
          <p className="text-xs leading-relaxed font-medium text-[var(--color-text-secondary)]">
            Flagged discussions, toxic comment queues, and community cleanup controls.
          </p>
        </div>

        {/* Horizontal Navigation rail */}
        <div className="py-2 border-b border-[var(--color-border)] overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-3 min-w-max pb-1 text-xs font-bold uppercase tracking-wider">
            {MOD_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/moderator" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[var(--color-accent)] text-black"
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
    </SportsShell>
  );
}
