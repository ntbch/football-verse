"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRealtimeNotifications } from "@/shared/hooks/use-realtime-notifications";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { RoleNavigationItem } from "./role-navigation";

type RoleShellProps = {
  children: ReactNode;
  navigation: RoleNavigationItem[];
  roleLabel: string;
  sectionLabel: string;
  fallbackInitial: string;
};

export function RoleShell({ children, navigation, roleLabel, sectionLabel, fallbackInitial }: RoleShellProps) {
  useRealtimeNotifications();
  const auth = useAuthStore((state) => state.auth);
  const pathname = usePathname();

  return (
    <div className="theme-magazine min-h-[100dvh] flex bg-[var(--color-background-body)]">
      <aside className="w-56 shrink-0 fixed inset-y-0 left-0 z-30 flex flex-col bg-[var(--color-background-surface)] border-r border-[var(--color-border)]">
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="Football Verse Logo" className="w-7 h-7 rounded-lg object-cover shadow-sm shrink-0" />
            <div>
              <div className="text-xs font-black tracking-tight leading-none text-[var(--color-text-primary)]">Football Verse</div>
              <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5 text-[var(--color-accent)]">{roleLabel}</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          <span className="text-[9px] font-black uppercase tracking-widest px-2 mb-2 text-[var(--color-text-secondary)]">{sectionLabel}</span>
          {navigation.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] ${active ? "shadow-sm bg-[var(--color-accent)] text-white" : "hover:bg-black/5"}`}
              >
                <span className={active ? "text-white" : "text-[var(--color-text-secondary)]"}>{item.icon}</span>
                <span className={active ? "text-white" : "text-[var(--color-text-primary)]"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 flex flex-col gap-2 border-t border-[var(--color-border)]">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-black/5 transition-all active:scale-[0.98]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Site
          </Link>
          {auth && (
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-[10px] bg-[var(--color-accent)] text-white">
                {(auth.username || fallbackInitial).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate text-[var(--color-text-primary)]">{auth.username}</div>
                <div className="text-[9px] font-semibold text-[var(--color-text-secondary)]">{roleLabel}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 ml-56 min-h-[100dvh] flex flex-col bg-[var(--color-background-body)]">
        <main className="flex-1 p-6 animate-fade-in text-[var(--color-text-primary)]">{children}</main>
      </div>
    </div>
  );
}
