"use client";

import React from "react";
import Link from "next/link";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { CommentIcon, ThumbsDownIcon } from "@/shared/components/icons";

// ─────────────────────────────────────────────
interface FollowedThreadsListProps {
  threads: ThreadResponse[];
  isLoading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function FollowedThreadsList({ threads, isLoading, error, onRetry }: FollowedThreadsListProps) {
  if (isLoading) return <LoadingBlock label="Loading followed discussions" />;
  if (error) return <ErrorBlock message="Could not load followed discussions." onRetry={onRetry} />;

  if (threads.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
        <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
          No Followed Threads
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          You haven&apos;t followed any discussion threads yet.
        </p>
        <Link href="/forum" className="text-xs font-bold text-[var(--color-accent)] hover:underline uppercase">
          Browse Forum →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {threads.map((thread) => (
        <div
          key={thread.id}
          className="p-5 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
        >
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
                <span className="text-[var(--color-accent)] uppercase">{thread.categoryName}</span>
                <span>·</span>
                <span>by @{thread.authorUsername}</span>
              </div>
              <Link href={`/forum/threads/${thread.slug}`}>
                <h4 className="m-0 font-serif-title font-black text-base text-[var(--color-text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors leading-snug">
                  {thread.title}
                </h4>
              </Link>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] font-bold shrink-0">
              <span className="flex items-center gap-1">
                <CommentIcon className="w-3.5 h-3.5" />
                <span>{thread.replyCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDownIcon className="w-3.5 h-3.5" />
                <span>{thread.likes}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// BookmarkedArticlesList