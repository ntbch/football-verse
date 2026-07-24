import type { Player } from "../_types";
import type { BoardDrag, BoardDrop, BoardSelection } from "./tactics-board-types";

export function TacticsDugout({ bench, players, source, onChoose, onDrag, onDrop, onDragEnd, onInspect }: {
  bench: string[]; players: Map<string, Player>; source: BoardSelection | null; onChoose: (target: BoardSelection) => void;
  onDrag: BoardDrag; onDrop: BoardDrop; onDragEnd: () => void; onInspect?: (player: Player) => void;
}) {
  return <div className="tactics-dugout" role="group" aria-label="Substitutes">
    <header><span>Dugout</span><strong>{bench.length} substitutes</strong><small>Choose a player, then choose a destination</small></header>
    <div>{bench.map((id, index) => {
      const player = players.get(id);
      const selected = source?.kind === "bench" && source.index === index;
      return <button key={id} type="button" draggable aria-pressed={selected} className={`tactics-bench-player ${selected ? "is-selected" : ""}`}
        aria-label={`Bench ${index + 1}: ${player?.name ?? "Empty"}. ${source == null ? "Select to move" : "Select as destination"}`}
        onClick={() => onChoose({ kind: "bench", index })} onDoubleClick={() => player && onInspect?.(player)}
        onDragStart={(event) => onDrag(event, { kind: "bench", index })} onDragEnd={onDragEnd}
        onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, { kind: "bench", index })}>
        <span>{player?.primary_position ?? "–"}</span><strong>{player?.name ?? "Empty"}</strong><small>FIT {Math.round(player?.fitness ?? 0)}</small>
      </button>;
    })}</div>
  </div>;
}
