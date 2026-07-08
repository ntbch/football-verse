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
        {/* Stats Section at the very top */}
        {auth && stats && (
          <div className="card p-3 md:p-4 grid grid-cols-5 divide-x divide-[var(--color-border)] bg-[var(--color-background-surface)] shadow-premium">
            {[
              { label: "Points", value: stats.totalPoints ?? 0, accent: true },
              { label: "Streak", value: stats.currentStreak ?? 0 },
              {
                label: "Accuracy",
                value: `${stats.totalPicks ? Math.round((stats.correctPicks / stats.totalPicks) * 100) : 0}%`,
              },
              { label: "Correct", value: stats.correctPicks ?? 0 },
              { label: "Played", value: stats.totalPicks ?? 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center px-1 first:pl-0 last:pr-0"
              >
                <span className="text-[8px] sm:text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider text-center">
                  {s.label}
                </span>
                <span className={`text-sm sm:text-lg font-black mt-0.5 tabular-nums ${s.accent ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"
                  }`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Controls Bar: League Select + Round Select side-by-side */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-4 w-full">
          {/* League Dropdown */}
          <div className="relative">
            <select
              value={league}
              onChange={(e) => changeLeague(e.target.value)}
              className="appearance-none bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-bold uppercase rounded-xl pl-4 pr-9 py-2.5 focus:outline-none cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
            >
              <option value="premier-league">Premier League</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Round Dropdown */}
          {availableRounds.length > 0 && (
            <div className="relative">
              <select
                value={selectedRound || ""}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="appearance-none bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-bold uppercase rounded-xl pl-4 pr-9 py-2.5 focus:outline-none cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
              >
                {availableRounds.map((r: string) => (
                  <option key={r} value={r}>
                    {r.replace("-", " ").toUpperCase()}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Fixtures */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Tabs - Premium Segmented Control / Pill Style */}
            <div className="bg-[#E5DFD3] p-1 rounded-xl flex w-full shadow-inner">
              {(["upcoming", "live", "results"] as const).map((t) => {
                const isActive = tab === t;
                const label = t === "upcoming" ? "Upcoming" : t === "live" ? "Live" : "Results";
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      setExpandedId(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold text-center rounded-lg transition-all duration-200 cursor-pointer ${isActive
                      ? "bg-white text-[var(--color-text-primary)] shadow-sm font-black"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

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
                            className={`w-full flex items-center px-4 md:px-5 py-4 hover:bg-gray-50/50 transition-colors text-left gap-2 ${predicted ? "border-l-[3px] border-l-green-500" : "border-l-[3px] border-l-transparent"
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

            {/* Scoring Rules sidebar card */}
            <div className="card p-5">
              <h3 className="font-serif-title font-black text-sm m-0 flex items-center gap-1.5 text-[var(--color-text-primary)] uppercase tracking-tight mb-4">
                <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Scoring Rules</span>
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  {
                    pts: "+3",
                    label: "Outcome",
                    desc: "Correct result (H/D/A)",
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    )
                  },
                  {
                    pts: "+5",
                    label: "Exact Score",
                    desc: "Exact scoreline match",
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    )
                  },
                  {
                    pts: "+2",
                    label: "Over/Under 2.5",
                    desc: "Total goals predicted",
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )
                  },
                  {
                    pts: "+2",
                    label: "BTTS",
                    desc: "Both teams to score",
                    icon: (
                      <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )
                  }
                ].map((rule, idx) => (
                  <div
                    key={idx}
                    className="border-t border-[var(--color-border)] pt-2.5 first:border-0 first:pt-0 flex items-center gap-3"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-mono text-[10px] font-black shrink-0">
                      {rule.pts}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black uppercase text-[var(--color-text-primary)] tracking-wider flex items-center gap-1.5">
                        {rule.icon}
                        {rule.label}
                      </span>
                      <span className="text-[9px] text-[var(--color-text-secondary)] font-medium uppercase truncate">
                        {rule.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
