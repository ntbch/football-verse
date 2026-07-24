"use client";

import React from "react";
import Link from "next/link";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";

// ─────────────────────────────────────────────
interface BookmarkedArticlesListProps {
  articles: NewsArticleResponse[];
  isLoading: boolean;
}

export function BookmarkedArticlesList({ articles, isLoading }: BookmarkedArticlesListProps) {
  if (isLoading) return <LoadingBlock label="Loading bookmarked articles" />;

  if (articles.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
        <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
          No Bookmarks
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          You haven&apos;t bookmarked any articles yet.
        </p>
        <Link href="/news" className="text-xs font-bold text-[var(--color-accent)] hover:underline uppercase">
          Browse News →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {articles.map((art) => (
        <div
          key={art.id}
          className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
              <span className="text-[var(--color-accent)] uppercase">{art.category || "News"}</span>
              <span>·</span>
              <span>
                {new Date(art.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <Link href={`/news/${art.slug}`}>
              <h4 className="m-0 font-serif-title font-black text-base text-[var(--color-text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors leading-snug">
                {art.title}
              </h4>
            </Link>
            {art.summary && (
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed m-0">
                {art.summary}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] font-bold mt-1">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                <span>{art.likes}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>{art.bookmarks}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
