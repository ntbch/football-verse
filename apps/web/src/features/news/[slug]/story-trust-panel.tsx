"use client";

import React, { useState } from "react";
import type { NewsArticleResponse } from "../types";
import { formatDateTime } from "@/shared/lib/format";
import { trackEvent } from "@/shared/lib/analytics";
import { buildSourceTimeline } from "./story-timeline";

const verificationLabels = {
  OFFICIAL: "Official source",
  MULTIPLE_REPORTS: "Multiple reports",
  SINGLE_REPORT: "Single report",
  RUMOUR: "Unverified report",
  CONFLICTING: "Conflicting reports",
} as const;

function normalizePublisherName(name: string): string {
  if (!name) return "External Publication";
  let clean = name.trim();

  if (clean.toLowerCase().includes("google news") || clean.toLowerCase().includes("gnews")) {
    return "Google News";
  }
  clean = clean.replace(/\s*\([^)]*\)/g, "").trim();
  return clean || name;
}

function getProviderTag(url: string, name: string): { label: string; color: string } {
  const lUrl = (url || "").toLowerCase();
  const lName = (name || "").toLowerCase();
  if (lUrl.includes("reddit.com") || lName.includes("reddit")) {
    return { label: "REDDIT", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" };
  }
  if (lUrl.includes("x.com") || lUrl.includes("twitter.com") || lName.includes("twitter") || lName.includes("x.com")) {
    return { label: "X JOURNALIST", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
  }
  if (lUrl.includes("youtube.com") || lUrl.includes("youtu.be") || lName.includes("youtube")) {
    return { label: "YOUTUBE", color: "bg-red-500/10 text-red-400 border-red-500/30" };
  }
  return { label: "NEWS OUTLET", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
}

export function StoryTrustPanel({ article }: { article: NewsArticleResponse }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sources = article.sources?.length
    ? article.sources
    : article.sourceUrl
      ? [{ name: article.sourceName || "External publication", url: article.sourceUrl, primary: true }]
      : [];
  const status = article.verificationStatus ? verificationLabels[article.verificationStatus] : null;
  const timeline = buildSourceTimeline(sources, article.keyPoints);
  const sourceCount = article.sourceCount ?? sources.length;

  const groupedPublishers = React.useMemo(() => {
    const map = new Map<
      string,
      {
        publisherName: string;
        isPrimary: boolean;
        latestPublishedAt: string | null;
        items: typeof timeline;
      }
    >();

    for (const item of timeline) {
      const rawName = item.name || "External Publication";
      const normalized = normalizePublisherName(rawName);

      if (!map.has(normalized)) {
        map.set(normalized, {
          publisherName: normalized,
          isPrimary: item.primary,
          latestPublishedAt: item.publishedAt ?? null,
          items: [],
        });
      }
      const group = map.get(normalized)!;
      if (item.primary) group.isPrimary = true;
      group.items.push(item);
    }
    return Array.from(map.values());
  }, [timeline]);

  const toggleGroup = (name: string) => {
    if (!expanded[name]) trackEvent("story_evidence_viewed", { storyId: article.id, sourceCount });
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  if (!status && sources.length === 0 && article.sourceCount === undefined) return null;

  const statusClass =
    article.verificationStatus === "OFFICIAL" || article.verificationStatus === "MULTIPLE_REPORTS"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      : article.verificationStatus === "RUMOUR" || article.verificationStatus === "CONFLICTING"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
      : "bg-blue-500/10 text-blue-400 border-blue-500/30";

  return (
    <section aria-labelledby="story-evidence-title" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 p-3.5 md:p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/60 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 id="story-evidence-title" className="m-0 font-sans text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)] shrink-0">
            Story Verification & Evidence
          </h2>
          <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] truncate">
            • {sourceCount} article{sourceCount === 1 ? "" : "s"} across {groupedPublishers.length} publisher{groupedPublishers.length === 1 ? "" : "s"}
            {article.lastMaterialChangeAt ? ` · ${formatDateTime(article.lastMaterialChangeAt)}` : ""}
          </span>
        </div>
        {status ? (
          <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${statusClass}`}>
            ✓ {status}
          </span>
        ) : null}
      </div>

      {groupedPublishers.length ? (
        <div className="flex flex-col divide-y divide-[var(--color-border)]/30 text-xs">
          {groupedPublishers.map((group) => {
            const isExpanded = !!expanded[group.publisherName];
            const sampleUrl = group.items[0]?.url || "";
            const providerTag = getProviderTag(sampleUrl, group.publisherName);

            return (
              <div key={group.publisherName} className="flex flex-col py-1.5 first:pt-0 last:pb-0">
                {/* Publisher Header Row */}
                <button
                  aria-controls={`story-evidence-${article.id}-${group.publisherName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                  aria-expanded={isExpanded}
                  type="button"
                  onClick={() => toggleGroup(group.publisherName)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <span className="font-black text-[12px] text-[var(--color-text-primary)] truncate">
                      {group.publisherName}
                    </span>

                    <span className={`shrink-0 rounded border px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wider ${providerTag.color}`}>
                      {providerTag.label}
                    </span>

                    {group.isPrimary ? (
                      <span className="shrink-0 rounded bg-[var(--color-accent)]/20 px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wider text-[var(--color-accent)]">
                        Primary Source
                      </span>
                    ) : null}

                    <span className="shrink-0 rounded bg-slate-500/15 px-1.5 py-0.2 text-[8px] font-bold text-slate-400">
                      {group.items.length} {group.items.length === 1 ? "article" : "articles"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">
                      {group.latestPublishedAt ? formatDateTime(group.latestPublishedAt) : "RSS Feed"}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] transition-transform duration-200">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Sub-items ONLY shown when explicitly expanded */}
                {isExpanded && (
                  <ul className="m-0 flex list-none flex-col gap-1.5 pl-4 pr-1 pt-1.5 pb-1 text-[11px]" id={`story-evidence-${article.id}-${group.publisherName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
                    {group.items.map((item, idx) => (
                      <li key={`${item.url}-${idx}`} className="flex flex-col gap-0.5 border-l-2 border-[var(--color-accent)]/40 pl-2.5 py-0.5">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] hover:underline truncate"
                        >
                          {item.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {timeline.length ? (
        <div className="border-t border-[var(--color-border)]/60 pt-3">
          <h3 className="m-0 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-primary)]">Evidence timeline</h3>
          <ol className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {timeline.map((item, index) => (
              <li className="grid grid-cols-[5.5rem_1fr] gap-2 text-[11px]" key={`${item.url}-${index}`}>
                <time className="font-mono text-[var(--color-text-secondary)]" dateTime={item.publishedAt ?? undefined}>{item.publishedAt ? formatDateTime(item.publishedAt) : "Time unavailable"}</time>
                <span className="text-[var(--color-text-primary)]"><strong>{normalizePublisherName(item.name)}</strong>{item.claims.length ? ` · ${item.claims.map((claim) => `${claim.relation.toLowerCase()}: ${claim.keyPoint}`).join("; ")}` : " · Source update"}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
