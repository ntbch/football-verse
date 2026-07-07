"use client";

import React, { useState, useMemo } from "react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { PublicShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import { useMatchCentre, useSubmitPrediction, usePredictionStats, useLeaderboard } from "./_api";
import { StatsBadges } from "./_components";
import type { MatchCentreFixture } from "./_types";

type FixtureTab = "upcoming" | "live" | "results";

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
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
}

function ScorePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-8 flex items-center justify-center rounded-l-lg border border-[var(--fv-line)] bg-gray-50 hover:bg-gray-100 text-xs font-bold transition-colors active:scale-95"
      >
        −
      </button>
      <div className="w-9 h-8 flex items-center justify-center border-y border-[var(--fv-line)] bg-white text-sm font-black tabular-nums">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(15, value + 1))}
        className="w-7 h-8 flex items-center justify-center rounded-r-lg border border-[var(--fv-line)] bg-gray-50 hover:bg-gray-100 text-xs font-bold transition-colors active:scale-95"
      >
        +
      </button>
    </div>
  );
}

export default function PredictionsPage() {
  const auth = useAuthStore((s) => s.auth);
  const toast = useToast();

  const [league, setLeague] = useState("premier-league");
  const [tab, setTab] = useState<FixtureTab>("upcoming");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Prediction form states
  const [homeScores, setHomeScores] = useState<Record<number, number>>({});
  const [awayScores, setAwayScores] = useState<Record<number, number>>({});
  const [ouPicks, setOuPicks] = useState<Record<number, string>>({});
  const [bttsPicks, setBttsPicks] = useState<Record<number, string>>({});

  const [lbPeriod, setLbPeriod] = useState<"weekly" | "all">("weekly");
  const [showAllStandings, setShowAllStandings] = useState(false);

  /* ── API queries ── */
  const { data: centre, isLoading, error } = useMatchCentre(league);
  const { data: stats } = usePredictionStats();
  const leaderboard = useLeaderboard(lbPeriod);
  const submitMut = useSubmitPrediction();

  const fixtures = centre?.fixtures ?? [];
  const standings = centre?.standings ?? [];

  /* ── filter fixtures by tab ── */
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      if (tab === "upcoming") return isUpcoming(f.status);
      if (tab === "live") return isLive(f.status);
      return isResult(f.status);
    });
  }, [fixtures, tab]);

  // Selected Round filter state
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  // Extract all unique rounds in the current tab
  const availableRounds = useMemo(() => {
    const rounds = new Set<string>();
    for (const fix of filteredFixtures) {
      if (fix.round) rounds.add(fix.round);
    }
    return Array.from(rounds).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [filteredFixtures]);

  // Set default selected round
  React.useEffect(() => {
    if (availableRounds.length > 0) {
      if (!selectedRound || !availableRounds.includes(selectedRound)) {
        setSelectedRound(availableRounds[0]);
      }
    } else {
      if (selectedRound !== null) {
        setSelectedRound(null);
      }
    }
  }, [availableRounds, selectedRound]);

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

  const handleSubmit = (matchId: number) => {
    if (!auth) {
      toast({ body: "Please sign in first.", type: "info" });
      return;
    }
    const predictedHome = homeScores[matchId] ?? 0;
    const predictedAway = awayScores[matchId] ?? 0;

    let calculatedPick: "home" | "draw" | "away" = "draw";
    if (predictedHome > predictedAway) calculatedPick = "home";
    else if (predictedAway > predictedHome) calculatedPick = "away";

    submitMut.mutate(
      {
        matchId,
        pick: calculatedPick,
        homeScore: predictedHome,
        awayScore: predictedAway,
        pickOu25: ouPicks[matchId] || "over",
        pickBtts: bttsPicks[matchId] || "yes",
      },
      {
        onSuccess: () => {
          toast({ body: "Prediction locked in! 🎯", type: "info" });
          setExpandedId(null);
        },
        onError: (err) => {
          toast({ body: "Failed to submit prediction.", type: "error" });
        },
      }
    );
  };

  const tabs: { key: FixtureTab; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "live", label: "Live" },
    { key: "results", label: "Results" },
  ];

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full">
        {/* ═══ HEADER ═══ */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-serif font-black text-3xl md:text-4xl tracking-tight m-0">Predictions</h1>
            <p className="text-xs text-[var(--fv-muted)] mt-1">Pick scores, earn points, climb the leaderboard.</p>
          </div>
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="px-4 py-2.5 rounded-full text-xs font-bold border border-[var(--fv-line)] bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--fv-clay)] cursor-pointer"
          >
            <option value="premier-league">Premier League</option>
            <option value="championship">Championship</option>
          </select>
        </section>

        {/* ═══ STATS ═══ */}
        {auth && stats && (
          <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { icon: "⚡", label: "Points", value: stats.totalPoints ?? 0, accent: true },
              { icon: "📊", label: "Streak", value: stats.currentStreak ?? 0 },
              { icon: "🎯", label: "Accuracy", value: `${stats.totalPicks ? Math.round((stats.correctPicks / stats.totalPicks) * 100) : 0}%` },
              { icon: "💎", label: "Correct Picks", value: stats.correctPicks ?? 0 },
              { icon: "🎮", label: "Played", value: stats.totalPicks ?? 0 },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl bg-white border p-3 flex flex-col items-center gap-0.5 shadow-sm ${s.accent ? "border-[var(--fv-clay)]/30" : "border-[var(--fv-line)]"}`}>
                <span className="text-sm">{s.icon}</span>
                <span className={`text-lg font-black tabular-nums ${s.accent ? "text-[var(--fv-clay)]" : ""}`}>{s.value}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--fv-muted)]">{s.label}</span>
              </div>
            ))}
          </section>
        )}

        {/* ═══ MAIN GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ── LEFT: FIXTURES ── */}
          <div className="lg:col-span-2 flex flex-col gap-0">
            {/* Tabs */}
            <div className="flex rounded-t-2xl overflow-hidden border border-b-0 border-[var(--fv-line)] bg-white shadow-sm">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-all duration-200 relative ${
                    tab === t.key
                      ? "text-[var(--fv-clay)] bg-white"
                      : "text-[var(--fv-muted)] bg-gray-50 hover:bg-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Round Selector Bar */}
            {availableRounds.length > 0 && (
              <div className="flex items-center justify-between border-x border-b border-[var(--fv-line)] bg-gray-50/50 px-4 py-2.5">
                <button
                  disabled={availableRounds.indexOf(selectedRound || "") <= 0}
                  onClick={() => {
                    const idx = availableRounds.indexOf(selectedRound || "");
                    if (idx > 0) setSelectedRound(availableRounds[idx - 1]);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-[var(--fv-line)] bg-white text-xs font-bold shadow-sm hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all duration-200"
                >
                  ← Prev
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fv-muted)]">
                    Round:
                  </span>
                  <select
                    value={selectedRound || ""}
                    onChange={(e) => setSelectedRound(e.target.value)}
                    className="px-3 py-1 rounded-lg border border-[var(--fv-line)] bg-white text-xs font-bold shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--fv-clay)] cursor-pointer"
                  >
                    {availableRounds.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  disabled={availableRounds.indexOf(selectedRound || "") >= availableRounds.length - 1}
                  onClick={() => {
                    const idx = availableRounds.indexOf(selectedRound || "");
                    if (idx < availableRounds.length - 1) setSelectedRound(availableRounds[idx + 1]);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-[var(--fv-line)] bg-white text-xs font-bold shadow-sm hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all duration-200"
                >
                  Next →
                </button>
              </div>
            )}

            {/* Fixtures list */}
            <div className="rounded-b-2xl border border-[var(--fv-line)] bg-white shadow-sm overflow-hidden">
              {isLoading ? (
                <LoadingBlock label="Loading fixtures" />
              ) : error ? (
                <ErrorBlock message="Failed to load fixtures." />
              ) : groupedByRound.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="text-3xl block mb-2">⚽</span>
                  <p className="text-xs text-[var(--fv-muted)] font-serif italic">
                    {tab === "live" ? "No live matches right now." : tab === "results" ? "No results yet." : "No upcoming fixtures."}
                  </p>
                </div>
              ) : (
                groupedByRound.map((group) => (
                  <div key={group.round}>
                    {/* Fixture rows */}
                    {group.fixtures.map((fix) => {
                      const predicted = !!fix.userPrediction;
                      const isExpanded = expandedId === fix.id;
                      const showScore = fix.homeScore !== null && fix.awayScore !== null;

                      return (
                        <div key={fix.id}>
                          {/* Row */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : fix.id)}
                            className={`w-full flex items-center px-4 md:px-5 py-3.5 border-b border-[var(--fv-line)] hover:bg-gray-50/60 transition-colors duration-200 text-left gap-2 ${
                              predicted ? "border-l-[3px] border-l-green-400" : "border-l-[3px] border-l-transparent"
                            }`}
                          >
                            {/* Home team */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                              <span className="text-[11px] md:text-xs font-bold text-right truncate">
                                {fix.homeTeam}
                              </span>
                              {fix.homeLogo ? (
                                <img src={fix.homeLogo} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--fv-muted)]">
                                  {fix.homeTeam?.slice(0, 2)?.toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Center: time/score */}
                            <div className="w-24 flex flex-col items-center shrink-0 mx-1 font-sans">
                              {isLive(fix.status) ? (
                                <>
                                  <span className="font-black text-base tabular-nums text-red-600">
                                    {fix.homeScore ?? 0} – {fix.awayScore ?? 0}
                                  </span>
                                  <span className="text-[8px] font-bold text-red-500 uppercase animate-pulse">
                                    LIVE · {formatTime(fix.kickoff)}
                                  </span>
                                </>
                              ) : showScore ? (
                                <>
                                  <span className="font-black text-base tabular-nums">
                                    {fix.homeScore} – {fix.awayScore}
                                  </span>
                                  <span className="text-[8px] font-bold text-[var(--fv-muted)] uppercase">
                                    FT · {formatTime(fix.kickoff)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-black tabular-nums text-[var(--fv-ink)] bg-gray-50 border border-[var(--fv-line)] rounded-lg px-2.5 py-0.5">
                                    {formatTime(fix.kickoff)}
                                  </span>
                                  <span className="text-[8px] text-[var(--fv-muted)] mt-0.5">
                                    {formatDate(fix.kickoff)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Away team */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {fix.awayLogo ? (
                                <img src={fix.awayLogo} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--fv-muted)]">
                                  {fix.awayTeam?.slice(0, 2)?.toUpperCase()}
                                </div>
                              )}
                              <span className="text-[11px] md:text-xs font-bold truncate">
                                {fix.awayTeam}
                              </span>
                            </div>

                            {/* Arrow */}
                            <span className={`text-[var(--fv-muted)] text-xs ml-1 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                              ›
                            </span>
                          </button>

                          {/* Expanded prediction panel */}
                          {isExpanded && (
                            <div className="px-5 py-4 bg-[var(--fv-paper)]/60 border-b border-[var(--fv-line)] flex flex-col gap-4">
                              {/* Match Analytics Dashboard */}
                              {fix.aiPrediction && (
                                <div className="rounded-xl border border-[var(--fv-line)] bg-white p-3.5 flex flex-col gap-3 shadow-sm">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--fv-muted)]">
                                    Match Analytics & Insights
                                  </span>

                                  {/* Win / Draw / Loss Probability Bar */}
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--fv-ink)]">
                                      <span>{fix.homeTeam} Pct: {fix.aiPrediction.homePct}%</span>
                                      <span>Draw: {fix.aiPrediction.drawPct}%</span>
                                      <span>{fix.awayTeam} Pct: {fix.aiPrediction.awayPct}%</span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden flex w-full">
                                      <div className="bg-[var(--fv-clay)] h-full" style={{ width: `${fix.aiPrediction.homePct}%` }} />
                                      <div className="bg-gray-300 h-full" style={{ width: `${fix.aiPrediction.drawPct}%` }} />
                                      <div className="bg-[var(--fv-muted)] h-full" style={{ width: `${fix.aiPrediction.awayPct}%` }} />
                                    </div>
                                  </div>

                                  {/* Form & H2H */}
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    {/* Left: Form */}
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[9px] font-bold uppercase text-[var(--fv-muted)]">Form (Last 5)</span>
                                      <div className="flex items-center justify-between gap-2 mt-1">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[9px] font-semibold text-[var(--fv-muted)]">Home:</span>
                                          <div className="flex gap-1">
                                            {fix.aiPrediction.homeForm?.map((f, i) => (
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
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[9px] font-semibold text-[var(--fv-muted)]">Away:</span>
                                          <div className="flex gap-1">
                                            {fix.aiPrediction.awayForm?.map((f, i) => (
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
                                    <div className="flex flex-col gap-1 justify-between">
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-[var(--fv-muted)]">AI Suggestion:</span>
                                        <span className="font-black text-[var(--fv-clay)]">{fix.aiPrediction.pickLabel}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-[var(--fv-muted)]">Confidence:</span>
                                        <span className="font-black text-gray-700">{fix.aiPrediction.confidence}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {predicted ? (
                                <div className="flex items-center justify-between flex-wrap gap-3 border border-[var(--fv-line)] rounded-xl bg-white p-3.5">
                                  <div className="flex items-center gap-4 text-[11px]">
                                    <span className="font-bold text-[var(--fv-muted)]">Your prediction:</span>
                                    <span className="font-black text-base text-[var(--fv-clay)] tabular-nums">
                                      {fix.userPrediction?.homeScore} – {fix.userPrediction?.awayScore}
                                    </span>
                                    <span className="text-[var(--fv-muted)] font-bold">
                                      Result: {(fix.userPrediction?.homeScore ?? 0) === (fix.userPrediction?.awayScore ?? 0) ? "DRAW" : (fix.userPrediction?.homeScore ?? 0) > (fix.userPrediction?.awayScore ?? 0) ? "HOME WIN" : "AWAY WIN"}
                                    </span>
                                    <span className="text-[var(--fv-muted)]">
                                      O/U: {fix.userPrediction?.pickOu25?.toUpperCase() || "—"}
                                    </span>
                                    <span className="text-[var(--fv-muted)]">
                                      BTTS: {fix.userPrediction?.pickBtts?.toUpperCase() || "—"}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-1 rounded-full">
                                    ✓ Locked
                                  </span>
                                </div>
                              ) : auth ? (
                                <div className="flex flex-wrap items-end gap-4 justify-center sm:justify-between">
                                  {/* Prediction picks */}
                                  <div className="flex flex-wrap items-center gap-4">
                                    {/* Score pickers */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] font-bold uppercase text-[var(--fv-muted)] truncate max-w-[70px]">{fix.homeTeam}</span>
                                        <ScorePicker
                                          value={homeScores[fix.id] ?? 0}
                                          onChange={(v) => setHomeScores((p) => ({ ...p, [fix.id]: v }))}
                                        />
                                      </div>
                                      <span className="text-xs font-bold text-[var(--fv-muted)] mt-4">–</span>
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[8px] font-bold uppercase text-[var(--fv-muted)] truncate max-w-[70px]">{fix.awayTeam}</span>
                                        <ScorePicker
                                          value={awayScores[fix.id] ?? 0}
                                          onChange={(v) => setAwayScores((p) => ({ ...p, [fix.id]: v }))}
                                        />
                                      </div>
                                    </div>

                                    {/* Outright display outcome */}
                                    <div className="flex flex-col gap-1 justify-center items-center">
                                      <span className="text-[8px] font-bold uppercase text-[var(--fv-muted)]">Predicted Outcome</span>
                                      <span className={`px-3 py-1.5 rounded-lg border border-[var(--fv-line)] text-[10px] font-black uppercase text-center bg-gray-50 ${
                                        (homeScores[fix.id] ?? 0) === (awayScores[fix.id] ?? 0)
                                          ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                                          : (homeScores[fix.id] ?? 0) > (awayScores[fix.id] ?? 0)
                                          ? "text-green-600 border-green-200 bg-green-50"
                                          : "text-blue-600 border-blue-200 bg-blue-50"
                                      }`}>
                                        {(homeScores[fix.id] ?? 0) === (awayScores[fix.id] ?? 0)
                                          ? "Draw 🤝"
                                          : (homeScores[fix.id] ?? 0) > (awayScores[fix.id] ?? 0)
                                          ? `${fix.homeTeam} Win 🏠`
                                          : `${fix.awayTeam} Win ✈️`}
                                      </span>
                                    </div>
                                  </div>

                                  {/* O/U + BTTS toggles */}
                                  <div className="flex gap-3">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[8px] font-bold uppercase text-[var(--fv-muted)]">O/U 2.5</span>
                                      <div className="flex rounded-lg overflow-hidden border border-[var(--fv-line)]">
                                        {["over", "under"].map((v) => (
                                          <button
                                            key={v}
                                            type="button"
                                            onClick={() => setOuPicks((p) => ({ ...p, [fix.id]: v }))}
                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                                              (ouPicks[fix.id] || "over") === v
                                                ? "bg-[var(--fv-clay)] text-white"
                                                : "bg-gray-50 text-[var(--fv-muted)] hover:bg-gray-100"
                                            }`}
                                          >
                                            {v}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[8px] font-bold uppercase text-[var(--fv-muted)]">BTTS</span>
                                      <div className="flex rounded-lg overflow-hidden border border-[var(--fv-line)]">
                                        {["yes", "no"].map((v) => (
                                          <button
                                            key={v}
                                            type="button"
                                            onClick={() => setBttsPicks((p) => ({ ...p, [fix.id]: v }))}
                                            className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                                              (bttsPicks[fix.id] || "yes") === v
                                                ? "bg-[var(--fv-clay)] text-white"
                                                : "bg-gray-50 text-[var(--fv-muted)] hover:bg-gray-100"
                                            }`}
                                          >
                                            {v}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Submit button */}
                                  <button
                                    onClick={() => handleSubmit(fix.id)}
                                    disabled={submitMut.isPending}
                                    className="px-5 py-2 rounded-full text-[10px] font-bold uppercase bg-[var(--fv-clay)] text-white shadow-md hover:shadow-lg disabled:opacity-50 active:scale-95 transition-all duration-200"
                                  >
                                    {submitMut.isPending ? "Sending..." : "Lock In 🔒"}
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <a href="/login" className="text-xs font-bold text-[var(--fv-clay)] hover:underline underline-offset-4">
                                    Sign in to predict
                                  </a>
                                </div>
                              )}
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

          {/* ── RIGHT: SIDEBAR ── */}
          <div className="flex flex-col gap-4">
            {/* Standings */}
            <div className="rounded-2xl bg-white border border-[var(--fv-line)] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--fv-line)] flex items-center justify-between">
                <h3 className="font-serif font-black text-sm m-0">📋 Standings</h3>
                <button
                  onClick={() => setShowAllStandings(true)}
                  className="text-[9px] font-bold uppercase tracking-wider text-[var(--fv-clay)] hover:underline underline-offset-4 bg-transparent border-0 cursor-pointer"
                >
                  Full Table →
                </button>
              </div>
              {standings.length > 0 ? (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[var(--fv-muted)] border-b border-[var(--fv-line)] bg-gray-50/50">
                      <th className="text-left px-4 py-2 font-bold w-6">#</th>
                      <th className="text-left py-2 font-bold">Team</th>
                      <th className="text-center py-2 font-bold w-8">P</th>
                      <th className="text-center py-2 font-bold w-8">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {standings.slice(0, 8).map((s, i) => (
                      <tr key={s.teamId} className="hover:bg-gray-50/50 transition-colors">
                        <td className={`px-4 py-2 font-black ${i < 4 ? "text-[var(--fv-clay)]" : "text-[var(--fv-muted)]"}`}>
                          {s.rank}
                        </td>
                        <td className="py-2 font-bold">
                          <div className="flex items-center gap-2">
                            {s.teamLogo ? (
                              <img src={s.teamLogo} alt="" className="w-4 h-4 object-contain" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[6px] font-bold">
                                {s.teamName?.slice(0, 2)}
                              </div>
                            )}
                            <span className="truncate">{s.teamName}</span>
                          </div>
                        </td>
                        <td className="text-center py-2 text-[var(--fv-muted)]">{s.played}</td>
                        <td className="text-center py-2 font-black">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs text-[var(--fv-muted)] font-serif italic">No standings data.</p>
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="rounded-2xl bg-white border border-[var(--fv-line)] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--fv-line)]">
                <h3 className="font-serif font-black text-sm m-0">🏆 Leaderboard</h3>
              </div>
              <div className="flex border-b border-[var(--fv-line)]">
                {([`weekly`, `all`] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setLbPeriod(p)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-center transition-colors ${
                      lbPeriod === p
                        ? "text-[var(--fv-clay)] border-b-2 border-[var(--fv-clay)] -mb-[1px]"
                        : "text-[var(--fv-muted)] hover:text-[var(--fv-ink)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {leaderboard.data && leaderboard.data.length > 0 ? (
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {leaderboard.data.slice(0, 10).map((e) => (
                    <div key={e.userId} className="px-5 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`font-black w-4 text-center ${e.rank <= 3 ? "text-[var(--fv-clay)]" : "text-[var(--fv-muted)]"}`}>
                          {e.rank}
                        </span>
                        <span className="font-bold truncate text-[var(--fv-ink)]">{e.displayName || e.username}</span>
                      </div>
                      <span className="text-xs font-black text-[var(--fv-clay)] tabular-nums">{e.points}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs text-[var(--fv-muted)] font-serif italic">No rankings yet.</p>
                </div>
              )}
            </div>

            {/* Scoring System */}
            <div className="rounded-2xl bg-white border border-[var(--fv-line)] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--fv-line)]">
                <h3 className="font-serif font-black text-sm m-0">📖 Scoring</h3>
              </div>
              <div className="px-5 py-3 flex flex-col gap-2">
                {[
                  { pts: "7", desc: "Exact score" },
                  { pts: "3", desc: "Correct result (W/D/L)" },
                  { pts: "1", desc: "Correct O/U 2.5" },
                  { pts: "1", desc: "Correct BTTS" },
                ].map((r) => (
                  <div key={r.desc} className="flex items-center gap-3">
                    <span className="text-xs font-black text-[var(--fv-clay)] w-5 text-right tabular-nums">+{r.pts}</span>
                    <span className="text-[10px] text-[var(--fv-ink)]">{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standings Modal Overlay */}
      {showAllStandings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[var(--fv-line)] shadow-lg max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-[var(--fv-line)] flex items-center justify-between">
              <h3 className="font-serif font-black text-base m-0">📋 League Standings</h3>
              <button
                onClick={() => setShowAllStandings(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-sm font-bold border-0 bg-transparent cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs min-w-[550px]">
                <thead>
                  <tr className="text-[var(--fv-muted)] border-b border-[var(--fv-line)] bg-gray-50/50">
                    <th className="text-left px-5 py-3 font-bold w-10">#</th>
                    <th className="text-left py-3 font-bold">Team</th>
                    <th className="text-center py-3 font-bold w-10">P</th>
                    <th className="text-center py-3 font-bold w-10 text-green-600">W</th>
                    <th className="text-center py-3 font-bold w-10 text-yellow-600">D</th>
                    <th className="text-center py-3 font-bold w-10 text-red-600">L</th>
                    <th className="text-center py-3 font-bold w-12">GF</th>
                    <th className="text-center py-3 font-bold w-12">GA</th>
                    <th className="text-center py-3 font-bold w-12">GD</th>
                    <th className="text-center py-3 font-bold w-14 font-black">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {standings.map((s, i) => (
                    <tr key={s.teamId} className="hover:bg-gray-50/50 transition-colors">
                      <td className={`px-5 py-2.5 font-black ${i < 4 ? "text-[var(--fv-clay)]" : "text-[var(--fv-muted)]"}`}>
                        {s.rank}
                      </td>
                      <td className="py-2.5 font-bold">
                        <div className="flex items-center gap-2">
                          {s.teamLogo ? (
                            <img src={s.teamLogo} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[7px] font-bold">
                              {s.teamName?.slice(0, 2)}
                            </div>
                          )}
                          <span className="truncate">{s.teamName}</span>
                        </div>
                      </td>
                      <td className="text-center py-2.5 text-[var(--fv-muted)] font-medium">{s.played}</td>
                      <td className="text-center py-2.5 font-bold text-green-600/90">{s.wins ?? 0}</td>
                      <td className="text-center py-2.5 font-bold text-yellow-600/90">{s.draws ?? 0}</td>
                      <td className="text-center py-2.5 font-bold text-red-600/90">{s.losses ?? 0}</td>
                      <td className="text-center py-2.5 text-[var(--fv-muted)]">{s.goalsFor ?? 0}</td>
                      <td className="text-center py-2.5 text-[var(--fv-muted)]">{s.goalsAgainst ?? 0}</td>
                      <td className={`text-center py-2.5 font-bold ${(s.goalDifference ?? 0) > 0 ? "text-green-600" : (s.goalDifference ?? 0) < 0 ? "text-red-600" : "text-[var(--fv-muted)]"}`}>
                        {(s.goalDifference ?? 0) > 0 ? `+${s.goalDifference}` : s.goalDifference ?? 0}
                      </td>
                      <td className="text-center py-2.5 font-black text-[var(--fv-clay)]">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[var(--fv-line)] bg-gray-50 text-right">
              <button
                onClick={() => setShowAllStandings(false)}
                className="px-4 py-2 rounded-xl border border-[var(--fv-line)] bg-white text-xs font-bold shadow-sm hover:bg-gray-50 active:scale-95 cursor-pointer transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicShell>
  );
}
