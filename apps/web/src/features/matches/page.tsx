"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SportsShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAbandonMatchSession, useCareer, useContinueMatchSession, useFinishMatchSession, useMatchSession, useMatchSessionCommand, useSquad, useStoredMatch } from "../career/_api";
import { PlayerInspector } from "../career/_components/player-inspector";
import { TacticsBoard } from "../career/_components/tactics-board";
import { remapFormation } from "../career/_formation-remap";
import { FORMATIONS } from "../career/_formations";
import type { Formation, Lineup, MatchEvent, MatchSessionCommand, MatchSessionCommandPayload, MatchSessionSnapshot, MatchSessionTeam, Player, Tactic } from "../career/_types";
import { draftSubstitutions, matchSummary, scoreAt } from "./_playback";

type Speed = "instant" | "fast" | "normal";
type EventFilter = "all" | "goals" | "cards" | "subs";
type WorkspaceTab = "overview" | "stats" | "players" | "tactics" | "bench";

const controlledTeam = (snapshot?: MatchSessionSnapshot): MatchSessionTeam | undefined => snapshot?.controlledClubId === (snapshot?.home?.clubId ?? snapshot?.home?.id)
  ? snapshot?.home : snapshot?.away;
const copyLineup = (lineup: Lineup): Lineup => ({ ...lineup, starters: lineup.starters.map((slot) => ({ ...slot })), bench: [...lineup.bench] });

const eventText = (event: MatchEvent, team: string, player: string) => {
  const action = event.type.replaceAll("_", " ").toLowerCase();
  return `${team ? `${team}: ` : ""}${player ? `${player} — ` : ""}${action}`;
};
const eventIcon = (type: string) => type === "GOAL" ? "⚽" : type.includes("CARD") ? "🟨" : type === "SUBSTITUTION" ? "🔁" : "•";
const eventMatches = (event: MatchEvent, filter: EventFilter) =>
  filter === "all" || (filter === "goals" && event.type === "GOAL")
  || (filter === "cards" && event.type.includes("CARD"))
  || (filter === "subs" && event.type === "SUBSTITUTION");

const StatRow = ({ label, home, away }: { label: string; home: string | number; away: string | number }) => (
  <div className="grid grid-cols-[1fr_2fr_1fr] gap-3 py-2 border-b border-[var(--color-border)]/50 text-sm text-center">
    <strong>{home}</strong><span className="text-[var(--color-text-secondary)]">{label}</span><strong>{away}</strong>
  </div>
);

export default function MatchCentrePage() {
  const router = useRouter();
  const [{ saveId, matchId, sessionId }, setIds] = useState({ saveId: "", matchId: "", sessionId: "" });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIds({ saveId: params.get("saveId") ?? "", matchId: params.get("matchId") ?? "", sessionId: params.get("sessionId") ?? "" });
  }, []);
  const match = useStoredMatch(saveId, matchId);
  const session = useMatchSession(saveId, sessionId);
  const continueSession = useContinueMatchSession(saveId, sessionId);
  const commandSession = useMatchSessionCommand(saveId, sessionId);
  const finishSession = useFinishMatchSession(saveId, sessionId);
  const abandonSession = useAbandonMatchSession(saveId, sessionId);
  const career = useCareer(saveId);
  const fixture = career.data?.fixtures.find((item) => sessionId
    ? item.id === session.data?.fixtureId
    : item.homeClubId === match.data?.home_team_id && item.awayClubId === match.data?.away_team_id);
  const homeSquad = useSquad(saveId, fixture?.homeClubId ?? "");
  const awaySquad = useSquad(saveId, fixture?.awayClubId ?? "");
  const [speed, setSpeed] = useState<Speed>("instant");
  const [filter, setFilter] = useState<EventFilter>("all");
  const [visible, setVisible] = useState(0);
  const [outgoingPlayerId, setOutgoingPlayerId] = useState("");
  const [incomingPlayerId, setIncomingPlayerId] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("overview");
  const [draftLineup, setDraftLineup] = useState<Lineup | null>(null);
  const [draftTactic, setDraftTactic] = useState<Tactic | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const team = controlledTeam(session.data);
    if (draftDirty || !team?.lineup || !team.tactic) return;
    setDraftLineup(copyLineup(team.lineup));
    setDraftTactic({ ...team.tactic });
    setOutgoingPlayerId("");
    setIncomingPlayerId("");
  }, [draftDirty, session.data?.version]);

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
  const filteredEvents = shown.filter((event) => eventMatches(event, filter));
  const homeName = fixture?.homeClubName ?? "Home";
  const awayName = fixture?.awayClubName ?? "Away";
  const homeScore = scoreAt(shown, match.data?.home_team_id ?? "");
  const awayScore = scoreAt(shown, match.data?.away_team_id ?? "");
  const finished = Boolean(match.data && visible >= match.data.events.length);
  const minute = shown.at(-1)?.minute ?? 0;

  if (!saveId || (!matchId && !sessionId)) return <SportsShell><div className="card p-8 text-center">
    <p className="mb-4">Choose and play a Career fixture first.</p><Link className="btn btn-primary" href="/career">Go to Career</Link>
  </div></SportsShell>;

  if (sessionId) {
    if (session.isLoading || career.isLoading) return <SportsShell game><LoadingBlock label="Resuming Matchday" /></SportsShell>;
    if (session.error || career.error || !session.data) return <SportsShell game><div className="card p-5">
      <ErrorBlock message="Could not resume this Matchday." />
      <div className="flex gap-2"><button className="btn btn-secondary" onClick={() => { session.refetch(); career.refetch(); }}>Retry</button><Link className="btn btn-secondary" href="/career">Career</Link></div>
    </div></SportsShell>;

    const snapshot = session.data;
    const liveEvents = snapshot.events ?? snapshot.eventsSinceLastPause ?? [];
    const liveFiltered = liveEvents.filter((event) => eventMatches(event, filter));
    const latest = liveEvents.at(-1);
    const liveHomeId = snapshot.home?.clubId ?? snapshot.home?.id ?? fixture?.homeClubId ?? "";
    const liveAwayId = snapshot.away?.clubId ?? snapshot.away?.id ?? fixture?.awayClubId ?? "";
    const liveHomeName = snapshot.home?.clubName ?? snapshot.home?.name ?? fixture?.homeClubName ?? "Home";
    const liveAwayName = snapshot.away?.clubName ?? snapshot.away?.name ?? fixture?.awayClubName ?? "Away";
    const liveTeamName = (teamId: string | null) => teamId === liveHomeId ? liveHomeName : teamId === liveAwayId ? liveAwayName : "";
    const pause = snapshot.pauseReason.replaceAll("_", " ").toLowerCase();
    const canFinish = snapshot.canFinish ?? snapshot.pauseReason === "FULL_TIME";
    const canContinue = snapshot.canContinue ?? (snapshot.status === "ACTIVE" && !canFinish);
    const action = { requestId: crypto.randomUUID(), expectedVersion: snapshot.version };
    const controlled = controlledTeam(snapshot);
    const appliedLineup = controlled?.lineup;
    const appliedTactic = controlled?.tactic;
    const controlledPlayers = snapshot.controlledClubId === liveHomeId ? homeSquad.data ?? [] : awaySquad.data ?? [];
    const resetDraft = (updated: MatchSessionSnapshot, message: string) => {
      const team = controlledTeam(updated);
      if (team?.lineup) setDraftLineup(copyLineup(team.lineup));
      if (team?.tactic) setDraftTactic({ ...team.tactic });
      setDraftDirty(false);
      setOutgoingPlayerId("");
      setIncomingPlayerId("");
      setAnnouncement(message);
    };
    const command = (value: MatchSessionCommandPayload, message: string, keepDraft = false) =>
      commandSession.mutate({ ...value, requestId: crypto.randomUUID(), expectedVersion: snapshot.version } as MatchSessionCommand, {
        onSuccess: (updated) => keepDraft ? setAnnouncement(message) : resetDraft(updated, message),
        onError: () => setAnnouncement("Match changed elsewhere. Latest state loaded; draft retained."),
      });
    const pendingSubstitutions = appliedLineup && draftLineup ? draftSubstitutions(appliedLineup, draftLineup) : [];
    const changeTactic = (changes: Partial<Tactic>) => {
      if (!draftTactic) return;
      setDraftTactic({ ...draftTactic, ...changes });
      setDraftDirty(true);
      setAnnouncement("Tactical changes drafted. Confirm to apply them to future segments.");
    };
    const queueSubstitution = () => {
      if (!draftLineup || !outgoingPlayerId || !incomingPlayerId) return;
      const index = draftLineup.starters.findIndex((slot) => slot.player_id === outgoingPlayerId);
      const benchIndex = draftLineup.bench.indexOf(incomingPlayerId);
      if (index < 0 || benchIndex < 0) return;
      setDraftLineup({ ...draftLineup,
        starters: draftLineup.starters.map((slot, slotIndex) => slotIndex === index ? { ...slot, player_id: incomingPlayerId } : slot),
        bench: draftLineup.bench.map((id, playerIndex) => playerIndex === benchIndex ? outgoingPlayerId : id),
      });
      setDraftDirty(true);
      setOutgoingPlayerId("");
      setIncomingPlayerId("");
      setAnnouncement("Substitution added to draft. Review quota before confirmation.");
    };
    const discardDraft = () => {
      if (appliedLineup) setDraftLineup(copyLineup(appliedLineup));
      if (appliedTactic) setDraftTactic({ ...appliedTactic });
      setDraftDirty(false);
      setAnnouncement("Draft discarded. Applied match plan restored.");
    };

    return <SportsShell game><div className="matchday-live flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Live Matchday · {pause}</p><h1 className="text-3xl font-black font-serif">Match Centre</h1></div>
        <div className="flex gap-2"><Link className="btn btn-secondary" href="/career">Career</Link>
          <button className="btn btn-secondary" disabled={abandonSession.isPending} onClick={() => {
            if (!window.confirm("Abandon this Matchday? Progress in this match will be lost.")) return;
            abandonSession.mutate(action, { onSuccess: () => router.replace(`/career?saveId=${saveId}`) });
          }}>{abandonSession.isPending ? "Abandoning..." : "Abandon"}</button>
        </div>
      </header>

      <section className="card p-6 text-center border-emerald-500/30">
        <div className="text-xs font-bold uppercase text-[var(--color-text-secondary)] mb-4">{snapshot.minute}&apos; · Paused: {pause}</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 max-w-2xl mx-auto">
          <h2 className="font-black text-lg">{liveHomeName}</h2>
          <strong className="text-4xl tabular-nums">{snapshot.score?.home ?? snapshot.homeScore ?? 0} - {snapshot.score?.away ?? snapshot.awayScore ?? 0}</strong>
          <h2 className="font-black text-lg">{liveAwayName}</h2>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1.25fr_1fr] gap-5 items-start">
        <div className="flex flex-col gap-5">
          <section className="card p-5">
            <div className="aspect-video rounded-xl border border-emerald-300/20 bg-[linear-gradient(90deg,rgba(16,80,52,.94),rgba(23,105,67,.92))] grid place-items-center text-center text-white overflow-hidden relative">
              <div className="absolute inset-y-0 left-1/2 border-l border-white/30" /><div className="absolute w-24 h-24 rounded-full border border-white/30" />
              <div className="relative z-10 rounded-xl bg-black/45 px-5 py-4 max-w-sm">
                <p className="text-xs uppercase tracking-widest text-white/70">{latest?.zone?.replaceAll("_", " ") ?? "Middle"}</p>
                <strong>{latest ? eventText(latest, liveTeamName(latest.team_id), latest.player_id ? names.get(latest.player_id) ?? "Player" : "") : "Kick-off ready"}</strong>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm"><strong>Decision pause</strong><p className="text-[var(--color-text-secondary)]">Continue advances to the next highlight or decision.</p></div>
              {canContinue && <button className="btn btn-primary" disabled={continueSession.isPending} onClick={() => continueSession.mutate(action, {
                onSuccess: () => setAnnouncement("Match advanced to next pause."),
                onError: () => setAnnouncement("Match changed elsewhere. Latest state loaded; draft retained."),
              })}>{continueSession.isPending ? "Simulating..." : "Continue"}</button>}
              {canFinish && <button className="btn btn-primary" disabled={finishSession.isPending} onClick={() => finishSession.mutate(action, {
                onSuccess: (played) => router.replace(`/matches?saveId=${saveId}&matchId=${played.matchId}`),
              })}>{finishSession.isPending ? "Finalising..." : "Finish Matchday"}</button>}
            </div>
            {(continueSession.error || finishSession.error || commandSession.error) && <div className="mt-3"><ErrorBlock message="The match changed elsewhere or the action failed. The latest committed state has been loaded; try again." /></div>}
          </section>

          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4"><h2 className="font-black">Timeline</h2><div className="flex gap-2">
              {(["all", "goals", "cards", "subs"] as const).map((item) => <button key={item} className={`btn !py-2 !px-3 !text-xs ${filter === item ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(item)}>{item}</button>)}
            </div></div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--color-border)]">
              {liveFiltered.map((event) => <div key={event.sequence} className={`grid grid-cols-[3rem_2rem_1fr] gap-3 py-3 text-sm ${event.type === "GOAL" ? "font-black text-emerald-500" : ""}`}>
                <span>{event.minute}&apos;</span><span>{eventIcon(event.type)}</span><span>{eventText(event, liveTeamName(event.team_id), event.player_id ? names.get(event.player_id) ?? "Player" : "")}</span>
              </div>)}
              {!liveFiltered.length && <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">No events for this filter yet.</p>}
            </div>
          </section>
        </div>

        <aside className="card p-5" ref={workspaceRef}>
          <div className="matchday-tabs" role="tablist" aria-label="Matchday workspace">
            {(["overview", "stats", "players", "tactics", "bench"] as const).map((tab) => <button key={tab} role="tab"
              aria-selected={workspaceTab === tab} className={workspaceTab === tab ? "is-active" : ""}
              onClick={() => setWorkspaceTab(tab)}>{tab}</button>)}
          </div>

          {workspaceTab === "overview" && <div role="tabpanel" className="mt-5">
            <h2 className="font-black mb-3">Touchline</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["ENCOURAGE", "DEMAND_MORE", "FOCUS", "CALM_DOWN"] as const).map((shout) =>
                <button key={shout} className="btn btn-secondary !px-2 !py-2 !text-xs" disabled={!canContinue || commandSession.isPending}
                  onClick={() => command({ type: "SHOUT", shout }, `${shout.replaceAll("_", " ")} applied to future segments.`, true)}>{shout.replaceAll("_", " ")}</button>)}
            </div>
            <div className="mt-5 rounded-xl bg-[var(--color-surface-secondary)] p-4 text-sm">
              <strong>Pause reason</strong><p className="capitalize">{pause}. Continue never applies or discards a draft.</p>
            </div>
            {snapshot.substitutions && <div className="mt-3 rounded-xl bg-[var(--color-surface-secondary)] p-4 text-sm">
              <strong>Substitution quota</strong><p>{snapshot.substitutions.playersRemaining} players · {snapshot.substitutions.windowsRemaining} windows left{snapshot.substitutions.halftimeWindowFree ? " · halftime window free" : ""}</p>
            </div>}
            <h3 className="font-black mt-5 mb-2 text-sm">Pressure indicator</h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              {[{ id: liveHomeId, name: liveHomeName }, { id: liveAwayId, name: liveAwayName }].map((team) => {
                const pressure = liveEvents.filter((event) => event.team_id === team.id && event.minute >= snapshot.minute - 10)
                  .reduce((total, event) => total + (event.type === "GOAL" ? 4 : event.type === "SHOT" ? 2 : event.type === "PASS" ? 0.2 : 0), 0);
                return <div key={team.id} className="rounded-lg border border-[var(--color-border)] p-3"><strong>{team.name}</strong><p>{pressure.toFixed(1)}</p></div>;
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Pressure derives from recent events; it is not goal probability.</p>
          </div>}

          {workspaceTab === "stats" && <div role="tabpanel" className="mt-5">
            <h2 className="font-black mb-4">Team statistics</h2>
            {snapshot.stats ? <div className="rounded-xl border border-[var(--color-border)] p-3">
              <StatRow label="Possession" home={`${snapshot.stats.home.possession}%`} away={`${snapshot.stats.away.possession}%`} />
              <StatRow label="Shots" home={snapshot.stats.home.shots} away={snapshot.stats.away.shots} />
              <StatRow label="On target" home={snapshot.stats.home.shots_on_target} away={snapshot.stats.away.shots_on_target} />
              <StatRow label="xG" home={snapshot.stats.home.xg} away={snapshot.stats.away.xg} />
              <StatRow label="Passes" home={snapshot.stats.home.passes_completed} away={snapshot.stats.away.passes_completed} />
              <StatRow label="Fouls" home={snapshot.stats.home.fouls} away={snapshot.stats.away.fouls} />
            </div> : <p className="text-sm text-[var(--color-text-secondary)]">Analysis appears after first segment.</p>}
            <h3 className="font-black mt-6 mb-2">Player condition</h3>
            <div className="max-h-72 overflow-y-auto divide-y divide-[var(--color-border)] text-sm">{draftLineup?.starters.map((slot) => {
              const player = controlledPlayers.find((item) => item.id === slot.player_id);
              return <button className="w-full grid grid-cols-[1fr_auto_auto] gap-3 py-2 text-left" key={slot.player_id} onClick={() => player && setSelectedPlayer(player)}>
                <span>{player?.name ?? "Player"}</span><span>{slot.position}</span><strong>{Math.round(player?.fitness ?? 0)}%</strong>
              </button>;
            })}</div>
          </div>}

          {workspaceTab === "players" && <div role="tabpanel" className="mt-5">
            <h2 className="font-black mb-3">Players</h2>
            <div className="grid gap-2">{controlledPlayers.map((player) => <button className="btn btn-secondary !justify-between" key={player.id}
              onClick={() => setSelectedPlayer(player)}><span>{player.name}</span><span>{player.primary_position} · {Math.round(player.fitness)}%</span></button>)}</div>
          </div>}

          {workspaceTab === "tactics" && draftLineup && draftTactic && <div role="tabpanel" className="mt-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-black">Match plan</h2>
              <span className={`matchday-draft ${draftDirty ? "is-draft" : ""}`}>{draftDirty ? "Draft" : "Applied"}</span></div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button className="btn btn-secondary !px-2 !py-2 !text-xs" onClick={() => changeTactic({ mentality: "CAUTIOUS", tempo: "SLOW", time_wasting: "MODERATE" })}>Protect</button>
              <button className="btn btn-secondary !px-2 !py-2 !text-xs" onClick={() => changeTactic({ mentality: "BALANCED", tempo: "NORMAL", time_wasting: "OFF" })}>Balance</button>
              <button className="btn btn-secondary !px-2 !py-2 !text-xs" onClick={() => changeTactic({ mentality: "ATTACKING", tempo: "FAST", pressing: "HIGH" })}>Attack</button>
            </div>
            <label className="grid gap-1 mt-3 text-xs font-bold">Formation<select className="input" value={draftLineup.formation} onChange={(event) => {
              try {
                const remapped = remapFormation({ currentFormation: draftLineup.formation, currentSlots: draftLineup.starters,
                  currentBench: draftLineup.bench, squad: controlledPlayers, nextFormation: event.target.value as Formation });
                setDraftLineup({ formation: remapped.formation, starters: remapped.slots, bench: remapped.bench });
                setDraftDirty(true);
                setAnnouncement(`${remapped.preview.summary} Review before confirmation.`);
              } catch (error) { setAnnouncement(error instanceof Error ? error.message : "Formation could not be prepared."); }
            }}>{Object.keys(FORMATIONS).map((formation) => <option key={formation}>{formation}</option>)}</select></label>
            <div className="mt-4"><TacticsBoard slots={draftLineup.starters} bench={draftLineup.bench} players={controlledPlayers}
              inactivePlayerIds={controlled?.inactivePlayerIds}
              onChange={(starters) => { setDraftLineup({ ...draftLineup, starters }); setDraftDirty(true); }}
              onBenchChange={(bench) => { setDraftLineup({ ...draftLineup, bench }); setDraftDirty(true); }} onInspect={setSelectedPlayer} /></div>
            <div className="mt-4 rounded-xl bg-[var(--color-surface-secondary)] p-3 text-xs">
              <strong>Confirmation preview</strong><p>{pendingSubstitutions.length} substitution(s); plan becomes active only for future segments.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3"><button className="btn btn-secondary" disabled={!draftDirty} onClick={discardDraft}>Discard</button>
              <button className="btn btn-primary" disabled={!canContinue || !draftDirty || pendingSubstitutions.length > 0 || commandSession.isPending}
                onClick={() => command({ type: "TACTIC", tactic: draftTactic, lineup: draftLineup }, "Match plan applied to future segments.")}>Apply plan</button></div>
            {pendingSubstitutions.length > 0 && <p className="mt-2 text-xs text-amber-300">Confirm bench changes first; formation/role draft stays visible.</p>}
          </div>}

          {workspaceTab === "bench" && <div role="tabpanel" className="mt-5">
            <div className="flex items-center justify-between"><h2 className="font-black">Substitution batch</h2><span className="matchday-draft is-draft">Draft</span></div>
            <div className="grid gap-2 mt-4">
              <select className="input" aria-label="Player to take off" value={outgoingPlayerId} onChange={(event) => setOutgoingPlayerId(event.target.value)}><option value="">Player off</option>
                {draftLineup?.starters.filter((slot) => !controlled?.inactivePlayerIds?.includes(slot.player_id)).map((slot) => <option key={slot.player_id} value={slot.player_id}>{names.get(slot.player_id) ?? slot.position} · {slot.position}</option>)}</select>
              <select className="input" aria-label="Player to bring on" value={incomingPlayerId} onChange={(event) => setIncomingPlayerId(event.target.value)}><option value="">Player on</option>
                {draftLineup?.bench.map((playerId) => <option key={playerId} value={playerId}>{names.get(playerId) ?? "Substitute"}</option>)}</select>
              <button className="btn btn-secondary" disabled={!outgoingPlayerId || !incomingPlayerId} onClick={queueSubstitution}>Add to batch</button>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--color-border)] p-3 text-sm">
              {pendingSubstitutions.map((change) => <p key={change.outgoingPlayerId}>{names.get(change.outgoingPlayerId)} off · {names.get(change.incomingPlayerId)} on · {change.position}</p>)}
              {!pendingSubstitutions.length && <p className="text-[var(--color-text-secondary)]">No substitutions drafted.</p>}
            </div>
            {snapshot.substitutions && <p className="mt-3 text-xs">Confirming batch uses {snapshot.substitutions.halftimeWindowFree ? 0 : 1} window; {snapshot.substitutions.playersRemaining} players and {snapshot.substitutions.windowsRemaining} windows currently remain.</p>}
            <div className="grid grid-cols-2 gap-2 mt-3"><button className="btn btn-secondary" disabled={!pendingSubstitutions.length} onClick={discardDraft}>Discard</button>
              <button className="btn btn-primary" disabled={!canContinue || !pendingSubstitutions.length || commandSession.isPending
                || pendingSubstitutions.length > (snapshot.substitutions?.playersRemaining ?? 5)
                || (!snapshot.substitutions?.halftimeWindowFree && (snapshot.substitutions?.windowsRemaining ?? 3) < 1)}
                onClick={() => command({ type: "SUBSTITUTION", substitutions: pendingSubstitutions.map(({ outgoingPlayerId, incomingPlayerId }) => ({ outgoingPlayerId, incomingPlayerId })) },
                  `${pendingSubstitutions.length} substitution(s) applied. Remaining tactical draft retained.`, true)}>Confirm batch</button></div>
          </div>}
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </aside>
      </div>
      {selectedPlayer && <PlayerInspector player={selectedPlayer} onClose={() => {
        setSelectedPlayer(null);
        workspaceRef.current?.querySelector<HTMLButtonElement>("[role=tab][aria-selected=true]")?.focus();
      }} />}
    </div></SportsShell>;
  }

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
        <strong className="text-4xl tabular-nums">{homeScore} - {awayScore}</strong>
        <h2 className="font-black text-lg">{awayName}</h2>
      </div>
    </section>

    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-black">Timeline</h2>
          <div className="flex gap-2">
            {(["all", "goals", "cards", "subs"] as const).map((item) => <button key={item}
              className={`btn !py-2 !px-3 !text-xs ${filter === item ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(item)}>{item}</button>)}
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-[var(--color-border)]">
          {filteredEvents.map((event) => <div key={event.sequence} className={`grid grid-cols-[3rem_2rem_1fr] gap-3 py-3 text-sm ${event.type === "GOAL" ? "font-black text-emerald-600" : ""}`}>
            <span className="tabular-nums">{event.minute}&apos;</span>
            <span>{eventIcon(event.type)}</span>
            <span>{eventText(event, teamName(event.team_id), event.player_id ? names.get(event.player_id) ?? "Player" : "")}</span>
          </div>)}
          {!filteredEvents.length && <p className="py-12 text-center text-sm text-[var(--color-text-secondary)]">No events for this filter yet.</p>}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-black mb-4">Match report</h2>
        {finished ? <>
          <div className="rounded-xl border border-[var(--color-border)] p-3">
            <StatRow label="Possession" home={`${match.data.stats.home.possession}%`} away={`${match.data.stats.away.possession}%`} />
            <StatRow label="Shots" home={match.data.stats.home.shots} away={match.data.stats.away.shots} />
            <StatRow label="On target" home={match.data.stats.home.shots_on_target} away={match.data.stats.away.shots_on_target} />
            <StatRow label="xG" home={match.data.stats.home.xg} away={match.data.stats.away.xg} />
            <StatRow label="Passes" home={match.data.stats.home.passes_completed} away={match.data.stats.away.passes_completed} />
            <StatRow label="Fouls" home={match.data.stats.home.fouls} away={match.data.stats.away.fouls} />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{matchSummary(match.data.stats.home, match.data.stats.away, homeName, awayName)}</p>
          <h3 className="font-black mt-6 mb-2">Player ratings</h3>
          <table className="w-full text-sm"><tbody>{[...match.data.stats.players].sort((a, b) => b.rating - a.rating).map((player) =>
            <tr key={player.player_id} className="border-b border-[var(--color-border)]/50">
              <td className="py-2">{names.get(player.player_id) ?? "Player"}</td>
              <td className="text-center">{player.minutes}&apos;</td>
              <td className="text-right font-black">{player.rating.toFixed(2)}</td>
            </tr>)}</tbody></table>
        </> : <p className="py-10 text-center text-sm text-[var(--color-text-secondary)]">Report unlocks at full time.</p>}
      </section>
    </div>
  </div></SportsShell>;
}
