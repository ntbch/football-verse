"use client";

import React from "react";
import Link from "next/link";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";

// ─────────────────────────────────────────────
interface FollowedThreadsListProps {
  threads: ThreadResponse[];
  isLoading: boolean;
}

export function FollowedThreadsList({ threads, isLoading }: FollowedThreadsListProps) {
  if (isLoading) return <LoadingBlock label="Loading followed discussions" />;

  if (threads.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
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
          className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{thread.replyCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
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
