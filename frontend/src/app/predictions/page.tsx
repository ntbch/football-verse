"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PublicShell } from "@/shared/components/page-shell";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { MatchCentreFixture, StandingRow } from "./_types";
import {
  useLeaderboard,
  useMatchCentre,
  usePredictionStats,
  useSubmitPrediction,
} from "./_api";
import { LeaderboardPanel, PickForm, StatsBadges, MatchAnalytics } from "./_components";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";

function isUpcoming(status: string) {
  const s = status?.toUpperCase?.() ?? "";
  return ["NS", "TBD", "PST", "CANC", "", "UPCOMING"].includes(s);
}

function isLive(status: string) {
  const s = status?.toUpperCase?.() ?? "";
  return ["LIVE", "1H", "2H", "HT", "ET", "BT", "P"].includes(s);
}

function isResult(status: string) {
  const s = status?.toUpperCase?.() ?? "";
  return ["FT", "AET", "PEN", "AWD", "WO", "RESULT", "RESULTS"].includes(s);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function PredictionsPage() {
  const auth = useAuthStore((state) => state.auth);
  const [league, setLeague] = useState("premier-league");
  const [tab, setTab] = useState<"upcoming" | "live" | "results">("upcoming");
  const [lbPeriod, setLbPeriod] = useState<"weekly" | "all">("weekly");
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAllStandings, setShowAllStandings] = useState(false);

  // Queries
  const { data: stats, isLoading: statsLoading } = usePredictionStats();
  const { data: lbData, isLoading: lbLoading, error: lbError } = useLeaderboard(lbPeriod);
  const { data: centre, isLoading: centreLoading, error: centreError } = useMatchCentre(league);

  const submitMut = useSubmitPrediction();

  const fixtures = centre?.fixtures ?? [];
  const standings = centre?.standings ?? [];

  // Filter fixtures by tab status using robust status checking
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((f: MatchCentreFixture) => {
      if (tab === "upcoming") return isUpcoming(f.status);
      if (tab === "live") return isLive(f.status);
      return isResult(f.status);
    });
  }, [fixtures, tab]);

  // Extract all unique rounds in the current tab client-side
  const availableRounds = useMemo(() => {
    const rounds = new Set<string>();
    for (const fix of filteredFixtures) {
      if (fix.round) rounds.add(fix.round);
    }
    return Array.from(rounds);
  }, [filteredFixtures]);

  // Set default selected round on tab/data change
  useEffect(() => {
    if (availableRounds.length > 0) {
      if (!selectedRound || !availableRounds.includes(selectedRound)) {
        if (tab === "results") {
          // Select last round for results (latest played)
          setSelectedRound(availableRounds[availableRounds.length - 1]);
        } else {
          // Select first round for upcoming/live (soonest)
          setSelectedRound(availableRounds[0]);
        }
      }
    } else {
      setSelectedRound(null);
    }
  }, [availableRounds, selectedRound, tab]);

  // Group and filter by selected round
  const groupedByRound = useMemo(() => {
    const map = new Map<string, MatchCentreFixture[]>();
    for (const fix of filteredFixtures) {
      const round = fix.round || "Fixtures";
      if (!map.has(round)) map.set(round, []);
      map.get(round)!.push(fix);
    }
    const result: { round: string; fixtures: MatchCentreFixture[] }[] = [];
    for (const [round, fxs] of map) {
      if (selectedRound && round !== selectedRound) continue;
      result.push({ round, fixtures: fxs });
    }
    return result;
  }, [filteredFixtures, selectedRound]);

  const changeLeague = (newLeague: string) => {
    setLeague(newLeague);
    setSelectedRound(null);
    setExpandedId(null);
  };

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--color-border)] pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-serif-title font-black text-3xl uppercase tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
              <svg className="w-7 h-7 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 2c5.523 0 10 4.477 10 10S17.523 22 12 22 2 17.523 2 12 6.477 2 12 2z" />
              </svg>
              <span>Predictions & Arena</span>
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-semibold">
              Lock in your scores, analyze AI forecasts, and track the global leaderboard.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={league}
              onChange={(e) => changeLeague(e.target.value)}
              className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-bold uppercase rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="premier-league">Premier League</option>
              <option value="championship">Championship</option>
              <option value="champions-league">Champions League</option>
            </select>
          </div>
        </div>

        {/* Stats Section */}
        {auth && stats && (
          <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { icon: (
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ), label: "Points", value: stats.totalPoints ?? 0, accent: true },
              { icon: (
                  <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                  </svg>
                ), label: "Streak", value: stats.currentStreak ?? 0 },
              {
                icon: (
                  <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                ),
                label: "Accuracy",
                value: `${stats.totalPicks ? Math.round((stats.correctPicks / stats.totalPicks) * 100) : 0}%`,
              },
              { icon: (
                  <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L12 2l6 10-6 10-6-10z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M6 12h12" />
                  </svg>
                ), label: "Correct Picks", value: stats.correctPicks ?? 0 },
              { icon: (
                  <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                  </svg>
                ), label: "Played", value: stats.totalPicks ?? 0 },
            ].map((s) => (
              <div
                key={s.label}
                className={`card p-4 flex flex-col items-center gap-1.5 ${
                  s.accent ? "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5" : ""
                }`}
              >
                <span>{s.icon}</span>
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  {s.label}
                </span>
                <span className="text-lg font-black text-[var(--color-text-primary)] tabular-nums">
                  {s.value}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Fixtures */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)] text-xs font-bold uppercase tracking-wider">
              {(["upcoming", "live", "results"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setExpandedId(null);
                  }}
                  className={`pb-2.5 px-4 border-b-2 transition-colors ${
                    tab === t
                      ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Rounds Selector */}
            {availableRounds.length > 0 && (
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-white border border-[var(--color-border)] shadow-sm">
                <button
                  disabled={availableRounds.indexOf(selectedRound || "") <= 0}
                  onClick={() => {
                    const idx = availableRounds.indexOf(selectedRound || "");
                    if (idx > 0) setSelectedRound(availableRounds[idx - 1]);
                  }}
                  className="btn btn-secondary !px-2.5 !py-1 !text-[10px] active:scale-[0.98] transition-all"
                >
                  ← Prev
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Round:
                  </span>
                  <select
                    value={selectedRound || ""}
                    onChange={(e) => setSelectedRound(e.target.value)}
                    className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    {availableRounds.map((r: string) => (
                      <option key={r} value={r}>
                        {r.replace("-", " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  disabled={
                    availableRounds.indexOf(selectedRound || "") >= availableRounds.length - 1
                  }
                  onClick={() => {
                    const idx = availableRounds.indexOf(selectedRound || "");
                    if (idx < availableRounds.length - 1) setSelectedRound(availableRounds[idx + 1]);
                  }}
                  className="btn btn-secondary !px-2.5 !py-1 !text-[10px] active:scale-[0.98] transition-all"
                >
                  Next →
                </button>
              </div>
            )}

            {/* Fixtures list */}
            <div className="card overflow-hidden">
              {centreLoading ? (
                <LoadingBlock label="Loading fixtures" />
              ) : centreError ? (
                <ErrorBlock message="Failed to load fixtures." />
              ) : groupedByRound.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <svg className="w-8 h-8 text-[var(--color-text-secondary)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 2c5.523 0 10 4.477 10 10S17.523 22 12 22 2 17.523 2 12 6.477 2 12 2z" />
                  </svg>
                  <p className="text-xs text-[var(--color-text-secondary)] font-serif italic m-0">
                    {tab === "live"
                      ? "No live matches right now."
                      : tab === "results"
                        ? "No results yet."
                        : "No upcoming fixtures."}
                  </p>
                </div>
              ) : (
                groupedByRound.map((group) => (
                  <div key={group.round} className="divide-y divide-[var(--color-border)]">
                    {group.fixtures.map((fix: MatchCentreFixture) => {
                      const predicted = !!fix.userPrediction;
                      const isExpanded = expandedId === fix.id;
                      const showScore = fix.homeScore !== null && fix.awayScore !== null;

                      return (
                        <div key={fix.id} className="w-full">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : fix.id)}
                            className={`w-full flex items-center px-4 md:px-5 py-4 hover:bg-gray-50/50 transition-colors text-left gap-2 ${
                              predicted ? "border-l-[3px] border-l-green-500" : "border-l-[3px] border-l-transparent"
                            }`}
                          >
                            {/* Home */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <span className="text-xs font-bold text-right truncate">
                                {fix.homeTeam}
                              </span>
                              {fix.homeLogo && (
                                <img src={fix.homeLogo} alt="" className="w-6 h-6 object-contain" />
                              )}
                            </div>

                            {/* Center Score */}
                            <div className="w-24 flex flex-col items-center shrink-0 mx-1">
                              {isLive(fix.status) ? (
                                <>
                                  <span className="font-black text-sm text-red-600 font-mono">
                                    {fix.homeScore ?? 0} – {fix.awayScore ?? 0}
                                  </span>
                                  <span className="text-[8px] font-bold text-red-500 uppercase animate-pulse">
                                    LIVE
                                  </span>
                                </>
                              ) : showScore ? (
                                <>
                                  <span className="font-black text-sm text-[var(--color-text-primary)] font-mono">
                                    {fix.homeScore} – {fix.awayScore}
                                  </span>
                                  <span className="text-[8px] font-bold text-[var(--color-text-secondary)] uppercase">
                                    FT
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-black text-[var(--color-text-primary)] bg-gray-50 border border-[var(--color-border)] rounded-lg px-2 py-0.5">
                                    {formatTime(fix.kickoff)}
                                  </span>
                                  <span className="text-[8px] text-[var(--color-text-secondary)] mt-0.5">
                                    {formatDate(fix.kickoff)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Away */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {fix.awayLogo && (
                                <img src={fix.awayLogo} alt="" className="w-6 h-6 object-contain" />
                              )}
                              <span className="text-xs font-bold truncate">{fix.awayTeam}</span>
                            </div>

                            {/* Arrow Indicator */}
                            <span className={`text-[var(--color-text-secondary)] text-sm ml-1 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                              ›
                            </span>
                          </button>

                          {/* Expanded Form / Picker / Analytics */}
                          {isExpanded && (
                            <div className="px-5 py-4 border-t border-[var(--color-border)] bg-gray-50/30">
                              {/* AI Analytics and Insights */}
                              {fix.aiPrediction && (
                                <MatchAnalytics match={fix} />
                              )}

                              {/* Prediction form */}
                              <PickForm
                                match={fix}
                                auth={auth}
                                onSuccess={() => setExpandedId(null)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Leaderboard & Standings */}
          <div className="flex flex-col gap-4">
            {/* Standings */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="font-serif-title font-black text-sm m-0 flex items-center gap-1.5 text-[var(--color-text-primary)]">
                  <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Standings</span>
                </h3>
                <button
                  onClick={() => setShowAllStandings(!showAllStandings)}
                  className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline border-0 bg-transparent cursor-pointer"
                >
                  {showAllStandings ? "Collapse" : "Full Table"} →
                </button>
              </div>
              {standings.length > 0 ? (
                <div className="w-full">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--color-text-secondary)] border-b border-[var(--color-border)] bg-gray-50/50">
                        <th className="px-2 py-2 font-bold w-5 text-center">#</th>
                        <th className="py-2 font-bold">Team</th>
                        <th className="text-center py-2 font-bold w-6">P</th>
                        {showAllStandings && (
                          <>
                            <th className="text-center py-2 font-bold w-12">W-D-L</th>
                            <th className="text-center py-2 font-bold w-12">GF-GA</th>
                            <th className="text-center py-2 font-bold w-8">GD</th>
                          </>
                        )}
                        <th className="text-right px-2 py-2 font-bold w-7">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {standings.slice(0, showAllStandings ? 20 : 8).map((s: StandingRow) => (
                        <tr key={s.teamId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-2 py-2 font-black text-[var(--color-text-secondary)] text-center">
                            {s.rank}
                          </td>
                          <td className="py-2 font-bold">
                            <div className="flex items-center gap-1">
                              {s.teamLogo && (
                                <img src={s.teamLogo} alt="" className="w-3.5 h-3.5 object-contain" />
                              )}
                              <span className="truncate max-w-[70px]" title={s.teamName}>{s.teamName}</span>
                            </div>
                          </td>
                          <td className="text-center py-2 text-[var(--color-text-secondary)]">
                            {s.played}
                          </td>
                          {showAllStandings && (
                            <>
                              <td className="text-center py-2 text-[var(--color-text-secondary)] font-mono text-[10px]">
                                {s.wins ?? 0}-{s.draws ?? 0}-{s.losses ?? 0}
                              </td>
                              <td className="text-center py-2 text-[var(--color-text-secondary)] font-mono text-[10px]">
                                {s.goalsFor ?? 0}-{s.goalsAgainst ?? 0}
                              </td>
                              <td className="text-center py-2 font-bold text-[var(--color-text-secondary)]">
                                {(s.goalDifference ?? 0) > 0 ? `+${s.goalDifference}` : s.goalDifference}
                              </td>
                            </>
                          )}
                          <td className="text-right px-2 py-2 font-black text-[var(--color-accent)]">
                            {s.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">
                    No standings data.
                  </p>
                </div>
              )}
            </div>

            {/* Leaderboard Panel */}
            <LeaderboardPanel entries={lbData} error={lbError} isLoading={lbLoading} />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
