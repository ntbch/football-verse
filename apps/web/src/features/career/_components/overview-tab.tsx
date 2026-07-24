import type { FormEvent } from "react";
import type { CareerDetails, CareerFixture, ClubStanding, ManagerDashboard, TrainingFocus } from "../_types";

const TRAINING: TrainingFocus[] = ["BALANCED", "FITNESS", "ATTACK", "DEFENSE", "MORALE"];

export function OverviewTab({ career, fixture, nextFixture, seasonFinished, clubMark, clubName, nextOpponent,
  managedClubId, manager, standings, rename, renamePending, deletePending, advancePending, nextSeasonPending,
  onRenameChange, onRename, onDelete, onTraining, onAdvance, onNextSeason, onOpenTab }: {
  career: CareerDetails;
  fixture?: CareerFixture;
  nextFixture?: CareerFixture;
  seasonFinished: boolean;
  clubMark: string;
  clubName: string;
  nextOpponent: string;
  managedClubId: string;
  manager?: ManagerDashboard;
  standings?: ClubStanding[];
  rename: string;
  renamePending: boolean;
  deletePending: boolean;
  advancePending: boolean;
  nextSeasonPending: boolean;
  onRenameChange: (value: string) => void;
  onRename: (event: FormEvent) => void;
  onDelete: () => void;
  onTraining: (focus: TrainingFocus) => void;
  onAdvance: () => void;
  onNextSeason: () => void;
  onOpenTab: (tab: "fixtures" | "tactics") => void;
}) {
  return <section className="career-portal">
    <article className="card career-tile career-tile-action">
      <div className="career-action-status"><span className="career-live-dot" />{seasonFinished ? "Season review" : fixture ? "Matchday ready" : "Manager inbox clear"}</div>
      <div className="career-action-body"><span className="career-action-mark">{clubMark}</span><div><p className="eyebrow">Your next decision</p>
        <h2>{seasonFinished ? "Season complete" : fixture ? `${clubName} vs ${nextOpponent}` : "Move the world forward"}</h2>
        <p>{seasonFinished ? "Review the season and begin the next one." : fixture ? "Confirm your XI, roles and match plan before kick-off." : `Advance from ${career.save.gameDate} to the next football event.`}</p></div></div>
      {seasonFinished ? <button className="btn btn-primary" disabled={nextSeasonPending} onClick={onNextSeason}>Start next season</button>
        : fixture ? <button className="btn btn-primary" onClick={() => onOpenTab("tactics")}>Prepare match</button>
        : <button className="btn btn-primary" disabled={advancePending || (!nextFixture && career.save.status !== "UNEMPLOYED")} onClick={onAdvance}>Advance day</button>}
    </article>
    <article className="card career-tile">
      <p className="eyebrow">Next fixture</p>
      {nextFixture ? <><h2>{nextFixture.homeClubName}<br />vs {nextFixture.awayClubName}</h2><p>{nextFixture.matchDate} · Matchday {nextFixture.matchdayNumber}</p><button className="career-text-link" onClick={() => onOpenTab("fixtures")}>View schedule →</button></> : <h2>No fixture scheduled</h2>}
    </article>
    <article className="card career-tile career-tile-calendar">
      <p className="eyebrow">Calendar</p>
      <div className="career-mini-fixtures">{career.fixtures.filter((item) => item.homeClubId === managedClubId || item.awayClubId === managedClubId).slice(0, 5).map((item) => <button key={item.id} onClick={() => onOpenTab("fixtures")}><span>{item.matchDate}</span><strong>{item.homeClubName} · {item.awayClubName}</strong><small>{item.status}</small></button>)}</div>
    </article>
    <article className="card career-tile">
      <p className="eyebrow">Club situation</p><h2>{manager?.pressure ?? "STABLE"}</h2><p>Board confidence {manager?.boardPressure ?? 0}%</p>
      <dl className="career-stats"><div><dt>Position</dt><dd>{(standings?.findIndex((club) => club.clubId === managedClubId) ?? -1) + 1 || "—"}</dd></div><div><dt>Status</dt><dd>{career.save.status}</dd></div></dl>
    </article>
    <details className="card career-tile career-tile-settings">
      <summary><span>Career settings</span><small>Rename, training and save management</small></summary>
      <div className="career-settings-body"><form onSubmit={onRename} className="flex flex-wrap gap-2">
        <input className="input flex-1 min-w-52" maxLength={100} value={rename} onChange={(event) => onRenameChange(event.target.value)} aria-label="Rename Career" />
        <button className="btn btn-secondary" disabled={renamePending}>Rename</button>
        <button type="button" className="btn btn-secondary" disabled={deletePending} onClick={onDelete}>Delete</button>
      </form>
      <div className="flex flex-wrap items-center gap-3"><label className="text-xs font-black uppercase">Training
        <select className="input ml-2 !py-2 !text-xs" value={career.save.trainingFocus} onChange={(event) => onTraining(event.target.value as TrainingFocus)}>{TRAINING.map((item) => <option key={item}>{item}</option>)}</select>
      </label></div>
      {career.seasonSummary && <div className="rounded-xl bg-emerald-500/10 p-4 text-center"><p className="eyebrow">Season {career.seasonSummary.seasonNumber} champion</p><h2 className="text-2xl font-black">{career.seasonSummary.championClubName}</h2></div>}
      </div>
    </details>
  </section>;
}
