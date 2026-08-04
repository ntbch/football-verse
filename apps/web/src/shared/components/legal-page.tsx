import type { ReactNode } from "react";
import { SportsShell } from "./page-shell";

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <SportsShell>
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-[var(--color-border)] pb-7">
          <p className="editorial-kicker">{eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl font-black tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Last updated {updated}</p>
        </header>
        <div className="prose prose-sm mt-8 max-w-none text-[var(--color-text-primary)] prose-headings:font-serif prose-headings:text-[var(--color-text-primary)] prose-p:text-[var(--color-text-secondary)] prose-li:text-[var(--color-text-secondary)]">
          {children}
        </div>
      </article>
    </SportsShell>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
}
