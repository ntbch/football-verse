"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRealtimeNotifications } from "@/shared/hooks/use-realtime-notifications";
import { Navbar } from "./navbar";
import { adminNavigation, moderatorNavigation } from "./role-navigation";
import { RoleShell } from "./role-shell";

type StandardShellProps = {
  children: ReactNode;
  game?: boolean;
};

function StandardShell({ children, game = false }: StandardShellProps) {
  useRealtimeNotifications();

  return (
    <div className="theme-magazine min-h-screen flex flex-col bg-[var(--color-background-body)] text-[var(--color-text-primary)] transition-all">
      {!game && <Navbar />}
      <main className={game ? "flex-1 w-full animate-fade-in" : "flex-1 max-w-[1440px] w-full mx-auto px-4 py-7 md:px-8 md:py-10 animate-fade-in"}>
        {children}
      </main>
      {!game && <SiteFooter />}
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return <StandardShell>{children}</StandardShell>;
}

export function SportsShell({ children, game = false }: StandardShellProps) {
  return <StandardShell game={game}>{children}</StandardShell>;
}

export function CommunityShell({ children }: { children: ReactNode }) {
  return <StandardShell>{children}</StandardShell>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  return <RoleShell navigation={adminNavigation} roleLabel="Administrator" sectionLabel="Control Ops" fallbackInitial="A">{children}</RoleShell>;
}

export function ModeratorShell({ children }: { children: ReactNode }) {
  return <RoleShell navigation={moderatorNavigation} roleLabel="Moderator" sectionLabel="Mod Tools" fallbackInitial="M">{children}</RoleShell>;
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] px-4 py-6 text-xs text-[var(--color-text-secondary)] md:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        <span>Football Verse · Football intelligence with source context.</span>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms" className="hover:text-[var(--color-text-primary)] hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:text-[var(--color-text-primary)] hover:underline">Privacy</Link>
          <Link href="/community-guidelines" className="hover:text-[var(--color-text-primary)] hover:underline">Community Guidelines</Link>
          <Link href="/contact" className="hover:text-[var(--color-text-primary)] hover:underline">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
