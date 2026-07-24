import type { SeasonSummary } from "../_types";

export function HistoryTab({ history }: { history: SeasonSummary[] }) {
  return <section className="card career-data-card">
    <header className="career-section-heading"><div><p className="eyebrow">Honours</p><h2>History</h2></div></header>
    {history.length ? <div className="career-history-timeline">
      {history.map((record) => <div key={record.seasonNumber}>
        <span>S{record.seasonNumber}</span><p><small>Season {record.seasonNumber}</small><strong>{record.championClubName}</strong></p>
      </div>)}
    </div> : <p className="text-sm text-[var(--color-text-secondary)]">No completed seasons yet.</p>}
  </section>;
}
