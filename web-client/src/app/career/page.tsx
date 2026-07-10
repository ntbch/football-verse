"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { SportsShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useAdvanceDay, useCareer, useCareerSaves, useCreateCareer, useNextSeason, usePlayFixture, useSquad, useStandings } from "./_api";
import type { Formation, LineupSlot, Player, PlayerRole, Position, Tactic } from "./_types";

const FORMATIONS: Record<Formation, Position[]> = {
  "4-3-3": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "RW", "ST"],
  "4-4-2": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
  "3-5-2": ["GK", "CB", "CB", "CB", "LWB", "CM", "CM", "CM", "RWB", "ST", "ST"],
  "4-2-3-1": ["GK", "LB", "CB", "CB", "RB", "DM", "DM", "LW", "AM", "RW", "ST"],
};

const ROLES: Partial<Record<Position, PlayerRole[]>> = {
  GK: ["GOALKEEPER"], LB: ["FULL_BACK", "WING_BACK"], RB: ["FULL_BACK", "WING_BACK"],
  LWB: ["WING_BACK"], RWB: ["WING_BACK"], CB: ["CENTRAL_DEFENDER"],
  DM: ["BALL_WINNER", "CENTRAL_MIDFIELDER"], CM: ["CENTRAL_MIDFIELDER", "BALL_WINNER", "ADVANCED_PLAYMAKER"],
  AM: ["ADVANCED_PLAYMAKER"], LM: ["WINGER"], RM: ["WINGER"], LW: ["WINGER", "INSIDE_FORWARD"],
  RW: ["WINGER", "INSIDE_FORWARD"], ST: ["POACHER", "TARGET_FORWARD", "PRESSING_FORWARD"],
};

const DEFAULT_TACTIC: Tactic = {
  mentality: "BALANCED", tempo: "NORMAL", width: "NORMAL", passing_style: "MIXED",
  pressing: "STANDARD", defensive_line: "STANDARD", transition: "BALANCED", time_wasting: "OFF",
};

const overall = (player: Player) => Math.round(Object.values(player.attributes).reduce((sum, value) => sum + value, 0) /
  Math.max(1, Object.keys(player.attributes).length));
const label = (player: Player) =>
  `${player.name} · ${player.primary_position} · OVR ${overall(player)} · Fit ${Math.round(player.fitness)} · Form ${Math.round(player.form)}${player.availability === "AVAILABLE" ? "" : ` · ${player.availability}`}`;

function Instruction({ label, value, values, onChange }: {
  label: string; value: string; values: string[]; onChange: (value: string) => void;
}) {
  return <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-wider">
    {label}
    <select className="input !py-2 !text-xs" value={value} onChange={(event) => onChange(event.target.value)}>
      {values.map((option) => <option key={option}>{option}</option>)}
    </select>
  </label>;
}

export default function CareerPage() {
  const auth = useAuthStore((state) => state.auth);
  const saves = useCareerSaves(Boolean(auth));
  const create = useCreateCareer();
  const [saveId, setSaveId] = useState("");
  const [name, setName] = useState("My Career");
  const [formation, setFormation] = useState<Formation>("4-3-3");
  const [slots, setSlots] = useState<LineupSlot[]>([]);
  const [bench, setBench] = useState<string[]>([]);
  const [tactic, setTactic] = useState<Tactic>(DEFAULT_TACTIC);

  useEffect(() => {
    if (!saveId && saves.data?.[0]) setSaveId(saves.data[0].id);
  }, [saveId, saves.data]);

  const career = useCareer(saveId);
  const fixture = career.data?.fixtures.find((item) =>
    item.status === "SCHEDULED" && item.matchDate <= career.data.save.gameDate);
  const nextFixture = career.data?.fixtures.find((item) => item.status === "SCHEDULED");
  const squad = useSquad(saveId, fixture?.homeClubId ?? "");
  const play = usePlayFixture(saveId, fixture?.id ?? "");
  const advance = useAdvanceDay(saveId);
  const nextSeason = useNextSeason(saveId);
  const standings = useStandings(saveId);
  const seasonFinished = career.data?.save.status === "SEASON_FINISHED";

  useEffect(() => {
    if (!squad.data?.length) return;
    const unused = squad.data.filter((player) => player.availability === "AVAILABLE");
    setSlots(FORMATIONS[formation].map((position) => {
      const index = Math.max(0, unused.findIndex((player) => player.primary_position === position));
      const [player] = unused.splice(index, 1);
      return { player_id: player.id, position, role: ROLES[position]?.[0] ?? "CENTRAL_MIDFIELDER" };
    }));
    setBench(unused.slice(0, 7).map((player) => player.id));
  }, [formation, squad.data]);

  const validLineup = useMemo(() => {
    const starterIds = slots.map((slot) => slot.player_id);
    const unavailable = new Set(squad.data?.filter((player) => player.availability !== "AVAILABLE").map((player) => player.id));
    return starterIds.length === 11 && new Set(starterIds).size === 11
      && bench.every((id) => !starterIds.includes(id))
      && [...starterIds, ...bench].every((id) => !unavailable.has(id));
  }, [bench, slots, squad.data]);

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), { onSuccess: (created) => setSaveId(created.id) });
  };

  if (!auth) return <SportsShell><div className="card p-8 text-center">
    <p className="mb-4">Log in to start a Career.</p><Link className="btn btn-primary" href="/login">Login</Link>
  </div></SportsShell>;

  return <SportsShell><div className="flex flex-col gap-5">
    <header><p className="eyebrow">Football Manager Lite</p><h1 className="text-3xl font-black font-serif">Career</h1></header>

    <section className="card p-4 flex flex-col md:flex-row gap-3">
      <form onSubmit={submitCreate} className="flex flex-1 gap-2">
        <input className="input flex-1" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} aria-label="Career name" />
        <button className="btn btn-primary" disabled={create.isPending}>Create</button>
      </form>
      <select className="input md:w-64" value={saveId} onChange={(event) => setSaveId(event.target.value)} aria-label="Career save">
        <option value="">Select Career</option>
        {saves.data?.map((save) => <option key={save.id} value={save.id}>{save.name}</option>)}
      </select>
    </section>

    {(saves.isLoading || career.isLoading || squad.isLoading || standings.isLoading) && <LoadingBlock label="Loading Career" />}
    {(saves.error || career.error || squad.error || standings.error) && <ErrorBlock message="Could not load Career data." />}

    {career.data && <section className="card p-4 flex items-center justify-between gap-3">
      <div><span className="text-xs text-[var(--color-text-secondary)]">Season</span><strong className="block">{career.data.save.seasonNumber}</strong></div>
      <div><span className="text-xs text-[var(--color-text-secondary)]">Career date</span><strong className="block">{career.data.save.gameDate}</strong></div>
      {seasonFinished ? <button className="btn btn-primary" disabled={nextSeason.isPending} onClick={() => nextSeason.mutate()}>
        {nextSeason.isPending ? "Starting..." : "Start next season"}
      </button> : <button className="btn btn-secondary" disabled={advance.isPending || !nextFixture} onClick={() => advance.mutate()}>
        {advance.isPending ? "Advancing..." : "Advance day"}
      </button>}
    </section>}

    {career.data?.seasonSummary && <section className="card p-5 text-center">
      <p className="eyebrow">Season {career.data.seasonSummary.seasonNumber} champion</p>
      <h2 className="text-2xl font-black font-serif">{career.data.seasonSummary.championClubName}</h2>
    </section>}

    {standings.data && <section className="card p-5 overflow-x-auto">
      <h2 className="font-black mb-3">League table</h2>
      <table className="w-full text-sm text-center"><thead className="text-[10px] uppercase text-[var(--color-text-secondary)]"><tr>
        <th className="text-left py-2">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>
      </tr></thead><tbody>{standings.data.map((club, index) => <tr key={club.clubId} className="border-t border-[var(--color-border)]/50">
        <td className="text-left py-2 font-semibold">{index + 1}. {club.clubName}</td><td>{club.played}</td><td>{club.wins}</td><td>{club.draws}</td><td>{club.losses}</td><td>{club.goalDifference}</td><td className="font-black">{club.points}</td>
      </tr>)}</tbody></table>
    </section>}

    {!!career.data?.history?.length && <section className="card p-5">
      <h2 className="font-black mb-3">History</h2>
      <div className="divide-y divide-[var(--color-border)]">
        {career.data.history.map((record) => <div key={record.seasonNumber} className="py-2 flex items-center justify-between">
          <span>Season {record.seasonNumber}</span><strong>{record.championClubName}</strong>
        </div>)}
      </div>
    </section>}

    {career.data && !seasonFinished && !fixture && nextFixture && <section className="card p-5 text-center">
      <p>Next fixture: <strong>{nextFixture.homeClubName} vs {nextFixture.awayClubName}</strong> on {nextFixture.matchDate}.</p>
      <p className="text-sm text-[var(--color-text-secondary)]">Advance the Career date to prepare the match.</p>
    </section>}

    {fixture && squad.data && <>
      <section className="card p-5 flex items-center justify-between gap-4">
        <div><span className="text-xs text-[var(--color-text-secondary)]">{fixture.matchDate}</span>
          <h2 className="text-xl font-black">{fixture.homeClubName} vs {fixture.awayClubName}</h2></div>
        <span className="badge">{fixture.status}</span>
      </section>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <section className="card p-5">
          <label className="block text-xs font-black uppercase mb-3">Formation
            <select className="input ml-3" value={formation} onChange={(event) => setFormation(event.target.value as Formation)}>
              {Object.keys(FORMATIONS).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="divide-y divide-[var(--color-border)]">
            {slots.map((slot, index) => <div key={`${slot.position}-${index}`} className="grid grid-cols-[3rem_1fr_1fr] gap-2 py-2 items-center">
              <strong className="text-xs">{slot.position}</strong>
              <select className="input !py-2 !text-xs" value={slot.player_id} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, player_id: event.target.value } : item))}>
                {squad.data.map((player) => <option key={player.id} value={player.id} disabled={player.availability !== "AVAILABLE"}>
                  {label(player)}
                </option>)}
              </select>
              <select className="input !py-2 !text-xs" value={slot.role} onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value as PlayerRole } : item))}>
                {ROLES[slot.position]?.map((role) => <option key={role}>{role}</option>)}
              </select>
            </div>)}
          </div>
          <label className="block text-xs font-black uppercase mt-4 mb-2">Bench
            <select multiple className="input mt-2 min-h-32 w-full" value={bench} onChange={(event) =>
              setBench(Array.from(event.currentTarget.selectedOptions).map((option) => option.value).slice(0, 7))}>
              {squad.data.filter((player) => !slots.some((slot) => slot.player_id === player.id)).map((player) =>
                <option key={player.id} value={player.id} disabled={player.availability !== "AVAILABLE"}>{label(player)}</option>)}
            </select>
          </label>
          {!validLineup && <p className="text-xs text-red-500 mt-3">Pick 11 unique available starters and up to 7 bench players.</p>}
        </section>

        <section className="card p-5 flex flex-col gap-4">
          <h2 className="font-black">Team instructions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Instruction label="Mentality" value={tactic.mentality} values={["DEFENSIVE", "CAUTIOUS", "BALANCED", "POSITIVE", "ATTACKING"]} onChange={(value) => setTactic({ ...tactic, mentality: value as Tactic["mentality"] })} />
            <Instruction label="Tempo" value={tactic.tempo} values={["SLOW", "NORMAL", "FAST"]} onChange={(value) => setTactic({ ...tactic, tempo: value as Tactic["tempo"] })} />
            <Instruction label="Width" value={tactic.width} values={["NARROW", "NORMAL", "WIDE"]} onChange={(value) => setTactic({ ...tactic, width: value as Tactic["width"] })} />
            <Instruction label="Passing" value={tactic.passing_style} values={["SHORT", "MIXED", "DIRECT"]} onChange={(value) => setTactic({ ...tactic, passing_style: value as Tactic["passing_style"] })} />
            <Instruction label="Pressing" value={tactic.pressing} values={["LOW", "STANDARD", "HIGH"]} onChange={(value) => setTactic({ ...tactic, pressing: value as Tactic["pressing"] })} />
            <Instruction label="Defensive line" value={tactic.defensive_line} values={["LOW", "STANDARD", "HIGH"]} onChange={(value) => setTactic({ ...tactic, defensive_line: value as Tactic["defensive_line"] })} />
            <Instruction label="Transition" value={tactic.transition} values={["HOLD_SHAPE", "BALANCED", "COUNTER"]} onChange={(value) => setTactic({ ...tactic, transition: value as Tactic["transition"] })} />
            <Instruction label="Time wasting" value={tactic.time_wasting} values={["OFF", "MODERATE", "HIGH"]} onChange={(value) => setTactic({ ...tactic, time_wasting: value as Tactic["time_wasting"] })} />
          </div>
          <button className="btn btn-primary w-full" disabled={!validLineup || play.isPending} onClick={() => play.mutate({
            seed: Date.now(), homeLineup: { formation, starters: slots, bench }, homeTactic: tactic,
          })}>{play.isPending ? "Simulating..." : "Play fixture"}</button>
          {play.error && <ErrorBlock message="Lineup or tactics were rejected." />}
          {play.data && <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
            <strong>{play.data.result.home_score}–{play.data.result.away_score}</strong>
            <p className="text-xs mt-1">Match saved: {play.data.matchId}</p>
            <Link className="btn btn-secondary mt-3 inline-block" href={`/matches?saveId=${saveId}&matchId=${play.data.matchId}`}>Open Match Centre</Link>
          </div>}
        </section>
      </div>
    </>}
  </div></SportsShell>;
}
