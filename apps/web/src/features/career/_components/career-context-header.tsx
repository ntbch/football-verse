import type { CareerDetails, CareerFixture } from "../_types";
import type { Tab } from "../_navigation";
import { TABS } from "../_navigation";

export function CareerContextHeader({ tab, career, clubMark, clubName, nextOpponent, nextFixture, mobileOpen,
  continuePending, hasSession, fixtureDue, seasonFinished, dirty, onMobileOpen, onContinue, onExit }: {
  tab: Tab; career?: CareerDetails; clubMark: string; clubName: string; nextOpponent: string;
  nextFixture?: CareerFixture; mobileOpen: boolean; continuePending: boolean; hasSession: boolean;
  fixtureDue: boolean; seasonFinished: boolean; dirty: boolean; onMobileOpen: () => void;
  onContinue: () => void; onExit: () => void;
}) {
  return <header className="career-context-header">
    <button className="career-mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={onMobileOpen}>☰</button>
    <div className="career-context-title"><span className="career-club-mark" aria-hidden="true">{clubMark}</span><div><p>{clubName}</p><h1>{TABS.find((item) => item.id === tab)?.label}</h1></div></div>
    {career && <>
      <div className="career-context-meta"><span>Season {career.save.seasonNumber}</span><strong>{career.save.gameDate}</strong></div>
      <div className="career-next-opponent"><span>Next opponent</span><strong>{nextOpponent}</strong><small>{nextFixture ? `MD ${nextFixture.matchdayNumber} · ${nextFixture.matchDate}` : "Schedule clear"}</small></div>
      {tab !== "overview" && <button className="career-continue" disabled={continuePending} onClick={onContinue}><span>{hasSession ? "Resume match" : fixtureDue ? "Matchday" : seasonFinished ? "New season" : "Continue"}</span><b>›</b></button>}
    </>}
    <button className="career-save-toggle" onClick={() => { if (!dirty || window.confirm("Discard unsaved tactics changes?")) onExit(); }}>Careers <span>↗</span></button>
  </header>;
}
