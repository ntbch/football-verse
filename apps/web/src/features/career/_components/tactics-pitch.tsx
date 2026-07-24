import type { Player, LineupSlot } from "../_types";
import type { BoardDrag, BoardDrop, BoardSelection } from "./tactics-board-types";

export function TacticsPitch({ slots, points, players, inactive, source, active, onChoose, onDrag, onDrop, onDragEnd, onInspect }: {
  slots: LineupSlot[]; points: { x: number; y: number }[]; players: Map<string, Player>; inactive: Set<string>;
  source: BoardSelection | null; active: number; onChoose: (target: BoardSelection) => void; onDrag: BoardDrag;
  onDrop: BoardDrop; onDragEnd: () => void; onInspect?: (player: Player) => void;
}) {
  return <div className="tactics-pitch" role="group" aria-label="Tactics board">
    <div className="tactics-centre-circle" />
    {slots.map((slot, index) => {
      const unavailable = inactive.has(slot.player_id);
      const player = unavailable ? undefined : players.get(slot.player_id);
      const profile = players.get(slot.player_id);
      return <button key={`${slot.position}-${index}`} type="button" draggable={!unavailable}
        className={`tactics-player ${unavailable ? "is-inactive" : ""} ${source?.kind === "starter" && source.index === index ? "is-source" : ""} ${active === index ? "is-active" : ""}`}
        style={{ left: `${points[index].x}%`, top: `${points[index].y}%` }} aria-pressed={source?.kind === "starter" && source.index === index}
        aria-label={`${slot.position}: ${unavailable ? "Unavailable after card or unresolved injury" : player?.name ?? "Empty"}. ${source == null ? "Select to move" : "Select as destination"}`}
        onClick={() => !unavailable && onChoose({ kind: "starter", index })} onDoubleClick={() => profile && onInspect?.(profile)}
        onDragStart={(event) => onDrag(event, { kind: "starter", index })} onDragEnd={onDragEnd}
        onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, { kind: "starter", index })}>
        <span className="tactics-position">{slot.position}</span>
        <span className="tactics-shirt" aria-hidden="true">{player?.name.split(" ").map((part) => part[0]).join("").slice(0, 2) ?? "–"}</span>
        <strong>{player?.name.split(" ").at(-1) ?? (unavailable ? "Unavailable" : "Empty")}</strong>
        <small className={`duty-${slot.duty.toLowerCase()}`}>{unavailable ? "Card / injury" : `${slot.role.replaceAll("_", " ")} / ${slot.duty}`}</small>
      </button>;
    })}
  </div>;
}
