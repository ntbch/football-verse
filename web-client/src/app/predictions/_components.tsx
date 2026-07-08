"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubmitPrediction } from "./_api";
import type { Fixture, UserPrediction, LeaderboardEntry, StatsResponse, MatchCentreFixture } from "./_types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";

/* ── INFRASTRUCTURE SVG ICONS (ANTI-EMOJI POLICY) ── */
export const HomeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

export const AwayIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

export const DrawIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16M4 15h16" />
  </svg>
);

export const TrophyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
  </svg>
);

export const FlameIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.83 10.42C15.42 9.4 15.12 7.8 15.35 6.13C14.11 7.23 13.23 8.87 13.34 10.74C13.35 10.92 13.23 11.09 13.06 11.14C12.89 11.19 12.7 11.11 12.63 10.94C12.08 9.57 12 8.13 12.38 6.69C10.7 7.7 9.87 9.45 9.94 11.53C9.95 11.72 9.82 11.89 9.64 11.93C9.46 11.97 9.28 11.87 9.22 11.7C8.68 10.15 8.78 8.65 9.45 7.26C7.54 8.54 6.7 10.79 7.4 13.09C8.09 15.39 10.14 17 12.58 17C15.03 17 17.07 15.39 17.77 13.09C18.15 11.83 18.06 11.52 17.66 11.2M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2Z" />
  </svg>
);

export const CheckIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export const CrossIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

type MatchAnalyticsProps = {
  match: MatchCentreFixture;
};

export const MatchAnalytics = ({ match }: MatchAnalyticsProps) => {
  const ai = match.aiPrediction;
  if (!ai) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4 flex flex-col gap-4 shadow-sm mb-4">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
        Match Analytics & Insights
      </span>

      {/* Win / Draw / Loss Probability Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-text-primary)]">
          <span className="truncate max-w-[120px]">{match.homeTeam}: {ai.homePct}%</span>
          <span>Draw: {ai.drawPct}%</span>
          <span className="truncate max-w-[120px] text-right">{match.awayTeam}: {ai.awayPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex w-full bg-gray-200/50">
          <div className="bg-[var(--color-accent)] h-full" style={{ width: `${ai.homePct}%` }} />
          <div className="bg-gray-300 h-full" style={{ width: `${ai.drawPct}%` }} />
          <div className="bg-gray-400 h-full" style={{ width: `${ai.awayPct}%` }} />
        </div>
      </div>

      {/* Form & H2H */}
      <div className="grid grid-cols-2 gap-6 text-xs border-t border-[var(--color-border)] pt-3">
        {/* Left: Form */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-bold uppercase text-[var(--color-text-secondary)]">Form (Last 5)</span>
          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold text-[var(--color-text-secondary)]">Home:</span>
              <div className="flex gap-0.5">
                {ai.homeForm?.map((f, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold text-white ${
                      f === "W" ? "bg-green-500" : f === "D" ? "bg-gray-400" : "bg-red-500"
                    }`}
                  >
                    {f}
                  </span>
                )) || <span className="text-gray-400">—</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold text-[var(--color-text-secondary)]">Away:</span>
              <div className="flex gap-0.5">
                {ai.awayForm?.map((f, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold text-white ${
                      f === "W" ? "bg-green-500" : f === "D" ? "bg-gray-400" : "bg-red-500"
                    }`}
                  >
                    {f}
                  </span>
                )) || <span className="text-gray-400">—</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Prediction */}
        <div className="flex flex-col gap-2 justify-center border-l border-[var(--color-border)] pl-4">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-[var(--color-text-secondary)]">AI Suggestion:</span>
            <span className="font-black text-[var(--color-accent)]">{ai.pickLabel || ai.pick}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-[var(--color-text-secondary)]">Confidence:</span>
            <span className="font-black text-[var(--color-text-primary)]">{ai.confidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

type ScorePickerProps = {
  value: number;
  onChange: (v: number) => void;
};

export const ScorePicker = ({ value, onChange }: ScorePickerProps) => {
  return (
    <div className="flex items-center bg-gray-50 border border-[var(--color-border)] rounded-xl p-0.5 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200/60 hover:text-[var(--color-text-primary)] active:scale-90 transition-all text-xs font-bold text-[var(--color-text-secondary)] border-0 bg-transparent cursor-pointer"
      >
        −
      </button>
      <span className="w-8 text-center font-mono text-base font-black text-[var(--color-text-primary)] tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(15, value + 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200/60 hover:text-[var(--color-text-primary)] active:scale-90 transition-all text-xs font-bold text-[var(--color-text-secondary)] border-0 bg-transparent cursor-pointer"
      >
        +
      </button>
    </div>
  );
};

type PickFormProps = {
  match: Fixture | MatchCentreFixture;
  auth: unknown;
  onSuccess?: () => void;
};

export const PickForm = ({ match, auth, onSuccess }: PickFormProps) => {
  const existingPred = match.userPrediction;

  const [homeScore, setHomeScore] = useState<number>(existingPred?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState<number>(existingPred?.awayScore ?? 0);
  const [pickOu25, setPickOu25] = useState<string | null>(existingPred?.pickOu25 ?? "over");
  const [pickBtts, setPickBtts] = useState<string | null>(existingPred?.pickBtts ?? "yes");

  const { mutate, isPending, error } = useSubmitPrediction();

  const kickoff = new Date(match.kickoff);
  const started = kickoff <= new Date();

  if (!auth) {
    return (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3">
        <Link className="btn btn-secondary" href="/login">
          Login to predict
        </Link>
      </div>
    );
  }

  if (started) {
    return existingPred ? (
      <UserPickDisplay match={match} prediction={existingPred} />
    ) : (
      <div className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm font-bold text-[var(--color-text-secondary)]">
        Match has started — predictions closed
      </div>
    );
  }

  // Calculate outcome based on score pickers
  let calculatedPick: "home" | "draw" | "away" = "draw";
  if (homeScore > awayScore) calculatedPick = "home";
  else if (awayScore > homeScore) calculatedPick = "away";

  const outcomeLabel =
    calculatedPick === "home"
      ? `${match.homeTeam} Win`
      : calculatedPick === "away"
        ? `${match.awayTeam} Win`
        : "Draw";

  const submit = () => {
    mutate(
      {
        matchId: match.id,
        pick: calculatedPick,
        homeScore,
        awayScore,
        pickOu25,
        pickBtts,
      },
      {
        onSuccess: () => {
          if (onSuccess) onSuccess();
        },
      }
    );
  };

  return (
    <div className="mt-3 grid gap-3 border-t border-[var(--color-border)] pt-3">
      <p className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] tracking-widest m-0">
        YOUR PICK
      </p>

      {/* COMPACT HORIZONTAL MATCH SCORE PICKER */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-3 shadow-sm w-full">
        {/* Home Team */}
        <div className="flex items-center gap-2.5 justify-end min-w-0">
          <span className="text-xs font-black uppercase text-[var(--color-text-primary)] truncate text-right">
            {match.homeTeam}
          </span>
          {"homeLogo" in match && match.homeLogo ? (
            <img src={match.homeLogo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[7px] font-bold text-[var(--color-text-secondary)]">
              {match.homeTeam.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Score Pickers & VS */}
        <div className="flex items-center gap-2 shrink-0 justify-center">
          <ScorePicker value={homeScore} onChange={setHomeScore} />
          <span className="text-[9px] font-black text-[var(--color-text-secondary)] uppercase px-1">
            VS
          </span>
          <ScorePicker value={awayScore} onChange={setAwayScore} />
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-2.5 justify-start min-w-0">
          {"awayLogo" in match && match.awayLogo ? (
            <img src={match.awayLogo} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[7px] font-bold text-[var(--color-text-secondary)]">
              {match.awayTeam.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-black uppercase text-[var(--color-text-primary)] truncate">
            {match.awayTeam}
          </span>
        </div>
      </div>

      {/* O/U 2.5 and BTTS selectors (Compact Row) */}
      <div className="flex items-center justify-center gap-6 mt-1 flex-wrap w-full">
        {/* O/U 2.5 */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">O/U 2.5:</span>
          <div className="flex rounded-lg border border-[var(--color-border)] bg-gray-50/50 p-0.5">
            {(["over", "under"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPickOu25(pickOu25 === v ? null : v)}
                className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all duration-200 active:scale-95 cursor-pointer ${
                  pickOu25 === v
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* BTTS */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">BTTS:</span>
          <div className="flex rounded-lg border border-[var(--color-border)] bg-gray-50/50 p-0.5">
            {(["yes", "no"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPickBtts(pickBtts === v ? null : v)}
                className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all duration-200 active:scale-95 cursor-pointer ${
                  pickBtts === v
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save / Update buttons and Outcome Label (Compact Footer) */}
      <div className="flex items-center justify-between gap-4 mt-2 border-t border-[var(--color-border)] pt-3 w-full flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase text-[var(--color-text-secondary)] tracking-wider">
            Outcome:
          </span>
          <span className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm transition-all duration-300 ${
            calculatedPick === "draw"
              ? "text-yellow-700 border-yellow-200 bg-yellow-50/80"
              : calculatedPick === "home"
              ? "text-green-700 border-green-200 bg-green-50/80"
              : "text-blue-700 border-blue-200 bg-blue-50/80"
          }`}>
            {calculatedPick === "home" ? <HomeIcon /> : calculatedPick === "away" ? <AwayIcon /> : <DrawIcon />}
            {outcomeLabel}
          </span>
        </div>

        <button
          className="btn btn-primary !px-4 !py-1.5 !text-[10px] active:scale-[0.98] transition-all cursor-pointer"
          disabled={isPending}
          type="button"
          onClick={submit}
        >
          {isPending ? "Saving..." : existingPred ? "UPDATE PICK" : "SAVE PICK"}
        </button>
      </div>

      {error ? (
        <p className="text-xs font-bold text-red-500">
          {(error as { response?: { data?: { message?: string } } }).response?.data?.message ??
            "Failed to save prediction"}
        </p>
      ) : null}
    </div>
  );
};

type UserPickDisplayProps = {
  match: Fixture | MatchCentreFixture;
  prediction: UserPrediction;
};

const marketResultStyle = (hit: boolean, isResult: boolean) => {
  if (!isResult) return "border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-[var(--color-text-primary)] bg-[var(--color-background-surface)] flex items-center gap-2";
  return hit
    ? "bg-green-500 text-white px-3 py-1.5 rounded-xl border border-green-600 shadow-sm flex items-center gap-2"
    : "bg-red-500 text-white px-3 py-1.5 rounded-xl border border-red-600 shadow-sm flex items-center gap-2";
};

export const UserPickDisplay = ({ match, prediction }: UserPickDisplayProps) => {
  const pickLabel =
    prediction.pick === "home"
      ? match.homeTeam
      : prediction.pick === "away"
        ? match.awayTeam
        : "Draw";

  const isResult = match.status === "result" && match.homeScore !== null;
  const correct = isResult && prediction.correct;
  const ou25Hit = isResult && prediction.correctOu25 === true;
  const bttsHit = isResult && prediction.correctBtts === true;

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3 w-full">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <span className="text-[9px] font-black uppercase text-[var(--color-accent)] tracking-wider">Your Prediction</span>
        {isResult ? (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${
              correct ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {correct ? <CheckIcon /> : <CrossIcon />}
            {correct ? `+${prediction.points} PTS` : "MISSED"}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            Locked
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-[var(--color-text-primary)]">
        <div className="bg-[var(--color-background-body)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] flex items-center gap-2">
          <span className="text-[9px] text-[var(--color-text-secondary)] uppercase">Pick:</span>
          <span className="flex items-center gap-1">
            {prediction.pick === "home" ? <HomeIcon /> : prediction.pick === "away" ? <AwayIcon /> : <DrawIcon />}
            {pickLabel}
          </span>
        </div>

        {prediction.homeScore != null && prediction.awayScore != null && (
          <div className="bg-[var(--color-background-body)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] flex items-center gap-2 font-mono">
            <span className="text-[9px] text-[var(--color-text-secondary)] font-sans uppercase">Score:</span>
            <span className="font-black">{prediction.homeScore} - {prediction.awayScore}</span>
          </div>
        )}

        {prediction.pickOu25 && (
          <div className={marketResultStyle(ou25Hit, isResult)}>
            <span className={`text-[9px] uppercase ${isResult ? "text-white/80" : "text-[var(--color-text-secondary)]"}`}>O/U 2.5:</span>
            <span>{prediction.pickOu25.toUpperCase()}</span>
            {isResult && (ou25Hit ? <CheckIcon /> : <CrossIcon />)}
          </div>
        )}

        {prediction.pickBtts && (
          <div className={marketResultStyle(bttsHit, isResult)}>
            <span className={`text-[9px] uppercase ${isResult ? "text-white/80" : "text-[var(--color-text-secondary)]"}`}>BTTS:</span>
            <span>{prediction.pickBtts.toUpperCase()}</span>
            {isResult && (bttsHit ? <CheckIcon /> : <CrossIcon />)}
          </div>
        )}

        {isResult && (
          <div className="bg-[var(--color-background-body)] px-3 py-1.5 rounded-xl border border-[var(--color-border)] flex items-center gap-2 font-mono">
            <span className="text-[9px] text-[var(--color-text-secondary)] font-sans uppercase">Actual:</span>
            <span className="font-black">{match.homeScore} - {match.awayScore}</span>
          </div>
        )}
      </div>
    </div>
  );
};

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
