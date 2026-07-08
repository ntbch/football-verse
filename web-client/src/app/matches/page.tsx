"use client";

import React, { useState, useEffect, useRef } from "react";
import { SportsShell } from "@/shared/components/page-shell";

interface MatchEvent {
  minute: number;
  type: "kickoff" | "goal" | "shot" | "foul" | "card" | "halftime" | "fulltime" | "info";
  message: string;
  team?: string;
}

export default function MatchSimulatorPage() {
  // Simulator configuration states
  const [homeTeam, setHomeTeam] = useState("Arsenal");
  const [awayTeam, setAwayTeam] = useState("Chelsea");
  const [homeFormation, setHomeFormation] = useState("4-3-3");
  const [awayFormation, setAwayFormation] = useState("4-4-2");
  const [homeMentality, setHomeMentality] = useState("Attacking");
  const [awayMentality, setAwayMentality] = useState("Defensive");

  // Simulation running states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMinute, setSimMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);

  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  const eventListEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll event logs
  useEffect(() => {
    eventListEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, []);

  const addEvent = (minute: number, type: MatchEvent["type"], message: string, team?: string) => {
    setEvents((prev) => [...prev, { minute, type, message, team }]);
  };

  const startSimulation = () => {
    if (isSimulating) return;

    // Reset scores & logs
    setHomeScore(0);
    setAwayScore(0);
    setSimMinute(0);
    setEvents([]);
    setIsSimulating(true);

    let currentMinute = 0;
    let localHomeScore = 0;
    let localAwayScore = 0;

    addEvent(0, "kickoff", `Match kickoff between ${homeTeam} (${homeFormation}) and ${awayTeam} (${awayFormation})!`);

    simulationInterval.current = setInterval(() => {
      currentMinute += Math.floor(Math.random() * 8) + 3; // Advance 3-10 mins per tick

      if (currentMinute >= 90) {
        currentMinute = 90;
        clearInterval(simulationInterval.current!);
        simulationInterval.current = null;
        setIsSimulating(false);
        addEvent(90, "fulltime", `Full-time whistle blown! Final Score: ${homeTeam} ${localHomeScore} - ${localAwayScore} ${awayTeam}`);
        setSimMinute(90);
        return;
      }

      setSimMinute(currentMinute);

      // Handle Half-time trigger around 45th minute
      if (currentMinute >= 45 && currentMinute <= 48 && !events.some((e) => e.type === "halftime")) {
        addEvent(45, "halftime", `Half-time: Teams head to the dressing rooms. Score: ${homeTeam} ${localHomeScore} - ${localAwayScore} ${awayTeam}`);
        return;
      }

      // Random event generator
      const rand = Math.random();
      if (rand < 0.15) {
        // Goal scored!
        const scorerIsHome = Math.random() > (homeMentality === "Attacking" ? 0.4 : 0.6);
        const scoringTeam = scorerIsHome ? homeTeam : awayTeam;
        const defendingTeam = scorerIsHome ? awayTeam : homeTeam;

        if (scorerIsHome) {
          localHomeScore += 1;
          setHomeScore(localHomeScore);
        } else {
          localAwayScore += 1;
          setAwayScore(localAwayScore);
        }

        const goalMessages = [
          `GOAL! A stunning strike from the edge of the box scores for ${scoringTeam}!`,
          `GOAL! ${scoringTeam} converts a beautiful corner header past the keeper!`,
          `GOAL! Clinical finish on a quick counter-attack scores for ${scoringTeam}!`,
        ];
        const msg = goalMessages[Math.floor(Math.random() * goalMessages.length)];
        addEvent(currentMinute, "goal", msg, scoringTeam);

      } else if (rand < 0.4) {
        // Shot missed / saved
        const activeTeam = Math.random() > 0.5 ? homeTeam : awayTeam;
        const shotMessages = [
          `${activeTeam} fires a powerful shot, but it is tipped over the crossbar!`,
          `Narrow miss! A close-range header from ${activeTeam} sails just wide.`,
          `${activeTeam} hits the woodwork! So close to breaking the deadlock.`,
        ];
        addEvent(currentMinute, "shot", shotMessages[Math.floor(Math.random() * shotMessages.length)], activeTeam);

      } else if (rand < 0.6) {
        // Foul
        const foulingTeam = Math.random() > 0.5 ? homeTeam : awayTeam;
        addEvent(currentMinute, "foul", `Hard challenge by ${foulingTeam} stops play. Referee gives a warning.`, foulingTeam);

      } else if (rand < 0.75) {
        // Card
        const bookingTeam = Math.random() > 0.5 ? homeTeam : awayTeam;
        addEvent(
          currentMinute,
          "card",
          `Yellow card shown to a ${bookingTeam} player for a tactical foul.`,
          bookingTeam
        );
      }
    }, 1200); // simulation speed: tick every 1.2s
  };

  return (
    <SportsShell>
      <div className="w-full min-h-screen text-[var(--color-text-primary)] animate-fade-in pb-16">
        <div className="flex flex-col gap-6 w-full">
          
          {/* Header Section */}
          <div className="flex flex-col gap-1 border-b border-[var(--color-border)] pb-4">
            <h2 className="m-0 font-serif-title font-black text-2xl md:text-3xl text-[var(--color-accent)] tracking-tight uppercase">
              FM Lite Match Simulator
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] font-semibold">
              Configure team tactics, formations, and run the tactical simulation engine.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start w-full">
            
            {/* Left Panel: Configuration Form */}
            <div className="lg:col-span-2 order-2 lg:order-1 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl p-5 shadow-premium flex flex-col gap-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
                Simulation Setup
              </span>

              {/* Home Team Config */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-extrabold text-blue-400">Home Team (Attacking Team)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold">Name</label>
                    <input
                      type="text"
                      value={homeTeam}
                      onChange={(e) => setHomeTeam(e.target.value)}
                      disabled={isSimulating}
                      className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold">Formation</label>
                    <select
                      value={homeFormation}
                      onChange={(e) => setHomeFormation(e.target.value)}
                      disabled={isSimulating}
                      className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                    >
                      <option value="4-3-3">4-3-3</option>
                      <option value="4-4-2">4-4-2</option>
                      <option value="3-5-2">3-5-2</option>
                      <option value="4-5-1">4-5-1</option>
                      <option value="5-3-2">5-3-2</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold">Mentality</label>
                  <select
                    value={homeMentality}
                    onChange={(e) => setHomeMentality(e.target.value)}
                    disabled={isSimulating}
                    className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                  >
                    <option value="Attacking">Attacking (More Goals)</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Defensive">Defensive</option>
                  </select>
                </div>
              </div>

              <hr className="border-[var(--color-border)] my-1" />

              {/* Away Team Config */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-extrabold text-red-400">Away Team (Defending Team)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold">Name</label>
                    <input
                      type="text"
                      value={awayTeam}
                      onChange={(e) => setAwayTeam(e.target.value)}
                      disabled={isSimulating}
                      className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold">Formation</label>
                    <select
                      value={awayFormation}
                      onChange={(e) => setAwayFormation(e.target.value)}
                      disabled={isSimulating}
                      className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                    >
                      <option value="4-4-2">4-4-2</option>
                      <option value="4-3-3">4-3-3</option>
                      <option value="3-5-2">3-5-2</option>
                      <option value="4-5-1">4-5-1</option>
                      <option value="5-3-2">5-3-2</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold">Mentality</label>
                  <select
                    value={awayMentality}
                    onChange={(e) => setAwayMentality(e.target.value)}
                    disabled={isSimulating}
                    className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-xs rounded-lg px-3 py-1.5 focus:outline-none"
                  >
                    <option value="Defensive">Defensive (Conserve Score)</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Attacking">Attacking</option>
                  </select>
                </div>
              </div>

              <button
                onClick={startSimulation}
                disabled={isSimulating}
                className={`w-full mt-4 text-xs font-bold uppercase rounded-lg py-2.5 transition-all focus:outline-none ${
                  isSimulating
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/80 active:scale-[0.98]"
                }`}
              >
                {isSimulating ? "Simulating Match..." : "Simulate Match"}
              </button>
            </div>

            {/* Right Panel: Live Match Monitor */}
            <div className="lg:col-span-3 order-1 lg:order-2 flex flex-col gap-5 w-full">
              
              {/* Score Display Widget */}
              <div className="p-6 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium relative text-center">
                <div className="flex items-center justify-between text-[9px] text-[var(--color-text-secondary)] font-bold border-b border-[var(--color-border)] pb-2 mb-4">
                  <span>FM LITE VIRTUAL ARENA</span>
                  {isSimulating ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                      SIMULATING ({simMinute}&apos;)
                    </span>
                  ) : simMinute === 90 ? (
                    <span className="text-gray-400">FINISHED</span>
                  ) : (
                    <span className="text-yellow-500">READY</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-4 max-w-md mx-auto">
                  <div className="flex flex-col gap-2 items-center flex-1">
                    <div className="w-12 h-12 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center font-bold text-xs">
                      {homeTeam.substring(0, 3).toUpperCase()}
                    </div>
                    <h4 className="m-0 font-bold text-sm">{homeTeam}</h4>
                    <span className="text-[10px] text-gray-400 font-mono">{homeFormation}</span>
                  </div>

                  <div className="px-6">
                    <span className="text-4xl md:text-5xl font-black tracking-widest font-mono text-[var(--color-text-primary)]">
                      {homeScore} - {awayScore}
                    </span>
                    <div className="text-[10px] text-gray-500 font-mono mt-2">Minute: {simMinute}&apos;</div>
                  </div>

                  <div className="flex flex-col gap-2 items-center flex-1">
                    <div className="w-12 h-12 rounded-full bg-red-900 border border-red-700 flex items-center justify-center font-bold text-xs">
                      {awayTeam.substring(0, 3).toUpperCase()}
                    </div>
                    <h4 className="m-0 font-bold text-sm">{awayTeam}</h4>
                    <span className="text-[10px] text-gray-400 font-mono">{awayFormation}</span>
                  </div>
                </div>
              </div>

              {/* Event Log Window */}
              <div className="border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl p-5 shadow-premium flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
                  Match Event Log
                </span>

                <div className="flex flex-col gap-3 min-h-[250px] max-h-[300px] overflow-y-auto pr-2 text-xs font-semibold scrollbar-thin">
                  {events.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[220px] text-xs text-gray-500 font-medium">
                      Configure your match settings and click &quot;Simulate Match&quot; to begin.
                    </div>
                  ) : (
                    events.map((e, idx) => (
                      <div key={idx} className="flex gap-4 border-b border-[var(--color-border)]/30 pb-2">
                        <span className="font-mono text-[var(--color-accent)] shrink-0 w-8">{e.minute}&apos;</span>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold ${
                            e.type === "goal" ? "text-green-400" :
                            e.type === "card" ? "text-yellow-400" :
                            e.type === "fulltime" ? "text-red-400" :
                            "text-gray-400"
                          }`}>
                            {e.type}
                          </span>
                          <p className="m-0 text-[var(--color-text-primary)]/90 leading-relaxed font-normal">{e.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={eventListEndRef} />
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </SportsShell>
  );
}
