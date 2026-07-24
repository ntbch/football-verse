"use client";

import React from "react";
import Link from "next/link";
import type { ForumCategoryResponse, ThreadResponse } from "../types";
import { avatarGrad, getAuthorInitials, getCategoryConfig, timeAgo } from "./forum-shared";

interface ThreadCardProps {
  thread: ThreadResponse;
  index?: number;
}

export function ThreadCard({ thread, index = 0 }: ThreadCardProps) {
  const isHot = thread.replyCount > 10 || thread.likes > 5;
  const isNew = (Date.now() - new Date(thread.createdAt).getTime()) < 3600000 * 3;

  return (
    <div
      className="group relative bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-accent)]/40 hover:shadow-md transition-all duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Left accent strip for pinned */}
      {thread.pinned && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-2xl" />
      )}

      <div className="p-5 pl-6 flex flex-col gap-3">
        {/* Top row: badges + meta */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Author avatar chip */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-7 h-7 rounded-full bg-[var(--color-background-body)] border border-[var(--color-border)] flex items-center justify-center font-bold text-xs text-[var(--color-text-primary)] shadow-sm shrink-0 group-hover:border-[var(--color-accent)]/50 transition-colors">
              {(thread.authorUsername?.[0] || "?").toUpperCase()}
            </span>
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">
              @{thread.authorUsername}
            </span>
          </div>

          <span className="text-[var(--color-text-secondary)]/40 text-[10px]">·</span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">{timeAgo(thread.createdAt)}</span>

          {/* Status badges */}
          <div className="flex items-center gap-1.5 ml-auto">
            {isNew && !thread.pinned && (
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/8 text-[var(--color-accent)] text-[8px] font-black uppercase tracking-wider border border-[var(--color-accent)]/20 flex items-center gap-1.5 shadow-sm">
                <span className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-pulse" />
                New
              </span>
            )}
            {isHot && (
              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[8px] font-black uppercase tracking-wider border border-orange-100 flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                Hot
              </span>
            )}
            {thread.pinned && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-wider border border-amber-100">
                Pinned
              </span>
            )}
            {thread.locked && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-wider border border-red-100 flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Locked
              </span>
            )}
          </div>
        </div>

        {/* Thread Title */}
        <Link href={`/forum/threads/${thread.slug}`}>
          <h4 className="m-0 font-serif-title font-black text-[1.05rem] leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-200">
            {thread.title}
          </h4>
        </Link>

        {/* Tags */}
        {thread.tags && thread.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-[var(--color-background-body)] border border-[var(--color-border)] text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: stats + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-4">
            {/* Reply count */}
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{thread.replyCount}</span>
              <span className="text-[9px] font-normal text-[var(--color-text-secondary)]/60">replies</span>
            </span>
            {/* Likes */}
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
              </svg>
              <span>{thread.likes}</span>
              <span className="text-[9px] font-normal text-[var(--color-text-secondary)]/60">likes</span>
            </span>
            {/* Views */}
            {thread.viewCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{thread.viewCount}</span>
              </span>
            )}
          </div>

          <Link
            href={`/forum/threads/${thread.slug}`}
            className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline underline-offset-4 transition-all active:scale-[0.96] group-hover:opacity-100 opacity-60"
          >
            Read →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CategoryBanner (replaces plain card header)
// ─────────────────────────────────────────────
