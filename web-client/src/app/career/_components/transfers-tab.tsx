import type { FormEvent } from "react";
import type { PageResult, TransferMarketPage, TransferOffer } from "../_types";
import type { SubTab } from "../_navigation";
import { money } from "../_format";
import { ErrorBlock } from "@/shared/components/state-blocks";
import { Pagination } from "./pagination";

export function TransfersTab({ subTab, market, offers, managedClubId, query, scoutPending, offerPending,
  actionError, onQueryChange, onSubmit, onClear, onPage, onSelect, onScout, onBid, onTerms, onComplete }: {
  subTab: SubTab | "";
  market: TransferMarketPage;
  offers?: PageResult<TransferOffer>;
  managedClubId: string;
  query: string;
  scoutPending: boolean;
  offerPending: boolean;
  actionError: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClear: () => void;
  onPage: (page: number) => void;
  onSelect: (playerId: string) => void;
  onScout: (playerId: string) => void;
  onBid: (playerId: string, fee: number) => void;
  onTerms: (offer: TransferOffer) => void;
  onComplete: (offerId: string) => void;
}) {
  return <section className="career-tab-stack">
    <div className="card career-budget-strip">
      <div><p className="eyebrow">Transfer budget</p><strong>{money.format(market.balance)}</strong></div>
      <div><p className="eyebrow">Wage limit</p><strong>{money.format(market.wageBudget)}</strong></div>
      <span className="badge">Window {market.windowOpen ? "OPEN" : "CLOSED"}</span>
    </div>
    {subTab === "market" && <div className="card career-data-card overflow-x-auto"><header className="career-section-heading"><div><p className="eyebrow">Recruitment</p><h2>Market</h2></div><span>{market.totalItems} players</span></header>
      <SearchForm label="Player or club" placeholder="Search market" query={query} onChange={onQueryChange} onSubmit={onSubmit} onClear={onClear} />
      <table className="career-data-table"><thead><tr><th>Player</th><th>Club</th><th>Scouting</th><th>Rating</th><th>Value</th><th>Action</th></tr></thead><tbody>{market.items.map((player) => <tr key={player.playerId}>
        <td className="py-2 font-semibold"><button className="career-text-link" onClick={() => onSelect(player.playerId)}>{player.playerName}</button> · {player.position} · {player.age}</td><td>{player.clubName}</td>
        <td>{player.knowledge} {player.scoutingProgress}%</td><td>OVR {player.overallMin}–{player.overallMax}</td><td>{money.format(player.valueMin)}–{money.format(player.valueMax)}</td>
        <td className="text-right whitespace-nowrap"><button className="btn btn-secondary !py-2 !px-3 mr-2" disabled={scoutPending || player.scoutingProgress >= 100} onClick={() => onScout(player.playerId)}>Scout</button>
          <button className="btn btn-primary !py-2 !px-3" disabled={offerPending} onClick={() => onBid(player.playerId, Math.round(player.valueMax))}>Bid</button></td>
      </tr>)}</tbody></table>
      {!market.items.length && <p className="career-empty-state">No players match this search.</p>}
      <Pagination page={market.page} totalPages={market.totalPages} totalItems={market.totalItems} onChange={onPage} />
    </div>}
    {subTab === "negotiations" && <div className="card career-data-card overflow-x-auto"><header className="career-section-heading"><div><p className="eyebrow">Deal room</p><h2>Negotiations</h2></div><span>{offers?.totalItems ?? 0} deals</span></header>
      <SearchForm label="Player" placeholder="Search negotiations" query={query} onChange={onQueryChange} onSubmit={onSubmit} onClear={onClear} />
      <table className="career-data-table"><thead><tr><th>Player</th><th>Clubs</th><th>Fee</th><th>Status</th><th>Action</th></tr></thead><tbody>{offers?.items.map((offer) => <tr key={offer.id}>
        <td className="py-2 font-semibold">{offer.playerName}</td><td>{offer.buyerClubName} → {offer.sellerClubName}</td><td>{money.format(offer.fee)}</td><td>{offer.status} · R{offer.negotiationRound}</td>
        <td className="text-right">{["CLUB_ACCEPTED", "TERMS_COUNTERED"].includes(offer.status) && offer.buyerClubId === managedClubId && <button className="btn btn-secondary !py-2 !px-3" onClick={() => onTerms(offer)}>Offer terms</button>}
          {offer.status === "TERMS" && offer.buyerClubId === managedClubId && <button className="btn btn-primary !py-2 !px-3" disabled={!market.windowOpen} onClick={() => onComplete(offer.id)}>Complete</button>}</td>
      </tr>)}</tbody></table>
      {offers && <Pagination page={offers.page} totalPages={offers.totalPages} totalItems={offers.totalItems} onChange={onPage} />}
    </div>}
    {actionError && <ErrorBlock message="Transfer action failed." />}
  </section>;
}

function SearchForm({ label, placeholder, query, onChange, onSubmit, onClear }: {
  label: string; placeholder: string; query: string; onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void; onClear: () => void;
}) {
  return <form className="career-filterbar" onSubmit={onSubmit}><label><span>{label}</span><input className="input" value={query} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{query.trim().length === 1 && <small>Type 1 more character</small>}</label><button className="btn btn-secondary" disabled={query.trim().length === 1}>Search</button>{query && <button type="button" className="career-filter-clear" onClick={onClear}>Clear</button>}</form>;
}
