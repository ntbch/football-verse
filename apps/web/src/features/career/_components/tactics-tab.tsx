import type { Dispatch, SetStateAction } from "react";
import type { Formation, LineupSlot, MatchSessionSnapshot, Player, Tactic } from "../_types";
import type { SubTab } from "../_navigation";
import { FORMATIONS } from "../_formations";
import { TACTIC_PRESETS, type TacticPreset } from "../_tactics";
import { overall } from "../_format";
import { ErrorBlock } from "@/shared/components/state-blocks";
import { TacticsBoard } from "./tactics-board";

export function TacticsTab({ subTab, squad, fixtureTitle, formation, formationError, slots, bench, tactic,
  validLineup, dirty, savePending, saveSuccess, saveError, startPending, startError, activeSession,
  onFormationChange, onSlotsChange, onBenchChange, onTacticChange, onSelectPlayer, onSave, onResume, onStart }: {
  subTab: SubTab | "";
  squad?: Player[];
  fixtureTitle?: string;
  formation: Formation;
  formationError: string;
  slots: LineupSlot[];
  bench: string[];
  tactic: Tactic;
  validLineup: boolean;
  dirty: boolean;
  savePending: boolean;
  saveSuccess: boolean;
  saveError: boolean;
  startPending: boolean;
  startError: boolean;
  activeSession?: MatchSessionSnapshot | null;
  onFormationChange: (formation: Formation) => void;
  onSlotsChange: Dispatch<SetStateAction<LineupSlot[]>>;
  onBenchChange: Dispatch<SetStateAction<string[]>>;
  onTacticChange: (tactic: Tactic) => void;
  onSelectPlayer: (player: Player) => void;
  onSave: () => void;
  onResume: () => void;
  onStart: () => void;
}) {
  if (!squad) return <section className="card p-8 text-center text-sm text-[var(--color-text-secondary)]">No squad data available.</section>;
  return <div className="career-tactics-workspace">
    {subTab === "starting-xi" && <section className="card career-panel career-tactics-pitch-panel">
      <header className="career-section-heading"><div><p className="eyebrow">Team shape</p><h2>{fixtureTitle ?? "First-team tactical setup"}</h2></div>
        <label>Formation<select className="input" value={formation} onChange={(event) => onFormationChange(event.target.value as Formation)}>{Object.keys(FORMATIONS).map((item) => <option key={item}>{item}</option>)}</select></label></header>
      {formationError && <p className="text-xs text-red-500 mb-3" role="alert">{formationError}</p>}
      <TacticsBoard slots={slots} bench={bench} players={squad} onChange={onSlotsChange} onBenchChange={onBenchChange} onInspect={onSelectPlayer} />
    </section>}

    {subTab === "instructions" && <section className="card career-panel career-instructions-panel">
      <header className="career-section-heading"><div><p className="eyebrow">Game model</p><h2>Team instructions</h2></div></header>
      <Instruction label="Preset" value={Object.entries(TACTIC_PRESETS).find(([, value]) => Object.entries(value).every(([key, setting]) => tactic[key as keyof Tactic] === setting))?.[0] ?? "CUSTOM"}
        values={["CUSTOM", ...Object.keys(TACTIC_PRESETS)]} onChange={(value) => value !== "CUSTOM" && onTacticChange(TACTIC_PRESETS[value as TacticPreset])} />
      <div className="career-instructions-grid">
        <Instruction label="Mentality" value={tactic.mentality} values={["DEFENSIVE", "CAUTIOUS", "BALANCED", "POSITIVE", "ATTACKING"]} onChange={(value) => onTacticChange({ ...tactic, mentality: value as Tactic["mentality"] })} />
        <Instruction label="Tempo" value={tactic.tempo} values={["SLOW", "NORMAL", "FAST"]} onChange={(value) => onTacticChange({ ...tactic, tempo: value as Tactic["tempo"] })} />
        <Instruction label="Width" value={tactic.width} values={["NARROW", "NORMAL", "WIDE"]} onChange={(value) => onTacticChange({ ...tactic, width: value as Tactic["width"] })} />
        <Instruction label="Passing" value={tactic.passing_style} values={["SHORT", "MIXED", "DIRECT"]} onChange={(value) => onTacticChange({ ...tactic, passing_style: value as Tactic["passing_style"] })} />
        <Instruction label="Pressing" value={tactic.pressing} values={["LOW", "STANDARD", "HIGH"]} onChange={(value) => onTacticChange({ ...tactic, pressing: value as Tactic["pressing"] })} />
        <Instruction label="Defensive line" value={tactic.defensive_line} values={["LOW", "STANDARD", "HIGH"]} onChange={(value) => onTacticChange({ ...tactic, defensive_line: value as Tactic["defensive_line"] })} />
        <Instruction label="Transition" value={tactic.transition} values={["HOLD_SHAPE", "BALANCED", "COUNTER"]} onChange={(value) => onTacticChange({ ...tactic, transition: value as Tactic["transition"] })} />
        <Instruction label="Time wasting" value={tactic.time_wasting} values={["OFF", "MODERATE", "HIGH"]} onChange={(value) => onTacticChange({ ...tactic, time_wasting: value as Tactic["time_wasting"] })} />
      </div>
    </section>}

    {subTab === "match-squad" && <section className="card career-panel career-match-squad">
      <header className="career-section-heading"><div><p className="eyebrow">Selection</p><h2>Match squad</h2></div><span>{slots.length} starters · {bench.length}/7 substitutes</span></header>
      <div className="career-selected-xi">{slots.map((slot) => { const player = squad.find((item) => item.id === slot.player_id); return <button key={`${slot.position}-${slot.player_id}`} onClick={() => player && onSelectPlayer(player)}><span>{slot.position}</span><strong>{player?.name ?? "Empty slot"}</strong><small>{slot.role.replaceAll("_", " ")} · {slot.duty}</small></button>; })}</div>
      <div className="tactics-squad-picker"><div>{squad.filter((player) => !slots.some((slot) => slot.player_id === player.id)).map((player) => { const selected = bench.includes(player.id); return <button key={player.id} type="button" className={selected ? "is-selected" : ""} disabled={player.availability !== "AVAILABLE" || (!selected && bench.length >= 7)} aria-pressed={selected} onClick={() => onBenchChange((current) => selected ? current.filter((id) => id !== player.id) : [...current, player.id])}>
        <span>{player.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><strong>{player.name}<small>{player.primary_position} · OVR {overall(player)} · FIT {Math.round(player.fitness)}</small></strong><b>{selected ? "Selected" : "+ Add"}</b>
      </button>; })}</div></div>
      {!validLineup && <p className="text-xs text-red-500 mt-3">Pick 11 unique available starters and up to 7 bench players.</p>}
    </section>}

    <footer className="card career-tactics-actions">
      <div><span className={`career-live-dot ${dirty ? "is-dirty" : ""}`} /><p><strong>{dirty ? "Unsaved match plan" : validLineup ? "Match plan ready" : "Lineup needs attention"}</strong><small>{formation} · {tactic.mentality.replaceAll("_", " ")}</small></p></div>
      <button className="btn btn-secondary" disabled={!validLineup || savePending} onClick={onSave}>{savePending ? "Saving..." : saveSuccess ? "Saved" : "Save tactics"}</button>
      {activeSession ? <button className="btn btn-primary" onClick={onResume}>Resume Matchday</button>
        : fixtureTitle ? <button className="btn btn-primary" disabled={!validLineup || savePending || startPending} onClick={onStart}>{startPending ? "Starting..." : "Start Matchday"}</button>
        : <span className="career-tactics-hint">Match controls appear when a fixture is due.</span>}
    </footer>
    {saveError && <ErrorBlock message="Tactics could not be saved." />}
    {startError && <ErrorBlock message="Matchday could not be started. Resume the active match or try again." />}
  </div>;
}

function Instruction({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <fieldset className="instruction-control"><legend>{label}</legend><div>{values.map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>{option.replaceAll("_", " ")}</button>)}</div></fieldset>;
}
