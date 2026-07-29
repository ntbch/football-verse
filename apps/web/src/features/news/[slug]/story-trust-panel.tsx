"use client";

import React, { useState } from "react";
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

function normalizePublisherName(name: string): string {
  if (!name) return "External Publication";
  let clean = name.trim();

  // Normalize Google News variants
  if (clean.toLowerCase().includes("google news") || clean.toLowerCase().includes("gnews")) {
    return "Google News";
  }

  // Strip trailing bracket tags like (GNews)
  clean = clean.replace(/\s*\([^)]*\)/g, "").trim();
  return clean || name;
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

  // Group timeline by normalized Publisher Name
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
    <section aria-labelledby="story-evidence-title" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 p-3.5 md:p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/60 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 id="story-evidence-title" className="m-0 font-sans text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)] shrink-0">
            Story Evidence
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

            return (
              <div key={group.publisherName} className="flex flex-col py-1 first:pt-0 last:pb-0">
                {/* Publisher Header Row - Always 1 compact line */}
                <div
                  onClick={() => toggleGroup(group.publisherName)}
                  className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)]/60"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-bold text-[12px] text-[var(--color-text-primary)] truncate">
                      {group.publisherName}
                    </span>

                    {group.isPrimary ? (
                      <span className="shrink-0 rounded bg-[var(--color-accent)]/20 px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wider text-[var(--color-accent)]">
                        Primary
                      </span>
                    ) : null}

                    <span className="shrink-0 rounded bg-slate-500/15 px-1.5 py-0.2 text-[8px] font-bold text-slate-400">
                      {group.items.length} {group.items.length === 1 ? "article" : "articles"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {group.latestPublishedAt ? formatDateTime(group.latestPublishedAt) : "RSS Feed"}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] transition-transform duration-200">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Sub-items ONLY shown when explicitly expanded by user */}
                {isExpanded && (
                  <ul className="m-0 flex list-none flex-col gap-1.5 pl-4 pr-1 pt-1.5 pb-1 text-[11px]">
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
    </section>
  );
}
