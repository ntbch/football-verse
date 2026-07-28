"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BrowserAuth } from "@/shared/lib/auth-session";

export type NavItem = {
  href: string;
  label: string;
  tooltip: string;
  icon: (active: boolean) => React.ReactNode;
};

export const publicNavItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    tooltip: "Home",
    icon: (active) => (
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${
          active
            ? "scale-110 text-[var(--color-accent)] fill-current"
            : "text-[var(--color-text-primary)]/70 group-hover:text-[var(--color-text-primary)] fill-none"
        }`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? "1" : "2"}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.707 2.293a1 1 0 011.414 0l8 8a1 1 0 01-1.414 1.414L20 11.414V20a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5h-2v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-8.586l-.293.293a1 1 0 01-1.414-1.414l8-8z"
        />
      </svg>
    ),
  },
  {
    href: "/news",
    label: "News",
    tooltip: "News & Articles",
    icon: (active) => (
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${
          active
            ? "scale-110 text-[var(--color-accent)]"
            : "text-[var(--color-text-primary)]/70 group-hover:text-[var(--color-text-primary)]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    href: "/career",
    label: "Career",
    tooltip: "Career & Matches",
    icon: (active) => (
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${
          active
            ? "scale-110 text-[var(--color-accent)]"
            : "text-[var(--color-text-primary)]/70 group-hover:text-[var(--color-text-primary)]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="4" width="20" height="16" rx="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 9l5 3-5 3V9z" fill={active ? "currentColor" : "none"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/predictions",
    label: "Predictions",
    tooltip: "Predictions & Stats",
    icon: (active) => (
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${
          active
            ? "scale-110 text-[var(--color-accent)]"
            : "text-[var(--color-text-primary)]/70 group-hover:text-[var(--color-text-primary)]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20v-8m6 8V4m6 8v-4" />
      </svg>
    ),
  },
  {
    href: "/forum",
    label: "Forum",
    tooltip: "Community Forum",
    icon: (active) => (
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${
          active
            ? "scale-110 text-[var(--color-accent)]"
            : "text-[var(--color-text-primary)]/70 group-hover:text-[var(--color-text-primary)]"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-1a3 3 0 00-5.356-1.857M17 20H7m10 0v-1c0-.656-.126-1.283-.356-1.857M7 20H2v-1a3 3 0 015.356-1.857M7 20v-1c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
];

function activePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function DesktopNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-center gap-1 md:gap-2.5 h-14">
      {publicNavItems.map(({ href, label, tooltip, icon }) => {
        const active = activePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className="group relative flex items-center justify-center px-4 h-full transition-all duration-200 active:scale-95 cursor-pointer"
          >
            {icon(active)}

            {/* Hover Tooltip */}
            <span className="absolute top-full mt-1.5 px-2.5 py-1 bg-[var(--color-text-primary)] text-[var(--color-background-surface)] text-[10px] font-bold rounded-md whitespace-nowrap shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-50">
              {tooltip}
            </span>

            {/* Red Underline Active Indicator matching Screenshot UI */}
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[var(--color-accent)] rounded-t-full transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.15)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function DrawerNavLinks({ auth, onNavigate }: { auth: BrowserAuth | null; onNavigate: () => void }) {
  const pathname = usePathname();
  const isAdmin = auth?.roles.includes("ADMIN");
  const isMod = auth?.roles.includes("MODERATOR");

  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-[var(--color-text-primary)]">
      {publicNavItems.map(({ href, label, icon }) => {
        const active = activePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
              active
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold border-l-4 border-[var(--color-accent)]"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text-primary)]/80"
            }`}
          >
            {icon(active)}
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        );
      })}

      {(isAdmin || isMod) && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)] px-3 mb-1">
            Control Ops
          </span>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname.startsWith("/admin")
                  ? "bg-[var(--color-accent)] text-[var(--color-background-body)] font-bold"
                  : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text-primary)]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin Dashboard
            </Link>
          )}
          {isMod && (
            <Link
              href="/moderator"
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname.startsWith("/moderator")
                  ? "bg-[var(--color-accent)] text-[var(--color-background-body)] font-bold"
                  : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text-primary)]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Moderator Hub
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
