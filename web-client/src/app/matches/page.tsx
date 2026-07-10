"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SportsShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useCareer, useSquad, useStoredMatch } from "../career/_api";
import type { MatchEvent } from "../career/_types";
import { matchSummary, scoreAt } from "./_playback";

type Speed = "instant" | "fast" | "normal";

const eventText = (event: MatchEvent, team: string, player: string) => {
  const action = event.type.replaceAll("_", " ").toLowerCase();
  return `${team ? `${team}: ` : ""}${player ? `${player} — ` : ""}${action}`;
};

const StatRow = ({ label, home, away }: { label: string; home: string | number; away: string | number }) => (
  <div className="grid grid-cols-[1fr_2fr_1fr] gap-3 py-2 border-b border-[var(--color-border)]/50 text-sm text-center">
    <strong>{home}</strong><span className="text-[var(--color-text-secondary)]">{label}</span><strong>{away}</strong>
  </div>
);

export default function MatchCentrePage() {
  const [{ saveId, matchId }, setIds] = useState({ saveId: "", matchId: "" });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIds({ saveId: params.get("saveId") ?? "", matchId: params.get("matchId") ?? "" });
  }, []);
  const match = useStoredMatch(saveId, matchId);
  const career = useCareer(saveId);
  const fixture = career.data?.fixtures.find((item) =>
    item.homeClubId === match.data?.home_team_id && item.awayClubId === match.data?.away_team_id);
  const homeSquad = useSquad(saveId, fixture?.homeClubId ?? "");
  const awaySquad = useSquad(saveId, fixture?.awayClubId ?? "");
  const [speed, setSpeed] = useState<Speed>("instant");
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!match.data) return;
    if (speed === "instant") {
      setVisible(match.data.events.length);
      return;
    }
    setVisible(0);
  }, [match.data, speed]);

  useEffect(() => {
    if (!match.data || speed === "instant" || visible >= match.data.events.length) return;
    const timer = window.setTimeout(() => setVisible((count) => count + 1), speed === "fast" ? 150 : 700);
    return () => window.clearTimeout(timer);
  }, [match.data, speed, visible]);

  const names = useMemo(() => new Map(
    [...(homeSquad.data ?? []), ...(awaySquad.data ?? [])].map((player) => [player.id, player.name]),
  ), [homeSquad.data, awaySquad.data]);
  const shown = match.data?.events.slice(0, visible) ?? [];
  const homeName = fixture?.homeClubName ?? "Home";
  const awayName = fixture?.awayClubName ?? "Away";
  const homeScore = scoreAt(shown, match.data?.home_team_id ?? "");
  const awayScore = scoreAt(shown, match.data?.away_team_id ?? "");
  const finished = Boolean(match.data && visible >= match.data.events.length);
  const minute = shown.at(-1)?.minute ?? 0;

  if (!saveId || !matchId) return <SportsShell><div className="card p-8 text-center">
    <p className="mb-4">Choose and play a Career fixture first.</p><Link className="btn btn-primary" href="/career">Go to Career</Link>
  </div></SportsShell>;

  if (match.isLoading || career.isLoading) return <SportsShell><LoadingBlock label="Loading stored match" /></SportsShell>;
  if (match.error || career.error || !match.data) return <SportsShell><div className="card p-5">
    <ErrorBlock message="Could not load this stored match." />
    <button className="btn btn-secondary" onClick={() => { match.refetch(); career.refetch(); }}>Retry</button>
  </div></SportsShell>;

  const teamName = (teamId: string | null) => teamId === match.data.home_team_id ? homeName : teamId === match.data.away_team_id ? awayName : "";

  return <SportsShell><div className="flex flex-col gap-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="eyebrow">Stored Match · Seed {match.data.seed}</p><h1 className="text-3xl font-black font-serif">Match Centre</h1></div>
      <div className="flex gap-2" aria-label="Playback speed">
        {(["instant", "fast", "normal"] as const).map((item) => <button key={item} onClick={() => setSpeed(item)}
          className={`btn ${speed === item ? "btn-primary" : "btn-secondary"}`}>{item}</button>)}
      </div>
    </header>

    <section className="card p-6 text-center">
      <div className="text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-4">{finished ? "Full time" : `${minute}'`}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 max-w-2xl mx-auto">
        <h2 className="font-black text-lg">{homeName}</h2>
        <strong className="text-4xl tabular-nums">{homeScore} – {awayScore}</strong>
        <h2 className="font-black text-lg">{awayName}</h2>
      </div>
    </section>

    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <section className="card p-5">
        <h2 className="font-black mb-4">Timeline</h2>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-[var(--color-border)]">
          {shown.map((event) => <div key={event.sequence} className={`grid grid-cols-[3rem_1fr] gap-3 py-3 text-sm ${event.type === "GOAL" ? "font-black text-emerald-600" : ""}`}>
            <span className="tabular-nums">{event.minute}&apos;</span>
            <span>{eventText(event, teamName(event.team_id), event.player_id ? names.get(event.player_id) ?? "Player" : "")}</span>
          </div>)}
          {!shown.length && <p className="py-12 text-center text-sm text-[var(--color-text-secondary)]">Playback ready.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-black mb-4">Match report</h2>
        {finished ? <>
          <StatRow label="Possession" home={`${match.data.stats.home.possession}%`} away={`${match.data.stats.away.possession}%`} />
          <StatRow label="Shots" home={match.data.stats.home.shots} away={match.data.stats.away.shots} />
          <StatRow label="On target" home={match.data.stats.home.shots_on_target} away={match.data.stats.away.shots_on_target} />
          <StatRow label="xG" home={match.data.stats.home.xg} away={match.data.stats.away.xg} />
          <StatRow label="Passes" home={match.data.stats.home.passes_completed} away={match.data.stats.away.passes_completed} />
          <StatRow label="Fouls" home={match.data.stats.home.fouls} away={match.data.stats.away.fouls} />
          <p className="mt-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{matchSummary(match.data.stats.home, match.data.stats.away, homeName, awayName)}</p>
          <h3 className="font-black mt-6 mb-2">Top performers</h3>
          {[...match.data.stats.players].sort((a, b) => b.rating - a.rating).slice(0, 5).map((player) => <div key={player.player_id} className="flex justify-between py-2 text-sm border-b border-[var(--color-border)]/50">
            <span>{names.get(player.player_id) ?? "Player"}</span><strong>{player.rating.toFixed(2)}</strong>
          </div>)}
        </> : <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">Report unlocks at full time.</p>}
      </section>
    </div>
  </div></SportsShell>;
}
