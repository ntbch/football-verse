"use client";

import React from "react";
import Link from "next/link";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";

// ─────────────────────────────────────────────
interface ActivityStatsCardProps {
  followedCount: number;
  bookmarkCount: number;
  roles: string[];
}

export function ActivityStatsCard({ followedCount, bookmarkCount, roles }: ActivityStatsCardProps) {
  const accountType = roles.includes("ADMIN" as never)
    ? "Admin"
    : roles.includes("MODERATOR" as never)
    ? "Moderator"
    : "Member";

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
        <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          <span>Activity</span>
        </h3>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">Followed Threads</span>
          <span className="font-black text-[var(--color-accent)] tabular-nums">{followedCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">Bookmarked Articles</span>
          <span className="font-black tabular-nums">{bookmarkCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">Account Type</span>
          <span className="font-black tabular-nums">{accountType}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FollowedThreadsList
