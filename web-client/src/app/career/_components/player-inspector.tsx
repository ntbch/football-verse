"use client";

import type { Player, PlayerSeasonStats } from "../_types";
import { DetailPanel } from "./detail-panel";

export function PlayerInspector({ player, stats, onClose, onCompare }: {
  player: Player;
  stats?: PlayerSeasonStats;
  onClose: () => void;
  onCompare?: () => void;
}) {
  const overall = Math.round(Object.values(player.attributes).reduce((sum, value) => sum + value, 0) / Math.max(1, Object.keys(player.attributes).length));
  return <DetailPanel eyebrow="Player profile" title={player.name}
    subtitle={`${player.age} · ${player.primary_position}${player.secondary_positions.length ? ` · ${player.secondary_positions.join("/")}` : ""}`}
    onClose={onClose}>
    <div className="player-vitals"><strong>{overall}<small>OVR</small></strong><span>Fitness <b>{Math.round(player.fitness)}</b></span><span>Form <b>{Math.round(player.form)}</b></span><span>Morale <b>{Math.round(player.morale)}</b></span></div>
    <section><h3>Attributes</h3><div className="player-attributes">{Object.entries(player.attributes).sort((a, b) => b[1] - a[1]).map(([name, value]) => <div key={name}><span>{name.replaceAll("_", " ")}</span><b>{value}</b></div>)}</div></section>
    <section><h3>Season</h3>{stats ? <div className="player-season"><span>{stats.appearances} apps</span><span>{stats.goals} goals</span><span>{stats.assists} assists</span><span>{stats.averageRating.toFixed(2)} avg</span></div> : <p className="text-sm text-[var(--color-text-secondary)]">No appearances yet.</p>}</section>
    {onCompare && <button className="btn btn-secondary w-full" onClick={onCompare}>Compare player</button>}
  </DetailPanel>;
}
