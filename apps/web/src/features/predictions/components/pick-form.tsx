"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubmitPrediction } from "../api";
import type { Fixture, UserPrediction, MatchCentreFixture } from "../types";
import { AwayIcon, DrawIcon, HomeIcon } from "./icons";
import { UserPickDisplay } from "./user-pick-display";
import { ScorePicker } from "./score-picker";

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
