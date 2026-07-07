"use client";

import React from "react";
import Link from "next/link";
import type { MatchCentreFixture, StandingResponse } from "@/shared/lib/types";

// ─────────────────────────────────────────────
// TeamLogo (shared utility)
// ─────────────────────────────────────────────
export function TeamLogo({
  logo,
  name,
  className = "w-4 h-4",
}: {
  logo?: string;
  name: string;
  className?: string;
}) {
  if (logo && logo.startsWith("http")) {
    return <img src={logo} alt={name} className={`${className} object-contain`} />;
  }
  return (
    <div
      className={`${className} rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-500 border border-gray-200 uppercase shrink-0`}
    >
      {name.substring(0, 2)}
    </div>
  );
}

// ─────────────────────────────────────────────
// MatchesListSidebar
// ─────────────────────────────────────────────
interface MatchesListSidebarProps {
  fixtures: MatchCentreFixture[];
  activeRound: string;
  activeFixtureId: string | null;
  onSelect: (fixtureId: string) => void;
}

export function MatchesListSidebar({
  fixtures,
  activeRound,
  activeFixtureId,
  onSelect,
}: MatchesListSidebarProps) {
  return (
    <div className="w-full lg:col-span-1 flex flex-col gap-4">
      <div className="border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Fixtures ({activeRound.replace("-", " ")})
        </span>
        <span className="text-[9px] bg-red-700 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
          Live
        </span>
      </div>

      <div className="flex flex-col gap-3 max-h-[700px] overflow-y-auto pr-1">
        {fixtures.map((fix) => {
          const isActive = activeFixtureId === fix.fixtureId;
          return (
            <div
              key={fix.id}
              onClick={() => onSelect(fix.fixtureId)}
              className={`cursor-pointer p-4 border rounded-2xl transition-all duration-300 ${
                isActive
                  ? "bg-[var(--color-background-surface)] border-[var(--color-accent)] shadow-premium"
                  : "bg-[var(--color-background-body)] border-[var(--color-border)] hover:bg-[var(--color-background-surface)]"
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[9px] font-bold text-[var(--color-text-secondary)]">
                  <span>
                    {new Date(fix.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className={fix.status === "live" ? "text-green-400 font-bold" : ""}>
                    {fix.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <TeamLogo logo={fix.homeLogo} name={fix.homeTeam} className="w-4 h-4" />
                    <span className="truncate max-w-[90px]">{fix.homeTeam}</span>
                  </div>
                  <span className="font-mono">{fix.homeScore !== null ? fix.homeScore : "-"}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <TeamLogo logo={fix.awayLogo} name={fix.awayTeam} className="w-4 h-4" />
                    <span className="truncate max-w-[90px]">{fix.awayTeam}</span>
                  </div>
                  <span className="font-mono">{fix.awayScore !== null ? fix.awayScore : "-"}</span>
                </div>

                {fix.userPrediction && (
                  <div className="border-t border-[var(--color-border)] pt-2 mt-1 text-[9px] text-green-400 font-bold flex justify-between">
                    <span>
                      My pick: {fix.userPrediction.homeScore} - {fix.userPrediction.awayScore}
                    </span>
                    {fix.userPrediction.points !== undefined && (
                      <span className="bg-green-950 text-green-300 px-1.5 rounded">
                        +{fix.userPrediction.points} pts
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TacticalBoard (Tactical Map + Lineups + Stats)
// ─────────────────────────────────────────────
interface TacticalBoardProps {
  fixture: MatchCentreFixture;
  tacticalTab: "tactics" | "lineup" | "stats";
  onTabChange: (tab: "tactics" | "lineup" | "stats") => void;
}

export function TacticalBoard({ fixture, tacticalTab, onTabChange }: TacticalBoardProps) {
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl p-5 shadow-premium">
      <div className="flex flex-col gap-4">
        {/* View selectors */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2 text-[10px] font-bold uppercase">
          {(["tactics", "lineup", "stats"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`pb-2 px-1 transition-all ${
                tacticalTab === tab
                  ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:text-white"
              }`}
            >
              {tab === "tactics" ? "Tactical Map" : tab === "lineup" ? "Lineups" : "Match Stats"}
            </button>
          ))}
        </div>

        {tacticalTab === "tactics" && (
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[1.5] w-full border border-green-800 bg-[#0a140f] rounded-xl overflow-hidden flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 60">
                <rect x="0" y="0" width="100" height="60" fill="none" stroke="white" strokeWidth="0.8" />
                <line x1="50" y1="0" x2="50" y2="60" stroke="white" strokeWidth="0.8" />
                <circle cx="50" cy="30" r="10" fill="none" stroke="white" strokeWidth="0.8" />
                <rect x="0" y="15" width="16" height="30" fill="none" stroke="white" strokeWidth="0.8" />
                <rect x="84" y="15" width="16" height="30" fill="none" stroke="white" strokeWidth="0.8" />
                <rect x="0" y="22" width="6" height="16" fill="none" stroke="white" strokeWidth="0.8" />
                <rect x="94" y="22" width="6" height="16" fill="none" stroke="white" strokeWidth="0.8" />
              </svg>
              {/* Home player dots */}
              {[["8%","50%"],["22%","20%"],["20%","40%"],["20%","60%"],["22%","80%"],["35%","35%"],["35%","65%"],["44%","25%"],["42%","50%"],["44%","75%"],["48%","50%"]].map(([l, t], i) => (
                <div key={`h-${i}`} className="touch-dot bg-blue-500 text-blue-500" style={{ left: l, top: t }} />
              ))}
              {/* Away player dots */}
              {[["92%","50%"],["78%","20%"],["80%","38%"],["80%","62%"],["78%","80%"],["68%","25%"],["65%","50%"],["68%","75%"],["56%","20%"],["54%","50%"],["56%","80%"]].map(([l, t], i) => (
                <div key={`a-${i}`} className="touch-dot bg-red-500 text-red-500" style={{ left: l, top: t }} />
              ))}
            </div>
            <div className="flex items-center justify-between text-[9px] text-[var(--color-text-secondary)] font-bold">
              <span>Home Tactics: 4-2-3-1</span>
              <span>Away Tactics: 4-3-3</span>
            </div>
          </div>
        )}

        {tacticalTab === "lineup" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-xs">
            <div className="flex flex-col gap-2 border-r border-[var(--color-border)] pr-4">
              <span className="font-bold text-blue-400">{fixture.homeTeam} Lineup</span>
              <ol className="list-decimal pl-4 space-y-1 text-[var(--color-text-secondary)]">
                <li>Ederson (GK)</li><li>K. Walker</li><li>Ruben Dias</li><li>J. Stones</li>
                <li>J. Gvardiol</li><li>Rodri</li><li>M. Kovacic</li><li>Bernardo Silva</li>
                <li>Kevin De Bruyne</li><li>Phil Foden</li>
                <li className="font-bold text-white">Erling Haaland (ST)</li>
              </ol>
            </div>
            <div className="flex flex-col gap-2 pl-4">
              <span className="font-bold text-red-400">{fixture.awayTeam} Lineup</span>
              <ol className="list-decimal pl-4 space-y-1 text-[var(--color-text-secondary)]">
                <li>A. Onana (GK)</li><li>Diogo Dalot</li><li>L. Martinez</li><li>Harry Maguire</li>
                <li>Luke Shaw</li><li>Casemiro</li><li>Bruno Fernandes</li><li>Kobbie Mainoo</li>
                <li>Antony</li>
                <li className="font-bold text-white">Marcus Rashford (LW)</li>
                <li>Rasmus Hojlund</li>
              </ol>
            </div>
          </div>
        )}

        {tacticalTab === "stats" && (
          <div className="flex flex-col gap-3 w-full text-xs font-semibold">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>Possession</span><span>62% - 38%</span>
              </div>
              <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500" style={{ width: "62%" }} />
                <div className="h-full bg-red-500" style={{ width: "38%" }} />
              </div>
            </div>
            {[["Shots (Total)","14 - 6"],["Shots on Target","6 - 3"],["Corners","7 - 2"],["Fouls","8 - 11"]].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5">
                <span>{label}</span><span>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// StandingsTable
// ─────────────────────────────────────────────
interface StandingsTableProps {
  standings: StandingResponse[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="w-full lg:col-span-1 flex flex-col gap-4">
      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
        League Standings
      </span>
      <div className="card overflow-hidden shadow-premium">
        <table className="w-full text-left border-collapse text-[10px] md:text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-secondary)] font-bold">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-1">Team</th>
              <th className="py-2.5 px-2 text-center">PL</th>
              <th className="py-2.5 px-3 text-right">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {standings.map((team) => (
              <tr
                key={team.teamId}
                className="hover:bg-[var(--color-background-body)] font-semibold text-[var(--color-text-primary)] transition-colors"
              >
                <td className="py-2.5 px-3 text-[var(--color-text-secondary)]">{team.rank}</td>
                <td className="py-2.5 px-1">
                  <div className="flex items-center gap-1.5 max-w-[100px] truncate">
                    <img src={team.teamLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                    <span className="truncate">{team.teamName}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-center text-[var(--color-text-secondary)]">{team.played}</td>
                <td className="py-2.5 px-3 text-right text-[var(--color-accent)] font-bold">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PredictForm
// ─────────────────────────────────────────────
interface PredictFormProps {
  fixture: MatchCentreFixture;
  predHome: string;
  predAway: string;
  predOu: string;
  predBtts: string;
  isPending: boolean;
  isLoggedIn: boolean;
  onHomeChange: (v: string) => void;
  onAwayChange: (v: string) => void;
  onOuChange: (v: string) => void;
  onBttsChange: (v: string) => void;
  onSubmit: (e: React.FormEvent, fixtureId: number) => void;
}

export function PredictForm({
  fixture,
  predHome,
  predAway,
  predOu,
  predBtts,
  isPending,
  isLoggedIn,
  onHomeChange,
  onAwayChange,
  onOuChange,
  onBttsChange,
  onSubmit,
}: PredictFormProps) {
  if (fixture.status !== "upcoming") return null;

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-3">
        <h3 className="m-0 font-black text-sm uppercase text-[var(--color-accent)]">
          Submit Match Prediction
        </h3>
        {isLoggedIn ? (
          <form onSubmit={(e) => onSubmit(e, fixture.id)} className="w-full">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                    {fixture.homeTeam} Score
                  </label>
                  <input type="text" placeholder="0" value={predHome} onChange={(e) => onHomeChange(e.target.value)} className="input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                    {fixture.awayTeam} Score
                  </label>
                  <input type="text" placeholder="0" value={predAway} onChange={(e) => onAwayChange(e.target.value)} className="input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Over/Under 2.5</label>
                  <select value={predOu} onChange={(e) => onOuChange(e.target.value)} className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-lg p-2 focus:outline-none">
                    <option value="over">OVER 2.5</option>
                    <option value="under">UNDER 2.5</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">BTTS</label>
                  <select value={predBtts} onChange={(e) => onBttsChange(e.target.value)} className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-lg p-2 focus:outline-none">
                    <option value="yes">YES</option>
                    <option value="no">NO</option>
                  </select>
                </div>
              </div>

              <div className="text-right">
                <button type="submit" disabled={isPending} className="btn btn-primary !px-5 !py-2.5 !text-xs">
                  {isPending ? "Submitting..." : "Submit Prediction"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="text-center text-xs text-[var(--color-text-secondary)] py-4 border-t border-[var(--color-border)]">
            Please{" "}
            <Link href="/login" className="font-bold text-[var(--color-accent)] hover:underline">
              Login
            </Link>{" "}
            to submit predictions.
          </div>
        )}
      </div>
    </div>
  );
}
