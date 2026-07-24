"use client";

import type { StatsResponse } from "../types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { FlameIcon, TrophyIcon } from "./icons";

type StatsBadgesProps = {
  stats?: StatsResponse;
  isLoading?: boolean;
};

export const StatsBadges = ({ stats, isLoading }: StatsBadgesProps) => {
  if (isLoading) return <LoadingBlock label="Loading stats" />;
  if (!stats?.totalPicks) return null;

  const badgeLabels: Record<string, string> = {
    first_pick: "First pick",
    streak_5: "5 streak",
    streak_10: "10 streak",
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--color-text-primary)]">
      <span className="border border-[var(--color-border)] px-2 py-1 rounded-lg bg-[var(--color-background-surface)] font-mono">
        {stats.totalPoints} PTS
      </span>
      <span className="border border-[var(--color-border)] px-2 py-1 rounded-lg bg-[var(--color-background-surface)] font-mono">
        {stats.correctPicks}/{stats.totalPicks}
      </span>
      {stats.currentStreak > 0 ? (
        <span className="border border-[var(--color-accent)] px-2 py-1 rounded-lg bg-orange-50/50 flex items-center gap-1">
          <FlameIcon />
          <span className="font-mono">{stats.currentStreak}</span>
        </span>
      ) : null}
      {stats.badges.map((b) => (
        <span
          className="border border-green-300 bg-green-50 px-2 py-1 rounded-lg text-green-700 font-bold flex items-center gap-1"
          key={b.code}
        >
          <TrophyIcon />
          <span>{badgeLabels[b.code] ?? b.code.toUpperCase()}</span>
        </span>
      ))}
    </div>
  );
};
