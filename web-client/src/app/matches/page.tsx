"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SportsShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { MatchCentreResponse } from "@/shared/lib/types";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import { MatchesListSidebar, TacticalBoard, StandingsTable, PredictForm, TeamLogo } from "./_components";

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

  // Prediction form state
  const [predHome, setPredHome] = useState("");
  const [predAway, setPredAway] = useState("");
  const [predOu, setPredOu] = useState("over");
  const [predBtts, setPredBtts] = useState("yes");

  // 1. Fetch Match Centre data (fixtures, standings, rounds)
  const { data: centre, isLoading, error } = useQuery({
    queryKey: qk.predictions.matchCentre(selectedLeague, selectedRound),
    queryFn: () =>
      data<MatchCentreResponse>(
        http.get(`/matches/centre`, {
          params: { league: selectedLeague, round: selectedRound || undefined },
        })
      ),
  });

  // 2. Predict Mutation
  const predictMutation = useMutation({
    mutationFn: (payload: { id: number; homeScore: number; awayScore: number; ou25: string; btts: string }) =>
      data<any>(http.post(`/predictions/${payload.id}`, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.predictions.matchCentre(selectedLeague, selectedRound) });
      toast({ body: "Prediction submitted successfully!", type: "info", autoHideDuration: 3000 });
      setPredHome("");
      setPredAway("");
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to submit prediction."), type: "error" });
    },
  });

  const rounds = centre?.rounds || [];
  const activeRound = selectedRound || centre?.currentRound || "";
  const fixtures = (centre?.fixtures || []).filter((f) => f.round === activeRound);
  const standings = centre?.standings || [];
  const activeFixture = fixtures.find((f) => f.fixtureId === activeFixtureId) || fixtures[0] || null;

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
    predictMutation.mutate({ id: fixtureId, homeScore: h, awayScore: a, ou25: predOu, btts: predBtts });
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
              <h2 className="m-0 font-serif-title font-black text-2xl md:text-3xl text-[var(--color-accent)] tracking-tight">
                SPORTS COMMAND CENTER
              </h2>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-semibold">
                Live match tracker, tactical breakdowns, standings, and AI forecasts.
              </p>
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
                className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-bold uppercase rounded-lg px-3 py-1.5 focus:outline-none"
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
                  className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-bold uppercase rounded-lg px-3 py-1.5 focus:outline-none"
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
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">
                No fixtures available for this round.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start w-full">
              {/* Left Column: Matches list */}
              <MatchesListSidebar
                fixtures={fixtures}
                activeRound={activeRound}
                activeFixtureId={activeFixtureId}
                onSelect={(fixtureId) => {
                  setActiveFixtureId(fixtureId);
                  setPredHome("");
                  setPredAway("");
                }}
              />

              {/* Center Column: Live tactical map and interactive scorecard */}
              {activeFixture && (
                <div className="lg:col-span-2 flex flex-col gap-6 w-full">
                  {/* Scorecard Widget */}
                  <div className="p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium relative">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between text-[9px] text-[var(--color-text-secondary)] font-bold border-b border-[var(--color-border)] pb-2">
                        <span>
                          {selectedLeague.replace("-", " ").toUpperCase()} • MATCHDAY{" "}
                          {activeRound.replace("round-", "")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                          LIVE 78:24
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div className="flex flex-col gap-2 items-center flex-1">
                          <TeamLogo logo={activeFixture.homeLogo} name={activeFixture.homeTeam} className="w-12 h-12" />
                          <h4 className="m-0 font-bold text-xs md:text-sm text-center">{activeFixture.homeTeam}</h4>
                        </div>
                        <div className="text-center px-4">
                          <span className="text-3xl md:text-5xl font-black tracking-widest font-mono">
                            {activeFixture.homeScore !== null ? activeFixture.homeScore : "0"} -{" "}
                            {activeFixture.awayScore !== null ? activeFixture.awayScore : "0"}
                          </span>
                          <div className="text-[9px] font-bold text-green-400 mt-2">
                            AI Forecast: {activeFixture.aiPrediction?.correctScore || "2-1"}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-center flex-1">
                          <TeamLogo logo={activeFixture.awayLogo} name={activeFixture.awayTeam} className="w-12 h-12" />
                          <h4 className="m-0 font-bold text-xs md:text-sm text-center">{activeFixture.awayTeam}</h4>
                        </div>
                      </div>

                      {/* Live scorers list */}
                      <div className="flex items-center justify-between text-[10px] text-[var(--color-text-secondary)] font-semibold border-t border-[var(--color-border)] pt-3">
                        <div className="flex flex-col gap-1">
                          <span>E. Haaland 24&apos;</span>
                          <span>P. Foden 63&apos;</span>
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <span>M. Rashford 71&apos;</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <TacticalBoard
                    fixture={activeFixture}
                    tacticalTab={tacticalTab}
                    onTabChange={setTacticalTab}
                  />

                  <PredictForm
                    fixture={activeFixture}
                    predHome={predHome}
                    predAway={predAway}
                    predOu={predOu}
                    predBtts={predBtts}
                    isPending={predictMutation.isPending}
                    isLoggedIn={!!auth}
                    onHomeChange={setPredHome}
                    onAwayChange={setPredAway}
                    onOuChange={setPredOu}
                    onBttsChange={setPredBtts}
                    onSubmit={handlePredictSubmit}
                  />

                  {/* AI forecast details */}
                  {activeFixture.aiPrediction && (
                    <div className="card p-5">
                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-bold text-[var(--color-accent)] uppercase">
                          AI Forecast Indicators
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">Win Probability</span>
                            <span className="font-bold text-[var(--color-text-primary)]">
                              Home: {activeFixture.aiPrediction.homePct}% | Draw:{" "}
                              {activeFixture.aiPrediction.drawPct}% | Away:{" "}
                              {activeFixture.aiPrediction.awayPct}%
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">AI Confidence</span>
                            <span className="font-bold text-[var(--color-text-primary)]">
                              {activeFixture.aiPrediction.confidence}%
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">Both Teams to Score</span>
                            <span className="font-bold text-[var(--color-text-primary)]">
                              {activeFixture.aiPrediction.bothTeamsToScore.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[var(--color-text-secondary)]">Over/Under 2.5 Goals</span>
                            <span className="font-bold text-[var(--color-text-primary)]">
                              {activeFixture.aiPrediction.overUnder25.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Right Column: Standings Table */}
              <StandingsTable standings={standings} />
            </div>
          )}
        </div>
      </div>
    </SportsShell>
  );
}
