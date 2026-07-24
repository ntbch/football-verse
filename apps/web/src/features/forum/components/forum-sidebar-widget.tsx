"use client";

import React from "react";
import Link from "next/link";
import type { ForumCategoryResponse, ThreadResponse } from "../types";
import { avatarGrad, getAuthorInitials, getCategoryConfig, timeAgo } from "./forum-shared";

interface ForumSidebarWidgetProps {
  categories: ForumCategoryResponse[];
  activeCategory: ForumCategoryResponse | undefined;
  trendingThreads: ThreadResponse[];
}

export function ForumSidebarWidget({ categories, activeCategory, trendingThreads }: ForumSidebarWidgetProps) {
  const totalThreads = categories.reduce((sum, c) => sum + (c.threadCount ?? 0), 0);
  return (
    <div className="hidden lg:flex flex-col gap-4">
      {/* Community pulse */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
          <h3 className="font-serif-title font-black text-xs m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
            Community Pulse
          </h3>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {[
            { label: "Categories", value: categories.length, accent: false },
            { label: "Threads", value: totalThreads, accent: true },
            { label: "Active Now", value: "—", accent: false },
            ...(activeCategory
              ? [{ label: activeCategory.name, value: activeCategory.threadCount, accent: false }]
              : [{ label: "Pick a topic", value: "↑", accent: false }]),
          ].map((stat, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
              <span className={`font-black text-xl tabular-nums ${stat.accent ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                {stat.value}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending threads */}
      {trendingThreads.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            <h3 className="font-serif-title font-black text-xs m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
              Hot Threads
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {trendingThreads.slice(0, 4).map((t, i) => (
              <Link
                key={t.id}
                href={`/forum/threads/${t.slug}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors"
              >
                <span className="font-serif-title font-black text-2xl leading-none text-gray-200 tabular-nums w-6 shrink-0">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                    {t.title}
                  </span>
                  <span className="text-[9px] text-[var(--color-text-secondary)] font-semibold">
                    {t.replyCount} replies · {t.likes} likes
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ThreadCard
// ─────────────────────────────────────────────
