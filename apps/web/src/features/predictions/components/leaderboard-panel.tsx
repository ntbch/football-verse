"use client";

import type { LeaderboardEntry } from "../types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";

type LeaderboardPanelProps = {
  error?: unknown;
  isLoading?: boolean;
  entries?: LeaderboardEntry[];
  onRetry?: () => void;
};

export const LeaderboardPanel = ({ error, isLoading, entries, onRetry }: LeaderboardPanelProps) => (
  <div className="mt-2">
    {isLoading ? (
      <div className="py-4 text-center text-xs text-[var(--color-text-secondary)] font-medium animate-pulse">
        Loading leaderboard…
      </div>
    ) : null}
    {error ? (
      <div className="flex items-center justify-between py-3 px-1 text-xs text-[var(--color-text-secondary)] font-medium">
        <span>Could not load leaderboard.</span>
        {onRetry ? (
          <button
            className="font-bold text-[var(--color-accent)] hover:underline cursor-pointer"
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        ) : null}
      </div>
    ) : null}
    {!isLoading && !error && entries && entries.length === 0 ? (
      <div className="py-4 text-center">
        <p className="m-0 text-xs font-medium text-[var(--color-text-secondary)] italic">
          No participants yet.
        </p>
      </div>
    ) : null}
    {!isLoading && !error && entries && entries.length > 0 ? (
      <div className="grid gap-2">
        {entries.map((entry) => (
          <div
            className="grid grid-cols-[24px_1fr_auto] items-center gap-2 border-t border-[var(--color-border)]/60 pt-2.5 text-xs first:border-0 first:pt-0"
            key={entry.userId}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] shrink-0 ${
                entry.rank === 1
                  ? "rank-gold"
                  : entry.rank === 2
                  ? "rank-silver"
                  : entry.rank === 3
                  ? "rank-bronze"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              {entry.rank}
            </span>
            <span className="truncate font-bold text-[var(--color-text-primary)]">{entry.displayName}</span>
            <span className="font-black text-[var(--color-text-primary)] tabular-nums">{entry.points}</span>
          </div>
        ))}
      </div>
    ) : null}
  </div>
);
