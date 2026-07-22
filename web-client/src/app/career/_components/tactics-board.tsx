"use client";

import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import type { LineupSlot, Player } from "../_types";
import { coordinates } from "../_formations";
import type { BoardSelection } from "./tactics-board-types";
import { TacticsPitch } from "./tactics-pitch";
import { TacticsDugout } from "./tactics-dugout";
import { TacticsSlotControls } from "./tactics-slot-controls";

export function TacticsBoard({ slots, bench, players, onChange, onBenchChange, onInspect, inactivePlayerIds = [] }: {
  slots: LineupSlot[];
  bench: string[];
  players: Player[];
  onChange: (slots: LineupSlot[]) => void;
  onBenchChange: (bench: string[]) => void;
  onInspect?: (player: Player) => void;
  inactivePlayerIds?: string[];
}) {
  const [source, setSource] = useState<BoardSelection | null>(null);
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const byId = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const inactive = useMemo(() => new Set(inactivePlayerIds), [inactivePlayerIds]);
  const points = coordinates(slots.map((slot) => slot.position));

  const playerId = ({ kind, index }: BoardSelection) => kind === "starter"
    ? inactive.has(slots[index]?.player_id) ? undefined : slots[index]?.player_id
    : bench[index];
  const playerName = (selection: BoardSelection) => {
    const id = playerId(selection);
    return id == null ? "Empty slot" : byId.get(id)?.name ?? "Empty slot";
  };
  const destination = ({ kind, index }: BoardSelection) => kind === "starter" ? slots[index]?.position ?? "starter" : `bench ${index + 1}`;
  const same = (first: BoardSelection, second: BoardSelection) => first.kind === second.kind && first.index === second.index;
  const swap = (from: BoardSelection, to: BoardSelection) => {
    if (same(from, to)) {
      setSource(null);
      setAnnouncement("Move cancelled.");
      return;
    }
    const fromId = playerId(from);
    const toId = playerId(to);
    if (fromId == null || toId == null) return setSource(null);

    if (from.kind === "starter" && to.kind === "starter") {
      const next = [...slots];
      [next[from.index], next[to.index]] = [
        { ...next[from.index], player_id: toId },
        { ...next[to.index], player_id: fromId },
      ];
      onChange(next);
      setActive(to.index);
    } else if (from.kind === "bench" && to.kind === "bench") {
      const next = [...bench];
      [next[from.index], next[to.index]] = [toId, fromId];
      onBenchChange(next);
    } else {
      const starter = from.kind === "starter" ? from : to;
      const substitute = from.kind === "bench" ? from : to;
      onChange(slots.map((slot, index) => index === starter.index ? { ...slot, player_id: bench[substitute.index] } : slot));
      onBenchChange(bench.map((id, index) => index === substitute.index ? slots[starter.index].player_id : id));
      setActive(starter.index);
    }
    setAnnouncement(`${playerName(from)} moved to ${destination(to)}; ${playerName(to)} moved to ${destination(from)}.`);
    setSource(null);
  };

  const choose = (target: BoardSelection) => {
    if (source) return swap(source, target);
    setSource(target);
    if (target.kind === "starter") setActive(target.index);
    setAnnouncement(`${playerName(target)} selected. Choose a destination or select the same player to cancel.`);
  };
  const drag = (event: DragEvent, target: BoardSelection) => {
    event.dataTransfer.setData("text/plain", `${target.kind}:${target.index}`);
    setSource(target);
    if (target.kind === "starter") setActive(target.index);
  };
  const drop = (event: DragEvent, target: BoardSelection) => {
    event.preventDefault();
    const match = /^(starter|bench):(\d+)$/.exec(event.dataTransfer.getData("text/plain"));
    if (match) swap({ kind: match[1] as BoardSelection["kind"], index: Number(match[2]) }, target);
  };
  const update = (patch: Partial<Pick<LineupSlot, "role" | "duty">>) =>
    onChange(slots.map((slot, index) => index === active ? { ...slot, ...patch } : slot));
  const selected = slots[active];

  return <div className="tactics-editor">
    <TacticsPitch slots={slots} points={points} players={byId} inactive={inactive} source={source} active={active}
      onChoose={choose} onDrag={drag} onDrop={drop} onDragEnd={() => setSource(null)} onInspect={onInspect} />
    <TacticsDugout bench={bench} players={byId} source={source} onChoose={choose} onDrag={drag} onDrop={drop}
      onDragEnd={() => setSource(null)} onInspect={onInspect} />
    <p className="sr-only" aria-live="polite">{announcement}</p>
    {selected && <TacticsSlotControls slot={selected} player={byId.get(selected.player_id)} onUpdate={update} onInspect={onInspect} />}
  </div>;
}
