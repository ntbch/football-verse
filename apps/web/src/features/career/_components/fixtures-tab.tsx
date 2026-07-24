import type { FormEvent } from "react";
import type { CareerFixture } from "../_types";
import type { SubTab } from "../_navigation";

export function FixturesTab({ fixtures, total, subTab, query, onQueryChange, onSubmit, onClear, onSelect }: {
  fixtures: CareerFixture[];
  total: number;
  subTab: SubTab | "";
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClear: () => void;
  onSelect: (id: string) => void;
}) {
  return <section className="card career-data-card overflow-x-auto">
    <header className="career-section-heading"><div><p className="eyebrow">Season schedule</p><h2>Fixtures</h2></div><span>{total} matches</span></header>
    <form className="career-filterbar" onSubmit={onSubmit}><label><span>Opponent</span><input className="input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search club" />{query.trim().length === 1 && <small>Type 1 more character</small>}</label><button className="btn btn-secondary" disabled={query.trim().length === 1}>Search</button>{query && <button type="button" className="career-filter-clear" onClick={onClear}>Clear</button>}</form>
    <table className="career-data-table"><thead><tr><th>Round</th><th>Date</th><th>Fixture</th><th>Status</th></tr></thead><tbody>{fixtures.map((item) => <tr key={item.id}>
      <td className="py-2">MD {item.matchdayNumber}</td><td>{item.matchDate}</td><td><button className="career-text-link" onClick={() => onSelect(item.id)}>{item.homeClubName} vs {item.awayClubName}</button></td><td className="text-right">{item.status}</td>
    </tr>)}</tbody></table>
    {!fixtures.length && <p className="career-empty-state">No {subTab === "results" ? "results" : "scheduled fixtures"} yet.</p>}
  </section>;
}
