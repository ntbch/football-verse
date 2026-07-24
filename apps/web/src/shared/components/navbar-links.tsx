"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BrowserAuth } from "@/shared/lib/auth-session";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/forum", label: "Forum" },
  { href: "/predictions", label: "Predictions" },
  { href: "/career", label: "Career" },
];

function activePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function roleLinks(auth: BrowserAuth | null) {
  return [
    auth?.roles.includes("ADMIN") ? { href: "/admin", label: "Admin" } : null,
    auth?.roles.includes("MODERATOR") ? { href: "/moderator", label: "Moderator" } : null,
    auth ? { href: "/profile", label: "Profile", mobileOnly: true } : null,
  ].filter((link): link is { href: string; label: string; mobileOnly?: boolean } => Boolean(link));
}

export function DesktopNavLinks({ auth }: { auth: BrowserAuth | null }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
      {publicLinks.map(({ href, label }) => {
        const active = activePath(pathname, href);
        if (href === "/career") {
          return <Link key={href} href={href} className={`relative px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 border ${active ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] shadow-md shadow-[var(--color-accent)]/20" : "border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-black hover:shadow-md hover:shadow-[var(--color-accent)]/20"}`}>{label}</Link>;
        }
        return <DesktopTextLink key={href} href={href} label={label} active={active} />;
      })}
      {roleLinks(auth).filter((link) => !link.mobileOnly).map((link) => (
        <DesktopTextLink key={link.href} href={link.href} label={link.label} active={activePath(pathname, link.href)} />
      ))}
    </nav>
  );
}

function DesktopTextLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`relative py-1 transition-all duration-200 hover:text-[var(--color-accent)] active:scale-[0.98] ${active ? "text-[var(--color-accent)] font-extrabold" : "text-[var(--color-text-primary)]/70"}`}>
      {label}
      {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-full animate-fade-in" />}
    </Link>
  );
}

export function MobileNavLinks({ auth, onNavigate }: { auth: BrowserAuth | null; onNavigate: () => void }) {
  const pathname = usePathname();
  const links = [...publicLinks, ...roleLinks(auth)];

  return (
    <div className="flex flex-col gap-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
      {links.map(({ href, label }) => {
        const active = activePath(pathname, href);
        const career = href === "/career";
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={career
              ? `transition-all duration-300 py-2.5 my-1.5 px-3.5 rounded-xl border flex items-center justify-between font-black active:scale-[0.98] ${active ? "bg-[var(--color-accent)] text-black border-[var(--color-accent)] shadow-md shadow-[var(--color-accent)]/20" : "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5 hover:bg-[var(--color-accent)] hover:text-black"}`
              : `transition-all duration-200 py-2.5 border-b border-black/5 flex items-center justify-between active:scale-[0.98] ${active ? "text-[var(--color-accent)] font-extrabold pl-2 border-l-2 border-l-[var(--color-accent)] bg-[var(--color-background-body)]/40 rounded-r-lg" : "text-[var(--color-text-primary)]/80 hover:text-[var(--color-accent)]"}`}
          >
            <span>{label}</span>
            {active && <svg className={`w-3.5 h-3.5 mr-2 ${career ? "text-black" : "text-[var(--color-accent)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
          </Link>
        );
      })}
    </div>
  );
}
