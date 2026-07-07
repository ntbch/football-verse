"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";

type ModStats = {
  pendingReports: number;
  resolvedReports: number;
  hiddenThreads: number;
  hiddenPosts: number;
};

export default function ModeratorDashboardPage() {
  // Fetch mod dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: qk.moderator.stats(),
    queryFn: () => data<ModStats>(http.get("/moderator/dashboard/stats")),
  });

  if (isLoading) {
    return <LoadingBlock label="Fetching moderation statistics" />;
  }

  return (
    <div className="flex flex-col gap-6 w-full text-white">
      <h3 className="font-serif-title text-xl md:text-2xl font-black tracking-tight text-white m-0">
        Moderator Statistics Overview
      </h3>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-center">
          <div className="card p-5">
            <span className="text-2xl font-black text-[var(--color-accent)]">{stats.pendingReports}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              PENDING REPORTS
            </div>
          </div>
          <div className="card p-5">
            <span className="text-2xl font-black text-white">{stats.resolvedReports}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              RESOLVED REPORTS
            </div>
          </div>
          <div className="card p-5">
            <span className="text-2xl font-black text-white">{stats.hiddenThreads}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              HIDDEN THREADS
            </div>
          </div>
          <div className="card p-5">
            <span className="text-2xl font-black text-white">{stats.hiddenPosts}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              HIDDEN POSTS
            </div>
          </div>
        </div>
      )}

      <div className="card p-5 w-full text-left">
        <div className="flex flex-col gap-3">
          <h4 className="font-serif-title m-0 text-sm font-bold uppercase text-[var(--color-accent)]">
            Moderation Guidelines
          </h4>
          <p className="text-xs leading-relaxed font-medium text-[var(--color-text-secondary)]">
            1. Review open report flags. Read post content within thread contexts before resolving.
            <br />
            2. Mute or hide toxic comments immediately to protect the Fan Community Arena.
            <br />
            3. Lock discussion threads that decay into flame wars or ads.
            <br />
            4. Keep pin limits low: pin only official match predictions or important announcements.
          </p>
        </div>
      </div>
    </div>
  );
}
