import type { CareerFixture, TransferCandidate } from "../_types";
import { money } from "../_format";
import { DetailPanel } from "./detail-panel";

export function FixtureDetail({ fixture, due, onClose, onPrepare }: {
  fixture: CareerFixture; due: boolean; onClose: () => void; onPrepare: () => void;
}) {
  return <DetailPanel eyebrow="Fixture" title={`${fixture.homeClubName} vs ${fixture.awayClubName}`} subtitle={`Matchday ${fixture.matchdayNumber} · ${fixture.matchDate}`} onClose={onClose}>
    <dl className="career-detail-stats"><div><dt>Status</dt><dd>{fixture.status}</dd></div><div><dt>Competition</dt><dd>League</dd></div></dl>
    {due && <button className="btn btn-primary w-full" onClick={onPrepare}>Prepare match</button>}
  </DetailPanel>;
}

export function MarketDetail({ player, scoutPending, offerPending, onClose, onScout, onBid }: {
  player: TransferCandidate; scoutPending: boolean; offerPending: boolean; onClose: () => void;
  onScout: () => void; onBid: () => void;
}) {
  return <DetailPanel eyebrow="Recruitment" title={player.playerName} subtitle={`${player.position} · ${player.age} · ${player.clubName}`} onClose={onClose}>
    <dl className="career-detail-stats"><div><dt>Knowledge</dt><dd>{player.knowledge} · {player.scoutingProgress}%</dd></div><div><dt>Rating</dt><dd>{player.overallMin}–{player.overallMax}</dd></div><div><dt>Value</dt><dd>{money.format(player.valueMin)}–{money.format(player.valueMax)}</dd></div></dl>
    <button className="btn btn-secondary w-full" disabled={scoutPending || player.scoutingProgress >= 100} onClick={onScout}>Scout player</button>
    <button className="btn btn-primary w-full" disabled={offerPending} onClick={onBid}>Submit bid</button>
  </DetailPanel>;
}
