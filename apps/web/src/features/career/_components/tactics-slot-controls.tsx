import type { Duty, LineupSlot, Player, PlayerRole } from "../_types";
import { dutiesFor, ROLES } from "../_formations";

export function TacticsSlotControls({ slot, player, onUpdate, onInspect }: {
  slot: LineupSlot; player?: Player; onUpdate: (patch: Partial<Pick<LineupSlot, "role" | "duty">>) => void;
  onInspect?: (player: Player) => void;
}) {
  return <div className="tactics-slot-controls">
    <div><strong>{player?.name ?? "Empty slot"}</strong><span>{slot.position}</span></div>
    <label>Role<select className="input" value={slot.role} onChange={(event) => { const role = event.target.value as PlayerRole; onUpdate({ role, duty: dutiesFor(role).includes(slot.duty) ? slot.duty : dutiesFor(role)[0] }); }}>{ROLES[slot.position]?.map((role) => <option key={role}>{role}</option>)}</select></label>
    <label>Duty<select className="input" value={slot.duty} onChange={(event) => onUpdate({ duty: event.target.value as Duty })}>{dutiesFor(slot.role).map((duty) => <option key={duty}>{duty}</option>)}</select></label>
    {player && <button type="button" className="btn btn-secondary" onClick={() => onInspect?.(player)}>Profile</button>}
  </div>;
}
