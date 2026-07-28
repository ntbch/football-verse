"use client";

import type { MatchCentreFixture } from "../types";

type MatchAnalyticsProps = {
  match: MatchCentreFixture;
};

const formTone: Record<string, string> = {
  W: "bg-[var(--color-success)] text-[var(--color-text-inverse)]",
  D: "bg-[var(--color-neutral)] text-[var(--color-text-inverse)]",
  L: "bg-[var(--color-danger)] text-[var(--color-text-inverse)]",
};

function sourceDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export const MatchAnalytics = ({ match }: MatchAnalyticsProps) => {
  const ai = match.aiPrediction;
  if (!ai) return null;

  const updatedAt = sourceDate(ai.sourceUpdatedAt);
  const probabilities = [
    { key: "home", label: match.homeTeam, value: ai.homePct, tone: "bg-[var(--color-accent)]" },
    { key: "draw", label: "Draw", value: ai.drawPct, tone: "bg-[var(--color-neutral)]" },
    { key: "away", label: match.awayTeam, value: ai.awayPct, tone: "bg-[var(--color-info)]" },
  ];

  return <div className="grid gap-4">
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="editorial-kicker">Model comparison</p><h3 className="m-0 mt-1 text-base font-black text-[var(--color-text-primary)]">Outcome probabilities</h3></div><span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-text-secondary)]">{ai.sampleSize} completed matches per team</span></div>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[var(--color-surface-muted)]" role="img" aria-label={`${match.homeTeam} ${ai.homePct} percent, draw ${ai.drawPct} percent, ${match.awayTeam} ${ai.awayPct} percent`}>
        {probabilities.map((item) => <span className={item.tone} key={item.key} style={{ width: `${item.value}%` }} />)}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">{probabilities.map((item) => <div key={item.key}><dt className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">{item.label}</dt><dd className="m-0 mt-1 text-lg font-black tabular-nums text-[var(--color-text-primary)]">{item.value}%</dd></div>)}</dl>
    </section>

    <section className="grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-5">
      <div><p className="editorial-kicker">Recent form</p><div className="mt-3 grid grid-cols-2 gap-4"><div><p className="m-0 truncate text-xs font-bold text-[var(--color-text-primary)]">{match.homeTeam}</p><div className="mt-2 flex gap-1.5">{ai.homeForm.map((result, index) => <span aria-label={result === "W" ? "Win" : result === "D" ? "Draw" : "Loss"} className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${formTone[result] ?? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"}`} key={`${result}-${index}`}>{result}</span>)}</div></div><div><p className="m-0 truncate text-xs font-bold text-[var(--color-text-primary)]">{match.awayTeam}</p><div className="mt-2 flex gap-1.5">{ai.awayForm.map((result, index) => <span aria-label={result === "W" ? "Win" : result === "D" ? "Draw" : "Loss"} className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${formTone[result] ?? "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"}`} key={`${result}-${index}`}>{result}</span>)}</div></div></div></div>
      <div className="border-t border-[var(--color-border)] pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><p className="editorial-kicker">Observed signals</p><dl className="mt-3 grid gap-2 text-sm"><div className="flex items-center justify-between gap-3"><dt className="text-[var(--color-text-secondary)]">Model lean</dt><dd className="m-0 font-black text-[var(--color-accent)]">{ai.pickLabel || ai.pick}</dd></div><div className="flex items-center justify-between gap-3"><dt className="text-[var(--color-text-secondary)]">Average goals</dt><dd className="m-0 font-black tabular-nums text-[var(--color-text-primary)]">{ai.averageGoals.toFixed(1)}</dd></div><div className="flex items-center justify-between gap-3"><dt className="text-[var(--color-text-secondary)]">Over / under 2.5</dt><dd className="m-0 font-black capitalize text-[var(--color-text-primary)]">{ai.overUnder25}</dd></div><div className="flex items-center justify-between gap-3"><dt className="text-[var(--color-text-secondary)]">Both teams score</dt><dd className="m-0 font-black capitalize text-[var(--color-text-primary)]">{ai.bothTeamsToScore}</dd></div></dl></div>
    </section>
    <p className="m-0 text-xs leading-5 text-[var(--color-text-secondary)]">Derived only from completed provider-sourced matches.{updatedAt ? ` Latest source update: ${updatedAt}.` : ""}</p>
  </div>;
};
