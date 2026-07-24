"use client";

import type { LeaderboardEntry } from "../types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";

type LeaderboardPanelProps = {
  error?: unknown;
  isLoading?: boolean;
  entries?: LeaderboardEntry[];
};

export const LeaderboardPanel = ({ error, isLoading, entries }: LeaderboardPanelProps) => (
  <aside className="card p-5 mt-4">
    <h2 className="font-serif-title font-black text-xl m-0 uppercase tracking-tight">Leaderboard</h2>
    {isLoading ? <LoadingBlock label="Loading leaderboard" /> : null}
    {error ? <ErrorBlock message="Could not load leaderboard." /> : null}
    {entries && entries.length === 0 ? (
      <p className="mt-4 text-xs text-[var(--color-text-secondary)] font-serif italic">No participants yet.</p>
    ) : null}
    {entries && entries.length > 0 ? (
      <div className="mt-4 grid gap-2">
        {entries.map((entry) => (
          <div
            className="grid grid-cols-[24px_1fr_auto] items-center gap-2 border-t border-[var(--color-border)] pt-2.5 text-xs first:border-0 first:pt-0"
            key={entry.userId}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] shrink-0 ${
              entry.rank === 1
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : entry.rank === 2
                ? "bg-slate-100 text-slate-700 border border-slate-200"
                : entry.rank === 3
                ? "bg-orange-100 text-orange-800 border border-orange-200"
                : "text-[var(--color-text-secondary)]"
            }`}>
              {entry.rank}
            </span>
            <span className="truncate font-bold text-[var(--color-text-primary)]">{entry.displayName}</span>
            <span className="font-black text-[var(--color-text-primary)] tabular-nums">{entry.points}</span>
          </div>
        ))}
      </div>
    ) : null}
  </aside>
);
