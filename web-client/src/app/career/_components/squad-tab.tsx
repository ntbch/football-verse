import type { Player, PlayerAnalysis } from "../_types";
import type { SubTab } from "../_navigation";
import { overall } from "../_format";

const DEPTH_GROUPS: [string, string[]][] = [
  ["Goalkeepers", ["GK"]], ["Centre backs", ["CB"]], ["Full / wing backs", ["LB", "RB", "LWB", "RWB"]],
  ["Defensive midfield", ["DM"]], ["Central / attacking midfield", ["CM", "AM"]],
  ["Wide players", ["LM", "RM", "LW", "RW"]], ["Strikers", ["ST"]],
];

export function SquadTab({ subTab, squad, analysis, compareIds, onSelect, onList, onCompareChange }: {
  subTab: SubTab | "";
  squad?: Player[];
  analysis?: PlayerAnalysis[];
  compareIds: string[];
  onSelect: (player: Player) => void;
  onList: (playerId: string) => void;
  onCompareChange: (index: number, playerId: string) => void;
}) {
  return <section className="squad-workspace"><div className="card career-data-card overflow-x-auto">
    <header className="squad-toolbar"><div><p className="eyebrow">First team</p><h2>Squad</h2></div><span>{squad?.length ?? 0} players · {squad?.filter((player) => player.availability !== "AVAILABLE").length ?? 0} unavailable</span></header>
    {subTab === "list" && <table className="career-data-table"><thead><tr><th>Player</th><th>Position</th><th>Rating</th><th>Availability</th><th>Action</th></tr></thead><tbody>{squad?.map((player) => <tr key={player.id}>
      <td className="py-2 font-semibold"><button className="career-text-link" onClick={() => onSelect(player)}>{player.name}</button></td><td>{player.primary_position}</td><td>OVR {overall(player)}</td><td>{player.availability}</td>
      <td className="text-right"><button className="btn btn-secondary !py-2 !px-3" onClick={() => onList(player.id)}>List</button></td>
    </tr>)}</tbody></table>}
    {subTab === "depth" && <div className="depth-chart">{DEPTH_GROUPS.map(([group, positions]) => <section key={group}><h3>{group}</h3>{squad?.filter((player) => positions.includes(player.primary_position) || player.secondary_positions.some((position) => positions.includes(position))).sort((a, b) => (analysis?.find((item) => item.playerId === b.id)?.score ?? overall(b)) - (analysis?.find((item) => item.playerId === a.id)?.score ?? overall(a)) || a.name.localeCompare(b.name)).map((player, index) => { const insight = analysis?.find((item) => item.playerId === player.id); return <button key={player.id} title={insight?.reason} onClick={() => onSelect(player)}><b>{index + 1}</b><span>{player.name}<small>{insight?.reason ?? player.primary_position}</small></span><strong>{insight?.score ?? overall(player)}</strong></button>; })}</section>)}</div>}
    {subTab === "compare" && <div className="player-compare">
      <p className="text-sm text-[var(--color-text-secondary)]">Choose two players to compare.</p>
      <div className="grid md:grid-cols-2 gap-3">{[0, 1].map((index) => <select key={index} className="input" value={compareIds[index] ?? ""} onChange={(event) => onCompareChange(index, event.target.value)}><option value="">Player {index + 1}</option>{squad?.filter((player) => player.id === compareIds[index] || !compareIds.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select>)}</div>
      {compareIds.length === 2 && compareIds.every(Boolean) && <div className="compare-grid">{Array.from(new Set(compareIds.flatMap((id) => Object.keys(squad?.find((player) => player.id === id)?.attributes ?? {})))).sort().map((attribute) => <div key={attribute}><span>{attribute.replaceAll("_", " ")}</span>{compareIds.map((id) => <b key={id}>{squad?.find((player) => player.id === id)?.attributes[attribute] ?? 0}</b>)}</div>)}</div>}
    </div>}
  </div></section>;
}
