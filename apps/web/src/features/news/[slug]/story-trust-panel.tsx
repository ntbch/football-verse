import type { NewsArticleResponse } from "../types";
import { formatDateTime } from "@/shared/lib/format";
import { buildSourceTimeline } from "./story-timeline";

const verificationLabels = {
  OFFICIAL: "Official source",
  MULTIPLE_REPORTS: "Multiple reports",
  SINGLE_REPORT: "Single report",
  RUMOUR: "Unverified report",
  CONFLICTING: "Conflicting reports",
} as const;

export function StoryTrustPanel({ article }: { article: NewsArticleResponse }) {
  const sources = article.sources?.length
    ? article.sources
    : article.sourceUrl
      ? [{ name: article.sourceName || "External publication", url: article.sourceUrl, primary: true }]
      : [];
  const status = article.verificationStatus ? verificationLabels[article.verificationStatus] : null;
  const timeline = buildSourceTimeline(sources, article.keyPoints);
  const sourceCount = article.sourceCount ?? sources.length;

  if (!status && sources.length === 0 && article.sourceCount === undefined) return null;

  return (
    <section aria-labelledby="story-evidence-title" className="editorial-panel flex flex-col gap-4 p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-3">
        <div>
          <h2 id="story-evidence-title" className="m-0 font-serif-title text-lg font-black text-[var(--color-text-primary)]">Story evidence</h2>
          <p className="m-0 mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{sourceCount} source{sourceCount === 1 ? "" : "s"}</p>
        </div>
        {status ? <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">{status}</span> : null}
      </div>
      {timeline.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">Source timeline</h3>
        <ol className="m-0 flex list-none flex-col divide-y divide-[var(--color-border)] p-0">
          {timeline.map((source, index) => (
            <li key={`${source.url}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline">{source.name}</a>
                <p className="m-0 mt-0.5 text-xs text-[var(--color-text-secondary)]">{source.publishedAt ? formatDateTime(source.publishedAt) : "Publication time unavailable"}</p>
                {source.claims.map((claim) => <p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]" key={`${claim.relation}:${claim.keyPoint}`}><span className="font-bold text-[var(--color-text-primary)]">{claim.relation === "CONTRADICTION" ? "Contradicts" : claim.relation === "SUPPORT" ? "Supports" : "Context for"}:</span> {claim.keyPoint}</p>)}
              </div>
              {source.primary ? <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)]">Primary</span> : null}
            </li>
          ))}
        </ol>
        </div>
      ) : null}
    </section>
  );
}
