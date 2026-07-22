import type { FormEvent } from "react";
import type { ClubStanding, PageResult, PlayerSeasonStats } from "../_types";
import type { SubTab } from "../_navigation";
import { Pagination } from "./pagination";

export function TableTab({ subTab, standings, stats, managedClubId, query, onQueryChange, onSubmit, onClear, onPage }: {
  subTab: SubTab | "";
  standings?: ClubStanding[];
  stats?: PageResult<PlayerSeasonStats>;
  managedClubId: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClear: () => void;
  onPage: (page: number) => void;
}) {
  return <section className="career-table-grid">
    {subTab === "standings" && standings && <section className="card career-data-card overflow-x-auto">
      <header className="career-section-heading"><div><p className="eyebrow">Competition</p><h2>League table</h2></div></header>
      <table className="career-data-table text-center"><thead><tr><th className="text-left py-2">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>{standings.map((club, index) => <tr key={club.clubId} className={club.clubId === managedClubId ? "is-managed" : ""}>
        <td className="text-left py-2 font-semibold">{index + 1}. {club.clubName}{club.clubId === managedClubId && <span className="career-you-label">You</span>}</td><td>{club.played}</td><td>{club.wins}</td><td>{club.draws}</td><td>{club.losses}</td><td>{club.goalDifference}</td><td className="font-black">{club.points}</td>
      </tr>)}</tbody></table>
    </section>}
    {subTab === "player-stats" && stats && <section className="card career-data-card overflow-x-auto">
      <header className="career-section-heading"><div><p className="eyebrow">Leaders</p><h2>Player stats</h2></div></header>
      <form className="career-filterbar" onSubmit={onSubmit}><label><span>Player or club</span><input className="input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search statistics" />{query.trim().length === 1 && <small>Type 1 more character</small>}</label><button className="btn btn-secondary" disabled={query.trim().length === 1}>Search</button>{query && <button type="button" className="career-filter-clear" onClick={onClear}>Clear</button>}</form>
      <table className="career-data-table text-center"><thead><tr><th className="text-left py-2">Player</th><th>Club</th><th>Apps</th><th>Min</th><th>G</th><th>A</th><th>Avg</th></tr></thead><tbody>{stats.items.map((player) => <tr key={player.playerId}>
        <td className="text-left py-2 font-semibold">{player.playerName}</td><td>{player.clubName}</td><td>{player.appearances}</td><td>{player.minutes}</td><td>{player.goals}</td><td>{player.assists}</td><td>{player.averageRating.toFixed(2)}</td>
      </tr>)}</tbody></table>
      <Pagination page={stats.page} totalPages={stats.totalPages} totalItems={stats.totalItems} onChange={onPage} />
      {!stats.items.length && <p className="career-empty-state">No player statistics match this search.</p>}
    </section>}
  </section>;
}
