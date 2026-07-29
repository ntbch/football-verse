"use client";

import type { Fixture, UserPrediction, MatchCentreFixture } from "../types";
import { AwayIcon, CheckIcon, CrossIcon, DrawIcon, HomeIcon } from "./icons";
import { usePredictionScoreLog } from "../api";

type UserPickDisplayProps = {
  match: Fixture | MatchCentreFixture;
  prediction: UserPrediction;
};

const marketResultStyle = (hit: boolean, isResult: boolean) => {
  if (!isResult) return "border border-[var(--color-border)] px-3 py-1.5 rounded-xl text-[var(--color-text-primary)] bg-[var(--color-background-surface)] flex items-center gap-2";
  return hit
    ? "bg-[var(--color-success)] text-[var(--color-text-inverse)] px-3 py-1.5 rounded-xl border border-[var(--color-success)] shadow-sm flex items-center gap-2"
    : "bg-[var(--color-danger)] text-[var(--color-text-inverse)] px-3 py-1.5 rounded-xl border border-[var(--color-danger)] shadow-sm flex items-center gap-2";
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
  const { data: scoreLog, error: scoreLogError, refetch: refetchScoreLog } = usePredictionScoreLog(prediction.matchId, isResult && prediction.scoringState === "SCORED");

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3 w-full">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <span className="text-[9px] font-black uppercase text-[var(--color-accent)] tracking-wider">Your Prediction</span>
        {isResult ? (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${
              correct ? "bg-[var(--color-success)] text-[var(--color-text-inverse)]" : "bg-[var(--color-danger)] text-[var(--color-text-inverse)]"
            }`}
          >
            {correct ? <CheckIcon /> : <CrossIcon />}
            {correct ? `+${prediction.points} PTS` : "MISSED"}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-[var(--color-success)] uppercase bg-[var(--color-success)]/10 px-2 py-0.5 rounded-full border border-[var(--color-success)]/30">
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
            <span className={`text-[9px] uppercase ${isResult ? "text-[var(--color-text-inverse)]/80" : "text-[var(--color-text-secondary)]"}`}>O/U 2.5:</span>
            <span>{prediction.pickOu25.toUpperCase()}</span>
            {isResult && (ou25Hit ? <CheckIcon /> : <CrossIcon />)}
          </div>
        )}

        {prediction.pickBtts && (
          <div className={marketResultStyle(bttsHit, isResult)}>
            <span className={`text-[9px] uppercase ${isResult ? "text-[var(--color-text-inverse)]/80" : "text-[var(--color-text-secondary)]"}`}>BTTS:</span>
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

      {scoreLog ? (
        <section aria-label="Score explanation" className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
          <p className="m-0 text-[9px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">Score explanation</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              ["Outcome", scoreLog.outcomePoints],
              ["Exact score", scoreLog.exactScorePoints],
              ["O/U 2.5", scoreLog.ou25Points],
              ["BTTS", scoreLog.bttsPoints],
            ].map(([label, points]) => (
              <span key={label as string} className="rounded-lg bg-[var(--color-background-surface)] px-2 py-1.5 font-semibold text-[var(--color-text-primary)]">
                {label}: <strong className="font-black">+{points}</strong>
              </span>
            ))}
          </div>
          <p className="mb-0 mt-2 text-xs text-[var(--color-text-secondary)]">{scoreLog.reason}</p>
        </section>
      ) : scoreLogError ? (
        <button className="mt-3 min-h-11 text-xs font-bold text-[var(--color-accent)] hover:underline" onClick={() => refetchScoreLog()} type="button">
          Score explanation is unavailable. Retry
        </button>
      ) : null}
    </div>
  );
};
