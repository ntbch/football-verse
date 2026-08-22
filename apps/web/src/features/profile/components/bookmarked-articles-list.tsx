"use client";

import React from "react";
import Link from "next/link";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { formatDate } from "@/shared/lib/format";
import { ThumbsDownIcon, BookmarkIcon } from "@/shared/components/icons";

// ─────────────────────────────────────────────
interface BookmarkedArticlesListProps {
  articles: NewsArticleResponse[];
  isLoading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function BookmarkedArticlesList({ articles, isLoading, error, onRetry }: BookmarkedArticlesListProps) {
  if (isLoading) return <LoadingBlock label="Loading bookmarked articles" />;
  if (error) return <ErrorBlock message="Could not load bookmarked articles." onRetry={onRetry} />;

  if (articles.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
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
          className="p-5 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
              <span className="text-[var(--color-accent)] uppercase">{art.category || "News"}</span>
              <span>·</span>
              <span>
                {formatDate(art.publishedAt)}
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
                <ThumbsDownIcon className="w-3.5 h-3.5" />
                <span>{art.likes}</span>
              </span>
              <span className="flex items-center gap-1">
                <BookmarkIcon className="w-3.5 h-3.5" />
                <span>{art.bookmarks}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}