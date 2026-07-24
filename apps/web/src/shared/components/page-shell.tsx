"use client";

import type { ReactNode } from "react";
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
      <main className={game ? "flex-1 w-full animate-fade-in" : "flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 animate-fade-in"}>
        {children}
      </main>
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
