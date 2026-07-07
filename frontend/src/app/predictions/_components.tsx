"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubmitPrediction } from "./_api";
import type { Fixture, UserPrediction, LeaderboardEntry, StatsResponse, MatchCentreFixture } from "./_types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";

type PickFormProps = {
  match: Fixture | MatchCentreFixture;
  auth: unknown;
  onSuccess?: () => void;
};

export const PickForm = ({ match, auth, onSuccess }: PickFormProps) => {
  const [pick, setPick] = useState(match.userPrediction?.pick ?? "");
  const [homeScore, setHomeScore] = useState(match.userPrediction?.homeScore ?? null);
  const [awayScore, setAwayScore] = useState(match.userPrediction?.awayScore ?? null);
  const [pickOu25, setPickOu25] = useState(match.userPrediction?.pickOu25 ?? null);
  const [pickBtts, setPickBtts] = useState(match.userPrediction?.pickBtts ?? null);
  const { mutate, isPending, error } = useSubmitPrediction();

  const kickoff = new Date(match.kickoff);
  const started = kickoff <= new Date();

  if (!auth) {
    return (
      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <Link className="btn btn-secondary" href="/login">
          Login to predict
        </Link>
      </div>
    );
  }

  if (started) {
    return match.userPrediction ? (
      <UserPickDisplay match={match} prediction={match.userPrediction} />
    ) : (
      <div className="mt-5 border-t border-[var(--color-border)] pt-4 text-sm font-bold text-[var(--color-text-secondary)]">
        Match has started — predictions closed
      </div>
    );
  }

  const submit = () => {
    if (!pick) return;
    mutate(
      { matchId: match.id, pick, homeScore, awayScore, pickOu25, pickBtts },
      { onSuccess },
    );
  };

  return (
    <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-4">
      <p className="text-xs font-black uppercase text-[var(--color-accent)]">
        {match.userPrediction ? "Your pick" : "Pick result"}
      </p>

      <div className="flex gap-2">
        {(["home", "draw", "away"] as const).map((option) => (
          <button
            className={pick === option ? "btn btn-primary" : "btn btn-secondary"}
            key={option}
            onClick={() => setPick(option)}
            type="button"
          >
            {option === "home" ? match.homeTeam : option === "away" ? match.awayTeam : "Draw"}
          </button>
        ))}
      </div>

      {pick ? (
        <>
          <div className="flex items-center gap-2 text-sm font-bold">
            <span>Score:</span>
            <input
              className="input w-16 text-center"
              max={99}
              min={0}
              placeholder="-"
              type="number"
              value={homeScore ?? ""}
              onChange={(e) => setHomeScore(e.target.value ? Number(e.target.value) : null)}
            />
            <span>-</span>
            <input
              className="input w-16 text-center"
              max={99}
              min={0}
              placeholder="-"
              type="number"
              value={awayScore ?? ""}
              onChange={(e) => setAwayScore(e.target.value ? Number(e.target.value) : null)}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">(optional)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
            <span className="text-xs font-black uppercase text-[var(--color-accent)]">O/U 2.5</span>
            <div className="flex gap-1">
              {(["over", "under"] as const).map((opt) => (
                <button
                  className={pickOu25 === opt ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
                  key={opt}
                  onClick={() => setPickOu25(pickOu25 === opt ? null : opt)}
                  type="button"
                >
                  {opt === "over" ? "Over" : "Under"}
                </button>
              ))}
            </div>
            <span className="text-xs font-black uppercase text-[var(--color-accent)]">BTTS</span>
            <div className="flex gap-1">
              {(["yes", "no"] as const).map((opt) => (
                <button
                  className={pickBtts === opt ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
                  key={opt}
                  onClick={() => setPickBtts(pickBtts === opt ? null : opt)}
                  type="button"
                >
                  {opt === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="flex gap-2">
        <button
          className="btn btn-primary"
          disabled={isPending || !pick}
          type="button"
          onClick={submit}
        >
          {isPending ? "Saving..." : match.userPrediction ? "Update pick" : "Submit pick"}
        </button>
        {match.userPrediction ? (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setPick("")}
          >
            Cancel
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm font-bold text-red-500">
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
  if (!isResult) return "";
  return hit ? "bg-green-600 text-white border-green-600" : "bg-red-600 text-white border-red-600";
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
    <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase text-[var(--color-accent)]">Your prediction</p>
        {isResult ? (
          <span
            className={`px-2 py-1 text-xs font-black uppercase rounded ${correct ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
          >
            {correct ? `+${prediction.points}pts` : "Missed"}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm font-bold">
        <div className="border border-[var(--color-border)] p-2 rounded-lg">
          <span className="text-[var(--color-text-secondary)]">Pick: </span>
          {pickLabel}
        </div>
        {prediction.homeScore != null && prediction.awayScore != null ? (
          <div className="border border-[var(--color-border)] p-2 rounded-lg">
            <span className="text-[var(--color-text-secondary)]">Score: </span>
            {prediction.homeScore}-{prediction.awayScore}
          </div>
        ) : null}
        {prediction.pickOu25 ? (
          <div className={`border p-2 rounded-lg ${marketResultStyle(ou25Hit, isResult)}`}>
            <span className="text-[var(--color-text-secondary)]">O/U 2.5: </span>
            {prediction.pickOu25}
            {isResult && prediction.pickOu25 ? (
              ou25Hit ? " ✓" : " ✗"
            ) : null}
          </div>
        ) : null}
        {prediction.pickBtts ? (
          <div className={`border p-2 rounded-lg ${marketResultStyle(bttsHit, isResult)}`}>
            <span className="text-[var(--color-text-secondary)]">BTTS: </span>
            {prediction.pickBtts}
            {isResult && prediction.pickBtts ? (
              bttsHit ? " ✓" : " ✗"
            ) : null}
          </div>
        ) : null}
        {isResult ? (
          <div className="border border-[var(--color-border)] p-2 rounded-lg">
            <span className="text-[var(--color-text-secondary)]">Actual: </span>
            {match.homeScore}-{match.awayScore}
          </div>
        ) : null}
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
  <aside className="card h-fit p-5">
    <h2 className="font-serif-title text-3xl font-black">Leaderboard</h2>
    {isLoading ? <LoadingBlock label="Loading leaderboard" /> : null}
    {error ? <ErrorBlock message="Could not load leaderboard." /> : null}
    {entries && entries.length === 0 ? (
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">No participants yet.</p>
    ) : null}
    {entries && entries.length > 0 ? (
      <div className="mt-4 grid gap-2">
        {entries.map((entry) => (
          <div
            className="grid grid-cols-[24px_1fr_auto] items-center gap-2 border-t border-[var(--color-border)] pt-2 text-sm"
            key={entry.userId}
          >
            <span className={`text-center font-black ${entry.rank <= 3 ? "text-yellow-600" : ""}`}>
              {entry.rank}
            </span>
            <span className="truncate font-bold">{entry.displayName}</span>
            <span className="font-black text-[var(--color-accent)]">{entry.points}</span>
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
    <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
      <span className="border border-[var(--color-border)] px-2 py-1 rounded">
        {stats.totalPoints} pts
      </span>
      <span className="border border-[var(--color-border)] px-2 py-1 rounded">
        {stats.correctPicks}/{stats.totalPicks}
      </span>
      {stats.currentStreak > 0 ? (
        <span className="border border-orange-400 px-2 py-1 rounded flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1014.12 11.88" />
          </svg>
          <span>{stats.currentStreak}</span>
        </span>
      ) : null}
      {stats.badges.map((b) => (
        <span
          className="border border-green-600 px-2 py-1 text-xs text-green-600 rounded flex items-center gap-1"
          key={b.code}
        >
          <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V4H9v7a3 3 0 003 3zM15 4h3a1 1 0 011 1v3a3 3 0 01-3 3h-1M9 4H6a1 1 0 00-1 1v3a3 3 0 003 3h1m3 3v4M8 21h8" />
          </svg>
          <span>{badgeLabels[b.code] ?? b.code}</span>
        </span>
      ))}
    </div>
  );
};
