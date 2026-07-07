"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SportsShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { MatchCentreFixture, MatchCentreResponse } from "@/shared/lib/types";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

// Custom styles for high density layout
const CC_GRID_CSS = `
.touch-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  animation: pulse-dot 2s infinite;
  cursor: pointer;
  transition: all 0.3s ease;
}
.touch-dot:hover {
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 15px currentColor;
}
@keyframes pulse-dot {
  0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
  70% { box-shadow: 0 0 0 6px rgba(255,255,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
}
`;

export default function MatchesPage() {
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedLeague, setSelectedLeague] = useState("premier-league");
  const [selectedRound, setSelectedRound] = useState("");
  const [activeFixtureId, setActiveFixtureId] = useState<string | null>(null);
  const [tacticalTab, setTacticalTab] = useState<"tactics" | "lineup" | "stats">("tactics");

  // Prediction forms
  const [predHome, setPredHome] = useState("");
  const [predAway, setPredAway] = useState("");
  const [predOu, setPredOu] = useState("over");
  const [predBtts, setPredBtts] = useState("yes");

  // 1. Fetch Match Centre data (fixtures, standings, rounds)
  const {
    data: centre,
    isLoading,
    error,
  } = useQuery({
    queryKey: [qk.news.list()[0], "matches", selectedLeague] as const,
    queryFn: () =>
      data<MatchCentreResponse>(http.get(`/matches/centre`, { params: { league: selectedLeague } })),
  });

  // 2. Predict Mutation
  const predictMutation = useMutation({
    mutationFn: (payload: { id: number; homeScore: number; awayScore: number; ou25: string; btts: string }) =>
      data<any>(http.post(`/predictions/${payload.id}`, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [qk.news.list()[0], "matches", selectedLeague] });
      toast({
        body: "Prediction submitted successfully!",
        type: "info",
        autoHideDuration: 3000,
      });
      setPredHome("");
      setPredAway("");
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to submit prediction."),
        type: "error",
      });
    },
  });

  const rounds = centre?.rounds || [];
  const activeRound = selectedRound || centre?.currentRound || "";
  const fixtures = (centre?.fixtures || []).filter((f) => f.round === activeRound);
  const standings = centre?.standings || [];

  // Active Selected Fixture
  const activeFixture =
    fixtures.find((f) => f.fixtureId === activeFixtureId) || fixtures[0] || null;

  const handlePredictSubmit = (e: React.FormEvent, fixtureId: number) => {
    e.preventDefault();
    if (!auth) {
      toast({ body: "Please login to submit predictions.", type: "info" });
      return;
    }
    const h = parseInt(predHome, 10);
    const a = parseInt(predAway, 10);
    if (isNaN(h) || isNaN(a)) {
      toast({ body: "Please enter valid scores.", type: "error" });
      return;
    }
    predictMutation.mutate({
      id: fixtureId,
      homeScore: h,
      awayScore: a,
      ou25: predOu,
      btts: predBtts,
    });
  };

  if (isLoading) {
    return (
      <SportsShell>
        <LoadingBlock label="Initializing Match Command Center" />
      </SportsShell>
    );
  }

  if (error || !centre) {
    return (
      <SportsShell>
        <ErrorBlock message="Failed to load Match Command Center data." />
      </SportsShell>
    );
  }

  return (
    <SportsShell>
      <div className="cc-container w-full min-h-screen text-[var(--color-text-primary)] animate-fade-in">
        <style>{CC_GRID_CSS}</style>
        
        <div className="flex flex-col gap-6 w-full">
          {/* Header Command Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--color-border)] pb-4">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 font-black text-2xl md:text-3xl text-[var(--color-accent)] tracking-tight">
                SPORTS COMMAND CENTER
              </h2>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-semibold">Live match tracker, tactical breakdowns, standings, and AI forecasts.</p>
            </div>

            {/* League/Round Toggles */}
            <div className="flex items-center gap-3">
              <select
                value={selectedLeague}
                onChange={(e) => {
                  setSelectedLeague(e.target.value);
                  setSelectedRound("");
                  setActiveFixtureId(null);
                }}
                className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs font-bold uppercase rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="premier-league">Premier League</option>
                <option value="championship">Championship</option>
                <option value="champions-league">Champions League</option>
              </select>

              {rounds.length > 0 && (
                <select
                  value={activeRound}
                  onChange={(e) => {
                    setSelectedRound(e.target.value);
                    setActiveFixtureId(null);
                  }}
                  className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs font-bold uppercase rounded-lg px-3 py-1.5 focus:outline-none"
                >
                  {rounds.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("-", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Three-Column Command Center Panel */}
          {fixtures.length === 0 ? (
            <div className="text-center py-16 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8">
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">No fixtures available for this round.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start w-full">
              
              {/* Left Column: Matches list */}
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
                    const isActive = activeFixture?.fixtureId === fix.fixtureId;
                    return (
                      <div
                        key={fix.id}
                        onClick={() => {
                          setActiveFixtureId(fix.fixtureId);
                          setPredHome("");
                          setPredAway("");
                        }}
                        className={`cursor-pointer p-4 border rounded-2xl transition-all duration-300 ${
                          isActive
                            ? "bg-[var(--color-background-surface)] border-[var(--color-accent)] shadow-premium"
                            : "bg-[var(--color-background-body)] border-[var(--color-border)] hover:bg-[var(--color-background-surface)]"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[9px] font-bold text-[var(--color-text-secondary)]">
                            <span>{new Date(fix.kickoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className={fix.status === "live" ? "text-green-400 font-bold" : ""}>
                              {fix.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-semibold">
                            <div className="flex items-center gap-2">
                              <img src={fix.homeLogo || "⚽"} alt="" className="w-4 h-4 object-contain" />
                              <span className="truncate max-w-[90px]">{fix.homeTeam}</span>
                            </div>
                            <span className="font-mono">{fix.homeScore !== null ? fix.homeScore : "-"}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-semibold">
                            <div className="flex items-center gap-2">
                              <img src={fix.awayLogo || "⚽"} alt="" className="w-4 h-4 object-contain" />
                              <span className="truncate max-w-[90px]">{fix.awayTeam}</span>
                            </div>
                            <span className="font-mono">{fix.awayScore !== null ? fix.awayScore : "-"}</span>
                          </div>

                          {fix.userPrediction && (
                            <div className="border-t border-[var(--color-border)] pt-2 mt-1 text-[9px] text-green-400 font-bold flex justify-between">
                              <span>My pick: {fix.userPrediction.homeScore} - {fix.userPrediction.awayScore}</span>
                              {fix.userPrediction.points !== undefined && (
                                <span className="bg-green-950 text-green-300 px-1.5 rounded">+{fix.userPrediction.points} pts</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center Column: Live tactical map and interactive scorecard */}
              {activeFixture && (
                <div className="lg:col-span-2 flex flex-col gap-6 w-full">
                  
                  {/* Scorecard Widget */}
                  <div className="p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium relative">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between text-[9px] text-[var(--color-text-secondary)] font-bold border-b border-[var(--color-border)] pb-2">
                        <span>PREMIER LEAGUE • MATCHDAY {activeRound.replace("round-", "")}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                          LIVE 78:24
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        {/* Home team */}
                        <div className="flex flex-col gap-2 items-center flex-1">
                          <img src={activeFixture.homeLogo} alt="" className="w-12 h-12 object-contain" />
                          <h4 className="m-0 font-bold text-xs md:text-sm text-center">
                            {activeFixture.homeTeam}
                          </h4>
                        </div>

                        {/* Score */}
                        <div className="text-center px-4">
                          <span className="text-3xl md:text-5xl font-black tracking-widest font-mono">
                            {activeFixture.homeScore !== null ? activeFixture.homeScore : "0"} - {activeFixture.awayScore !== null ? activeFixture.awayScore : "0"}
                          </span>
                          <div className="text-[9px] font-bold text-green-400 mt-2">
                            AI Forecast: {activeFixture.aiPrediction?.correctScore || "2-1"}
                          </div>
                        </div>

                        {/* Away team */}
                        <div className="flex flex-col gap-2 items-center flex-1">
                          <img src={activeFixture.awayLogo} alt="" className="w-12 h-12 object-contain" />
                          <h4 className="m-0 font-bold text-xs md:text-sm text-center">
                            {activeFixture.awayTeam}
                          </h4>
                        </div>
                      </div>

                      {/* Live scorers list */}
                      <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)] font-semibold border-t border-[var(--color-border)] pt-3">
                        <div className="flex flex-col gap-1">
                          <span>E. Haaland 24' ⚽</span>
                          <span>P. Foden 63' ⚽</span>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <span>M. Rashford 71' ⚽</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tactical / Alignment Board */}
                  <div className="border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl p-5 shadow-premium">
                    <div className="flex flex-col gap-4">
                      {/* View selectors */}
                      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2 text-[10px] font-bold uppercase">
                        <button
                          onClick={() => setTacticalTab("tactics")}
                          className={`pb-2 px-1 transition-all-300 ${
                            tacticalTab === "tactics" ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-white"
                          }`}
                        >
                          Tactical Map
                        </button>
                        <button
                          onClick={() => setTacticalTab("lineup")}
                          className={`pb-2 px-1 transition-all-300 ${
                            tacticalTab === "lineup" ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-white"
                          }`}
                        >
                          Lineups
                        </button>
                        <button
                          onClick={() => setTacticalTab("stats")}
                          className={`pb-2 px-1 transition-all-300 ${
                            tacticalTab === "stats" ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-white"
                          }`}
                        >
                          Match Stats
                        </button>
                      </div>

                      {tacticalTab === "tactics" && (
                        <div className="flex flex-col gap-4">
                          {/* Soccer Field SVG Container */}
                          <div className="relative aspect-[1.5] w-full border border-green-800 bg-[#0a140f] rounded-xl overflow-hidden flex items-center justify-center">
                            {/* Soccer pitch markings */}
                            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 60">
                              {/* Outer frame */}
                              <rect x="0" y="0" width="100" height="60" fill="none" stroke="white" strokeWidth="0.8" />
                              {/* Center line */}
                              <line x1="50" y1="0" x2="50" y2="60" stroke="white" strokeWidth="0.8" />
                              <circle cx="50" cy="30" r="10" fill="none" stroke="white" strokeWidth="0.8" />
                              {/* Penalty areas */}
                              <rect x="0" y="15" width="16" height="30" fill="none" stroke="white" strokeWidth="0.8" />
                              <rect x="84" y="15" width="16" height="30" fill="none" stroke="white" strokeWidth="0.8" />
                              {/* Goal areas */}
                              <rect x="0" y="22" width="6" height="16" fill="none" stroke="white" strokeWidth="0.8" />
                              <rect x="94" y="22" width="6" height="16" fill="none" stroke="white" strokeWidth="0.8" />
                            </svg>

                            {/* Interactive player dots */}
                            {/* Home 4-2-3-1 (Blue dots, left side) */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "8%", top: "50%" }}></div> {/* GK */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "22%", top: "20%" }}></div> {/* RB */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "20%", top: "40%" }}></div> {/* CB */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "20%", top: "60%" }}></div> {/* CB */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "22%", top: "80%" }}></div> {/* LB */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "35%", top: "35%" }}></div> {/* CDM */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "35%", top: "65%" }}></div> {/* CDM */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "44%", top: "25%" }}></div> {/* RAM */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "42%", top: "50%" }}></div> {/* CAM */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "44%", top: "75%" }}></div> {/* LAM */}
                            <div className="touch-dot bg-blue-500 text-blue-500" style={{ left: "48%", top: "50%" }}></div> {/* ST */}

                            {/* Away 4-3-3 (Red dots, right side) */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "92%", top: "50%" }}></div> {/* GK */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "78%", top: "20%" }}></div> {/* RB */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "80%", top: "38%" }}></div> {/* CB */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "80%", top: "62%" }}></div> {/* CB */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "78%", top: "80%" }}></div> {/* LB */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "68%", top: "25%" }}></div> {/* RCM */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "65%", top: "50%" }}></div> {/* CM */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "68%", top: "75%" }}></div> {/* LCM */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "56%", top: "20%" }}></div> {/* RW */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "54%", top: "50%" }}></div> {/* ST */}
                            <div className="touch-dot bg-red-500 text-red-500" style={{ left: "56%", top: "80%" }}></div> {/* LW */}
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
                            <span className="font-bold text-blue-400">{activeFixture.homeTeam} Lineup</span>
                            <ol className="list-decimal pl-4 space-y-1 text-[var(--color-text-secondary)]">
                              <li>Ederson (GK)</li>
                              <li>K. Walker</li>
                              <li>Ruben Dias</li>
                              <li>J. Stones</li>
                              <li>J. Gvardiol</li>
                              <li>Rodri</li>
                              <li>M. Kovacic</li>
                              <li>Bernardo Silva</li>
                              <li>Kevin De Bruyne</li>
                              <li>Phil Foden</li>
                              <li className="font-bold text-white">Erling Haaland (ST)</li>
                            </ol>
                          </div>
                          <div className="flex flex-col gap-2 pl-4">
                            <span className="font-bold text-red-400">{activeFixture.awayTeam} Lineup</span>
                            <ol className="list-decimal pl-4 space-y-1 text-[var(--color-text-secondary)]">
                              <li>A. Onana (GK)</li>
                              <li>Diogo Dalot</li>
                              <li>L. Martinez</li>
                              <li>Harry Maguire</li>
                              <li>Luke Shaw</li>
                              <li>Casemiro</li>
                              <li>Bruno Fernandes</li>
                              <li>Kobbie Mainoo</li>
                              <li>Antony</li>
                              <li className="font-bold text-white">Marcus Rashford (LW)</li>
                              <li>Rasmus Hojlund</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {tacticalTab === "stats" && (
                        <div className="flex flex-col gap-3 w-full text-xs font-semibold">
                          {/* Possession stats */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span>Possession</span>
                              <span>62% - 38%</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden flex">
                              <div className="h-full bg-blue-500" style={{ width: "62%" }}></div>
                              <div className="h-full bg-red-500" style={{ width: "38%" }}></div>
                            </div>
                          </div>
                          {/* Shots */}
                          <div className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5">
                            <span>Shots (Total)</span>
                            <span>14 - 6</span>
                          </div>
                          {/* Shots on Target */}
                          <div className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5">
                            <span>Shots on Target</span>
                            <span>6 - 3</span>
                          </div>
                          {/* Corners */}
                          <div className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5">
                            <span>Corners</span>
                            <span>7 - 2</span>
                          </div>
                          {/* Fouls */}
                          <div className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5">
                            <span>Fouls</span>
                            <span>8 - 11</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submitting predictions for the selected match */}
                  {activeFixture.status === "upcoming" && (
                    <div className="p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium">
                      <div className="flex flex-col gap-3">
                        <h3 className="m-0 font-black text-sm uppercase text-[var(--color-accent)]">
                          Submit Match Prediction
                        </h3>
                        {auth ? (
                          <form onSubmit={(e) => handlePredictSubmit(e, activeFixture.id)} className="w-full">
                            <div className="flex flex-col gap-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">{activeFixture.homeTeam} Score</label>
                                  <input
                                    type="text"
                                    placeholder="0"
                                    value={predHome}
                                    onChange={(e) => setPredHome(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all-300"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">{activeFixture.awayTeam} Score</label>
                                  <input
                                    type="text"
                                    placeholder="0"
                                    value={predAway}
                                    onChange={(e) => setPredAway(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all-300"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Over/Under 2.5</label>
                                  <select
                                    value={predOu}
                                    onChange={(e) => setPredOu(e.target.value)}
                                    className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded-lg p-2 focus:outline-none"
                                  >
                                    <option value="over">OVER 2.5</option>
                                    <option value="under">UNDER 2.5</option>
                                  </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">BTTS (Both Teams To Score)</label>
                                  <select
                                    value={predBtts}
                                    onChange={(e) => setPredBtts(e.target.value)}
                                    className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded-lg p-2 focus:outline-none"
                                  >
                                    <option value="yes">YES</option>
                                    <option value="no">NO</option>
                                  </select>
                                </div>
                              </div>

                              <div className="text-right">
                                <button
                                  type="submit"
                                  disabled={predictMutation.isPending}
                                  className="px-5 py-2.5 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-all-300 shadow-sm"
                                >
                                  {predictMutation.isPending ? "Submitting..." : "Submit Prediction"}
                                </button>
                              </div>
                            </div>
                          </form>
                        ) : (
                          <div className="text-center text-xs text-[var(--color-text-secondary)] py-4 border-t border-[var(--color-border)]">
                            Please <Link href="/login" className="font-bold text-[var(--color-accent)] hover:underline">Login</Link> to submit predictions.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI forecast and details if available */}
                  {activeFixture.aiPrediction && (
                    <div className="p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium">
                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-bold text-[var(--color-accent)] uppercase">AI Forecast Indicators</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">Win Probability</span>
                            <span className="font-bold text-white">
                              Home: {activeFixture.aiPrediction.homePct}% | Draw: {activeFixture.aiPrediction.drawPct}% | Away: {activeFixture.aiPrediction.awayPct}%
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">AI Confidence</span>
                            <span className="font-bold text-white">{activeFixture.aiPrediction.confidence}%</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">Both Teams to Score</span>
                            <span className="font-bold text-white">{activeFixture.aiPrediction.bothTeamsToScore.toUpperCase()}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">Over/Under 2.5 Goals</span>
                            <span className="font-bold text-white">{activeFixture.aiPrediction.overUnder25.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Right Column: Standings Table */}
              <div className="w-full lg:col-span-1 flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
                  League Standings
                </span>

                <div className="bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-premium">
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
                        <tr key={team.teamId} className="hover:bg-[var(--color-background-body)] font-semibold text-white transition-colors">
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

            </div>
          )}
        </div>
      </div>
    </SportsShell>
  );
}
