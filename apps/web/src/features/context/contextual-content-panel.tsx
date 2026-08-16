"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { trackEvent } from "@/shared/lib/analytics";
import { contextualContentState, type ContextualContentStatus } from "./contextual-content";
import type { FixtureContextResponse } from "./types";

type ContextualContentPanelProps = {
  status: ContextualContentStatus;
  content?: FixtureContextResponse;
  onRetry?: () => void;
};

export function ContextualContentPanel({ status, content, onRetry }: ContextualContentPanelProps) {
  const state = contextualContentState({ status, news: content?.news ?? [], threads: content?.threads ?? [] });
  const contextId = content?.context.id;
  useEffect(() => {
    if (contextId) trackEvent("context_opened", { contextId });
  }, [contextId]);

  if (state === "loading") return <section aria-label="Match coverage"><LoadingBlock label="Loading match coverage" /></section>;
  if (state === "unavailable") return <section aria-label="Match coverage"><ErrorBlock message="Match coverage is unavailable." onRetry={onRetry} /></section>;
  if (state === "empty") return <section aria-label="Match coverage" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4 text-sm text-[var(--color-text-secondary)]">No published coverage or public discussion has been linked to this match yet.</section>;

  return (
    <section aria-label="Related match coverage" className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4">
        <h2 className="m-0 mb-3 font-serif-title text-lg font-black text-[var(--color-text-primary)]">Match coverage</h2>
        {content?.news.length ? <div className="grid gap-3">{content.news.map((article) => <Link className="rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-accent)]" href={`/news/${article.slug}`} key={article.slug}>
          <h3 className="m-0 text-sm font-black text-[var(--color-text-primary)]">{article.title}</h3>
          {article.summary && <p className="m-0 mt-1 text-sm text-[var(--color-text-secondary)]">{article.summary}</p>}
        </Link>)}</div> : <p className="m-0 text-sm text-[var(--color-text-secondary)]">No published coverage yet.</p>}
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="m-0 font-serif-title text-lg font-black text-[var(--color-text-primary)]">Community discussion</h2>
          <Link className="min-h-11 inline-flex items-center text-xs font-bold text-[var(--color-accent)] hover:underline" href={`/forum?contextId=${content!.context.id}&create=1`} onClick={() => trackEvent("context_thread_started", { contextId: content!.context.id })}>Start discussion</Link>
        </div>
        {content?.threads.length ? <div className="grid gap-3">{content.threads.map((thread) => <Link className="rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-accent)]" href={`/forum/threads/${thread.slug}`} key={thread.slug}>
          <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">{thread.category}</p>
          <h3 className="m-0 mt-1 text-sm font-black text-[var(--color-text-primary)]">{thread.title}</h3>
        </Link>)}</div> : <p className="m-0 text-sm text-[var(--color-text-secondary)]">No public discussion yet.</p>}
      </div>
    </section>
  );
}
