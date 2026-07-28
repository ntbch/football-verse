"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { PublicShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useMatchDetail } from "./api";
import { MatchAnalytics, PickForm } from "./components";
import type { LineupTeam, MatchCentreFixture } from "./types";

type DetailTab = "overview" | "lineups" | "analysis";

function countdown(kickoff: string, now: number) {
  const ms = new Date(kickoff).getTime() - now;
  if (ms <= 0) return "Predictions closed";
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  return days ? `Closes in ${days}d ${hours}h` : `Closes in ${hours}h ${minutes % 60}m`;
}

function formatKickoff(kickoff: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(kickoff));
}

function score(fixture: MatchCentreFixture) {
  return fixture.homeScore === null || fixture.awayScore === null ? "VS" : `${fixture.homeScore}-${fixture.awayScore}`;
}

function statusLabel(fixture: MatchCentreFixture) {
  if (fixture.status === "live") return "Live";
  if (fixture.status === "result") return "Final";
  return "Upcoming";
}

function LineupList({ team }: { team: LineupTeam }) {
  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-4">
      <header className="mb-3 flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
        {team.teamLogo && <img alt="" className="h-7 w-7 object-contain" src={team.teamLogo} />}
        <div className="min-w-0">
          <h3 className="m-0 truncate text-sm font-black text-[var(--color-text-primary)]">{team.teamName}</h3>
          {team.formation && <p className="m-0 text-xs text-[var(--color-text-secondary)]">{team.formation}</p>}
        </div>
      </header>
      <ol className="m-0 list-none divide-y divide-[var(--color-border)] p-0">
        {team.startingXI.map((player) => (
          <li className="flex items-center gap-2 py-2 text-sm" key={player.id || player.name}>
            <span className="w-6 text-center text-xs font-black text-[var(--color-accent)]">{player.number ?? "-"}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-[var(--color-text-primary)]">{player.name}</span>
            {player.position && <span className="text-xs font-bold text-[var(--color-text-secondary)]">{player.position}</span>}
          </li>
        ))}
      </ol>
      {team.substitutes.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <p className="m-0 mb-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">Substitutes</p>
          <p className="m-0 text-sm leading-6 text-[var(--color-text-secondary)]">{team.substitutes.map((player) => player.name).join(" / ")}</p>
        </div>
      )}
    </article>
  );
}

export default function PredictionDetailPage() {
  const params = useParams<{ fixtureId: string }>();
  const searchParams = useSearchParams();
  const fixtureId = params.fixtureId;
  const league = searchParams.get("league") ?? "premier-league";
  const round = searchParams.get("round");
  const fromTab = searchParams.get("tab") ?? "upcoming";
  const { data, isLoading, error, refetch } = useMatchDetail(fixtureId, league);
  const auth = useAuthStore((state) => state.auth);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [now, setNow] = useState(() => Date.now());
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const returnParams = new URLSearchParams({ league, tab: fromTab, focus: fixtureId });
  if (round) returnParams.set("round", round);
  const returnHref = `/predictions?${returnParams.toString()}`;
  const loginHref = `/login?next=${encodeURIComponent(`/predictions/${fixtureId}?${searchParams.toString()}`)}`;

  if (isLoading) return <PublicShell><LoadingBlock label="Loading match" /></PublicShell>;
  if (error || !data) return <PublicShell><ErrorBlock message="This fixture is unavailable. Return to fixtures and try again." /></PublicShell>;

  const fixture = data.fixture;
  const prediction = fixture.userPrediction;

  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 animate-fade-in pb-12">
        <Link className="flex min-h-11 w-fit items-center text-sm font-bold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]" href={returnHref}>
          ← Back to fixtures
        </Link>

        {/* Hero Match Summary Card */}
        <section className="prediction-detail overflow-hidden rounded-[1.6rem] border border-[var(--color-border)] px-4 py-6 sm:px-8 sm:py-8 bg-[var(--color-surface-subtle)]/70 shadow-xs">
          <div className="text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-accent)] block mb-1">
              {fixture.round ?? "MATCHDAY 1"}
            </p>
            <p className="m-0 text-xs sm:text-sm font-semibold text-[var(--color-text-secondary)]">
              {formatKickoff(fixture.kickoff, timezone)}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:gap-6">
            <div className="flex min-w-0 flex-col items-end gap-2 text-right">
              {fixture.homeLogo && <img alt="" className="h-14 w-14 object-contain sm:h-20 sm:w-20" src={fixture.homeLogo} />}
              <h1 className="m-0 text-lg font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">{fixture.homeTeam}</h1>
            </div>
            <div className="text-center">
              <p className="m-0 text-3xl font-black tabular-nums text-[var(--color-text-primary)] sm:text-5xl">{score(fixture)}</p>
              <p className={`m-0 mt-1 text-[10px] font-black uppercase tracking-[0.14em] ${fixture.status === "live" ? "text-red-500 animate-pulse" : "text-[var(--color-text-secondary)]"}`}>
                {statusLabel(fixture)}
              </p>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-2">
              {fixture.awayLogo && <img alt="" className="h-14 w-14 object-contain sm:h-20 sm:w-20" src={fixture.awayLogo} />}
              <h1 className="m-0 text-lg font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">{fixture.awayTeam}</h1>
            </div>
          </div>
        </section>

        {/* Tab Navigation & Content */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="order-2 lg:order-1">
            <div aria-label="Match information" className="grid grid-cols-3 rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/60" role="tablist">
              {(["overview", "lineups", "analysis"] as DetailTab[]).map((item) => (
                <button
                  aria-selected={tab === item}
                  className={`min-h-10 rounded-lg px-2 text-sm font-bold capitalize transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ${
                    tab === item ? "bg-[var(--color-background-surface)] text-[var(--color-text-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                  key={item}
                  onClick={() => setTab(item)}
                  role="tab"
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === "overview" && (
                <section className="card p-5 sm:p-6 border border-[var(--color-border)] rounded-2xl shadow-xs space-y-6">
                  {/* Match Details Grid */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-accent)] mb-3">
                      Match Information
                    </h3>
                    <dl className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-3.5 shadow-2xs">
                        <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Competition</dt>
                        <dd className="m-0 mt-1 text-sm font-extrabold text-[var(--color-text-primary)]">Premier League</dd>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-3.5 shadow-2xs">
                        <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Matchday</dt>
                        <dd className="m-0 mt-1 text-sm font-extrabold text-[var(--color-text-primary)]">{fixture.round ?? "Matchday 1"}</dd>
                      </div>
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-3.5 shadow-2xs sm:col-span-1">
                        <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Kickoff Time</dt>
                        <dd className="m-0 mt-1 text-xs sm:text-sm font-extrabold text-[var(--color-text-primary)]">{formatKickoff(fixture.kickoff, timezone)}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* AI Match Prediction & Win Probability */}
                  {fixture.aiPrediction && (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-accent)] m-0">
                          Win Probability & AI Forecast
                        </h3>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
                          {fixture.aiPrediction.confidence}% Confidence
                        </span>
                      </div>

                      {/* Probability Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-[var(--color-text-primary)]">{fixture.homeTeam} ({fixture.aiPrediction.homePct}%)</span>
                          <span className="text-[var(--color-text-secondary)]">Draw ({fixture.aiPrediction.drawPct}%)</span>
                          <span className="text-[var(--color-text-primary)]">{fixture.awayTeam} ({fixture.aiPrediction.awayPct}%)</span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-border)]/60">
                          <div style={{ width: `${fixture.aiPrediction.homePct}%` }} className="bg-[var(--color-accent)]" title={`${fixture.homeTeam}: ${fixture.aiPrediction.homePct}%`} />
                          <div style={{ width: `${fixture.aiPrediction.drawPct}%` }} className="bg-[var(--color-text-secondary)]/50" title={`Draw: ${fixture.aiPrediction.drawPct}%`} />
                          <div style={{ width: `${fixture.aiPrediction.awayPct}%` }} className="bg-amber-500" title={`${fixture.awayTeam}: ${fixture.aiPrediction.awayPct}%`} />
                        </div>
                      </div>

                      {/* Key Forecast Metrics */}
                      <div className="grid grid-cols-3 gap-3 mt-4 pt-3.5 border-t border-[var(--color-border)]/60 text-center">
                        <div className="p-2.5 rounded-xl bg-[var(--color-background-surface)] border border-[var(--color-border)]/40">
                          <span className="block text-[9.5px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">Predicted Score</span>
                          <span className="text-sm sm:text-base font-black text-[var(--color-accent)]">{fixture.aiPrediction.correctScore ?? "N/A"}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[var(--color-background-surface)] border border-[var(--color-border)]/40">
                          <span className="block text-[9.5px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">O/U 2.5 Goals</span>
                          <span className="text-sm sm:text-base font-black text-[var(--color-text-primary)]">{fixture.aiPrediction.overUnder25}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[var(--color-background-surface)] border border-[var(--color-border)]/40">
                          <span className="block text-[9.5px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">BTTS</span>
                          <span className="text-sm sm:text-base font-black text-[var(--color-text-primary)]">{fixture.aiPrediction.bothTeamsToScore}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User's Prediction Record (If Predicted) */}
                  {prediction && (
                    <div className="rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-muted)]/20 p-4 sm:p-5">
                      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-accent)] mb-2">
                        Your Pick
                      </h3>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[var(--color-text-primary)]">
                        <div>
                          Pick: <span className="text-base font-black text-[var(--color-accent)] ml-1">{prediction.homeScore} - {prediction.awayScore}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          Status: <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[var(--color-accent-muted)] text-[var(--color-accent)]">{prediction.scoringState}</span>
                          {prediction.scoringState === "SCORED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-500">
                              {prediction.points} PTS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {tab === "lineups" && (
                data.lineups.coverage === "PUBLISHED" ? (
                  <section className="card p-5 sm:p-6 border border-[var(--color-border)] rounded-2xl shadow-xs">
                    <div className="grid gap-4 md:grid-cols-2">
                      {data.lineups.teams.map((team) => (
                        <LineupList key={team.teamId || team.teamName} team={team} />
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="card p-6 text-center border border-[var(--color-border)] rounded-2xl">
                    <p className="m-0 text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Lineups are not published yet.</p>
                    <button className="btn btn-secondary text-xs font-bold uppercase tracking-wider" onClick={() => refetch()} type="button">
                      Check again
                    </button>
                  </section>
                )
              )}

              {tab === "analysis" && (
                <section className="card p-5 sm:p-6 border border-[var(--color-border)] rounded-2xl shadow-xs">
                  {fixture.aiPrediction ? (
                    <MatchAnalytics match={fixture} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-10 text-center">
                      <p className="m-0 text-base font-black text-[var(--color-text-primary)]">Analysis unavailable</p>
                      <p className="m-2 text-sm leading-6 text-[var(--color-text-secondary)]">There are not enough completed provider-sourced matches for both teams yet.</p>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
            <section className="card p-5 border border-[var(--color-border)] rounded-2xl shadow-xs">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--color-accent)] block mb-0.5">Your call</span>
                  <h2 className="m-0 font-serif font-black text-2xl text-[var(--color-text-primary)]">Prediction</h2>
                </div>
                <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-[10px] font-bold text-[var(--color-text-secondary)] border border-[var(--color-border)]/50">
                  {countdown(fixture.kickoff, now)}
                </span>
              </div>
              <PickForm auth={auth} loginHref={loginHref} match={fixture} onClosed={() => refetch()} onSuccess={() => refetch()} />
            </section>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
