"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PublicShell } from "@/shared/components/page-shell";
import { ErrorBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useLeaderboard, useMatchCentre } from "./api";
import { LeaderboardPanel } from "./components";
import type { MatchCentreFixture, SourceAvailability, StandingRow } from "./types";

type FixtureTab = "upcoming" | "live" | "results";

const tabLabel: Record<FixtureTab, string> = { upcoming: "Upcoming", live: "Live", results: "Results" };

function fixtureTab(status: string): FixtureTab {
  if (status.toLowerCase() === "live") return "live";
  if (status.toLowerCase() === "result") return "results";
  return "upcoming";
}

function localZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatTime(kickoff: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(kickoff));
}

function fullDayLabel(kickoff: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone }).format(new Date(kickoff));
}

function scoreOrTime(fixture: MatchCentreFixture, timeZone: string) {
  if (fixture.homeScore !== null && fixture.awayScore !== null) return `${fixture.homeScore}-${fixture.awayScore}`;
  return formatTime(fixture.kickoff, timeZone);
}

function TrophyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]">
      <path d="M8 21h8m-4-4v4M6 4h12a2 2 0 0 1 2 2v2a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1m12-6h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 2v4M8 2v4M3 10h18M9 14h.01M15 14h.01M9 18h.01M15 18h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]">
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M6 20v-4M12 20v-10M18 20v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FixturesSkeleton() {
  return (
    <div aria-label="Loading fixtures" className="space-y-3 p-1" role="status">
      <span className="sr-only">Loading fixtures</span>
      {[0, 1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="grid min-h-[3.5rem] grid-cols-[1fr_5rem_1fr_1.5rem] items-center gap-4 rounded-2xl border border-[var(--color-border)] px-4 py-3 animate-pulse bg-[var(--color-surface-subtle)]/40">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-[var(--color-surface-muted)] shrink-0" />
            <div className="h-4 w-32 rounded bg-[var(--color-surface-muted)]" />
          </div>
          <div className="mx-auto h-4 w-12 rounded bg-[var(--color-surface-muted)]" />
          <div className="flex items-center justify-end gap-3">
            <div className="h-4 w-32 rounded bg-[var(--color-surface-muted)]" />
            <div className="h-7 w-7 rounded-full bg-[var(--color-surface-muted)] shrink-0" />
          </div>
          <div className="ml-auto h-4 w-4 rounded bg-[var(--color-surface-muted)]" />
        </div>
      ))}
    </div>
  );
}

function FullStandingsDialog({
  open,
  standings,
  availability,
  titleId,
  closeButtonRef,
  onClose,
}: {
  open: boolean;
  standings: StandingRow[];
  availability?: SourceAvailability;
  titleId: string;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  if (!open) return null;
  const seasonYear = Number(availability?.season);
  const seasonLabel = availability?.season && Number.isFinite(seasonYear) ? ` ${seasonYear}/${seasonYear + 1}` : "";

  return createPortal(
    /* Portal to body — escapes DOM stacking context to sit ABOVE navbar */
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-12 pb-4 px-4 sm:px-8" role="presentation">
      {/* Blurred dimmed backdrop — covers navbar and everything */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Centered card */}
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] shadow-2xl"
        role="dialog"
        style={{ maxHeight: "calc(100vh - 5rem)" }}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-subtle)] shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] block mb-0.5">
              PREMIER LEAGUE{seasonLabel}
            </span>
            <h2 className="font-serif font-black text-2xl tracking-tight text-[var(--color-text-primary)] m-0" id={titleId}>
              Standings
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Fixed table header */}
        <div className="px-5 sm:px-6 pt-2 bg-[var(--color-background-surface)] shrink-0">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="text-left text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              <tr>
                <th className="w-10 px-3 py-3 text-center border-b border-[var(--color-border)]">#</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">Team</th>
                <th className="w-12 px-3 py-3 text-right font-black border-b border-[var(--color-border)]">P</th>
                <th className="w-12 px-3 py-3 text-right font-black border-b border-[var(--color-border)]">W</th>
                <th className="w-12 px-3 py-3 text-right font-black border-b border-[var(--color-border)]">D</th>
                <th className="w-12 px-3 py-3 text-right font-black border-b border-[var(--color-border)]">L</th>
                <th className="w-14 px-3 py-3 text-right font-black border-b border-[var(--color-border)]">GF</th>
                <th className="w-14 px-3 py-3 text-right font-black border-b border-[var(--color-border)]">GA</th>
                <th className="w-14 px-3 py-3 text-right font-black border-b border-[var(--color-border)]">GD</th>
                <th className="w-14 px-3 py-3 text-right font-black border-b border-[var(--color-border)] text-[var(--color-accent)]">PTS</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable table body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 sm:px-6 pb-4">
          <table className="w-full text-sm border-separate border-spacing-0">
            <tbody className="divide-y divide-[var(--color-border)]/40">
              {standings.map((team) => (
                <tr className="group transition-colors hover:bg-[var(--color-surface-hover)]" key={team.teamId}>
                  <td className="w-10 px-3 py-3 text-center font-black text-[var(--color-text-secondary)]">
                    {team.rank}
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--color-text-primary)]">
                    <div className="flex items-center gap-3">
                      {team.teamLogo && <img alt="" className="h-6 w-6 shrink-0 object-contain" src={team.teamLogo} />}
                      <span className="truncate">{team.teamName}</span>
                    </div>
                  </td>
                  <td className="w-12 px-3 py-3 text-right font-medium tabular-nums text-[var(--color-text-secondary)]">{team.played ?? 0}</td>
                  <td className="w-12 px-3 py-3 text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{team.wins ?? 0}</td>
                  <td className="w-12 px-3 py-3 text-right font-medium tabular-nums text-[var(--color-text-secondary)]">{team.draws ?? 0}</td>
                  <td className="w-12 px-3 py-3 text-right font-medium tabular-nums text-rose-600 dark:text-rose-400">{team.losses ?? 0}</td>
                  <td className="w-14 px-3 py-3 text-right font-medium tabular-nums text-[var(--color-text-secondary)]">{team.goalsFor ?? 0}</td>
                  <td className="w-14 px-3 py-3 text-right font-medium tabular-nums text-[var(--color-text-secondary)]">{team.goalsAgainst ?? 0}</td>
                  <td className="w-14 px-3 py-3 text-right font-medium tabular-nums text-[var(--color-text-secondary)]">{team.goalDifference ?? 0}</td>
                  <td className="w-14 px-3 py-3 text-right font-black tabular-nums text-[var(--color-accent)] text-base">{team.points ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>,
    document.body
  );
}

export default function PredictionsPage() {
  const searchParams = useSearchParams();
  const auth = useAuthStore((state) => state.auth);
  const [league, setLeague] = useState(() => searchParams.get("league") ?? "premier-league");
  const [round, setRound] = useState<string | null>(() => searchParams.get("round"));
  const [tab, setTab] = useState<FixtureTab>(() => {
    const requested = searchParams.get("tab");
    return requested === "live" || requested === "results" ? requested : "upcoming";
  });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"weekly" | "all">("weekly");
  const [showAllStandings, setShowAllStandings] = useState(false);
  const allStandingsButtonRef = useRef<HTMLButtonElement>(null);
  const dialogCloseButtonRef = useRef<HTMLButtonElement>(null);
  const dialogWasOpen = useRef(false);

  const { data: centre, isLoading, error, refetch } = useMatchCentre(league, round ?? undefined);
  const { data: leaderboard, isLoading: leaderboardLoading, error: leaderboardError } = useLeaderboard(leaderboardPeriod);
  const timezone = useMemo(localZone, []);
  const rounds = centre?.rounds ?? [];
  const fixturesAvailability = centre?.fixturesAvailability;
  const standingsAvailability = centre?.standingsAvailability;

  useEffect(() => {
    if (rounds.length && (!round || !rounds.includes(round))) setRound(centre?.currentRound && rounds.includes(centre.currentRound) ? centre.currentRound : rounds[0]);
  }, [centre?.currentRound, round, rounds]);

  useEffect(() => {
    const focusFixture = searchParams.get("focus");
    if (!focusFixture || isLoading) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(`fixture-${focusFixture}`)?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, searchParams]);

  useEffect(() => {
    if (showAllStandings) {
      dialogWasOpen.current = true;
      const frame = window.requestAnimationFrame(() => dialogCloseButtonRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (dialogWasOpen.current) allStandingsButtonRef.current?.focus();
  }, [showAllStandings]);

  useEffect(() => {
    if (!showAllStandings) return;
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setShowAllStandings(false);
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [showAllStandings]);

  const allFixtures = centre?.fixtures ?? [];
  const fixtures = useMemo(() => allFixtures.filter((fixture) => fixtureTab(fixture.status) === tab), [allFixtures, tab]);

  const tabCounts = useMemo(() => {
    const counts = { upcoming: 0, live: 0, results: 0 };
    allFixtures.forEach((f) => {
      counts[fixtureTab(f.status)] += 1;
    });
    return counts;
  }, [allFixtures]);

  const groupedFixtures = useMemo(() => {
    const groups = new Map<string, MatchCentreFixture[]>();
    fixtures.forEach((fixture) => {
      const label = fullDayLabel(fixture.kickoff, timezone);
      groups.set(label, [...(groups.get(label) ?? []), fixture]);
    });
    return [...groups.entries()];
  }, [fixtures, timezone]);

  const fixtureHref = (fixture: MatchCentreFixture) => {
    const params = new URLSearchParams({ league, tab, from: fixture.fixtureId });
    if (round) params.set("round", round);
    return `/predictions/${encodeURIComponent(fixture.fixtureId)}?${params.toString()}`;
  };

  const fixtureStatusMessage = fixturesAvailability?.state === "PROVIDER_UNAVAILABLE"
    ? "Fixtures are temporarily unavailable from the data provider."
    : fixturesAvailability?.state === "UNSUPPORTED"
      ? "Fixtures are not covered by the selected data source."
      : null;
  const fixtureLiveMessage = isLoading ? "Loading fixtures" : fixtureStatusMessage ?? `${fixtures.length} ${tabLabel[tab].toLowerCase()} fixtures`;
  const standings = centre?.standings ?? [];

  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 animate-fade-in pb-12">
        {/* Prominent Header Controls Banner */}
        <section aria-label="Fixture controls" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 p-2.5 sm:p-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* League Dropdown Pill (Larger) */}
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 z-10 flex items-center">
                <TrophyIcon />
              </span>
              <select
                id="prediction-league"
                value={league}
                onChange={(event) => { setLeague(event.target.value); setRound(null); }}
                className="cursor-pointer appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] pl-10 pr-9 py-2.5 text-sm font-bold text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-all shadow-2xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] min-h-11"
              >
                <option value="premier-league">Premier League</option>
              </select>
              <span className="pointer-events-none absolute right-3 z-10 flex items-center">
                <ChevronDownIcon />
              </span>
            </div>

            {/* Vertical Separator */}
            <div className="hidden h-6 w-px bg-[var(--color-border)] opacity-70 sm:block" />

            {/* Matchday Dropdown Pill (Larger) */}
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3.5 z-10 flex items-center">
                <CalendarIcon />
              </span>
              <select
                id="prediction-round"
                value={round ?? ""}
                onChange={(event) => setRound(event.target.value)}
                disabled={!rounds.length}
                className="cursor-pointer appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] pl-10 pr-9 py-2.5 text-sm font-bold text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-all shadow-2xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-50 min-h-11"
              >
                {!rounds.length && <option>{isLoading ? "Matchday" : "No Matchdays"}</option>}
                {rounds.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 z-10 flex items-center">
                <ChevronDownIcon />
              </span>
            </div>

            {/* Vertical Separator */}
            <div className="hidden h-6 w-px bg-[var(--color-border)] opacity-70 sm:block" />

            {/* Segmented Tab Switcher (Upcoming | Live | Results) - Larger */}
            <div aria-label="Fixture state" className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-1 shadow-2xs" role="tablist">
              {(Object.keys(tabLabel) as FixtureTab[]).map((item) => {
                const isActive = tab === item;
                return (
                  <button
                    aria-selected={isActive}
                    className={`cursor-pointer rounded-lg px-5 py-2 text-sm font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] ${
                      isActive
                        ? "bg-[#c25e38] text-white shadow-xs"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                    key={item}
                    onClick={() => setTab(item)}
                    role="tab"
                    type="button"
                  >
                    {tabLabel[item]}
                  </button>
                );
              })}
            </div>

            {/* Timezone Info on Far Right (Larger) */}
            <div className="ml-auto hidden items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] md:flex pr-2">
              <ClockIcon />
              <span>Times in {timezone}</span>
            </div>
          </div>
        </section>

        {/* Main Content Layout */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Matchday Fixtures Main Column */}
          <section aria-label={`${tabLabel[tab]} fixtures`} className="overflow-hidden">
            <p aria-live="polite" className="sr-only">{fixtureLiveMessage}</p>

            {isLoading ? (
              <FixturesSkeleton />
            ) : error || (fixtureStatusMessage && groupedFixtures.length === 0) ? (
              <div className="p-6 text-center card border border-[var(--color-border)] rounded-2xl">
                <ErrorBlock message={fixtureStatusMessage ?? "Fixtures could not be loaded. Please try again."} />
                {fixtureStatusMessage && (
                  <button className="btn btn-secondary mt-4 min-h-10 px-5 text-xs font-bold uppercase tracking-wider" onClick={() => refetch()} type="button">
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <>
                {fixtureStatusMessage && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-5 py-3 rounded-2xl mb-4">
                    <p className="m-0 text-xs text-[var(--color-text-secondary)]">{fixtureStatusMessage} Showing confirmed fixtures.</p>
                    <button className="text-xs font-bold text-[var(--color-accent)] hover:underline" onClick={() => refetch()} type="button">
                      Retry
                    </button>
                  </div>
                )}

                {groupedFixtures.length === 0 ? (
                  <div className="px-6 py-20 text-center card border border-[var(--color-border)] rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)] block mb-2">
                      NO MATCHES FOUND
                    </span>
                    <p className="m-0 text-sm font-semibold text-[var(--color-text-secondary)]">
                      {tab === "live"
                        ? "No matches are live right now."
                        : tab === "results"
                        ? "No match results for this Matchday yet."
                        : "No upcoming fixtures for this Matchday."}
                    </p>
                  </div>
                ) : (
                  groupedFixtures.map(([day, items]) => (
                    <div key={day} className="mb-6 last:mb-0">
                      {/* Date Header matching screenshot serif font */}
                      <h2 className="font-serif font-black text-xl sm:text-2xl text-[var(--color-text-primary)] mb-3.5 tracking-tight">
                        {day}
                      </h2>

                      {/* Match Item Cards List matching screenshot */}
                      <div className="flex flex-col gap-2.5">
                        {items.map((fixture) => {
                          const closed = fixture.status !== "upcoming" || new Date(fixture.kickoff).getTime() <= Date.now();
                          const ariaStatus = closed ? "Predictions closed" : fixture.userPrediction ? "Prediction saved" : "Prediction open";

                          return (
                            <Link
                              aria-label={`${fixture.homeTeam} versus ${fixture.awayTeam}. ${ariaStatus}. View match.`}
                              className="group grid grid-cols-[minmax(0,1fr)_4.75rem_minmax(0,1fr)_auto] items-center gap-3 sm:gap-5 px-4 py-3 sm:px-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)]/50 transition-all shadow-2xs cursor-pointer"
                              href={fixtureHref(fixture)}
                              id={`fixture-${fixture.fixtureId}`}
                              key={fixture.fixtureId}
                            >
                              {/* Home Team (Logo + Name on Left) */}
                              <div className="flex min-w-0 items-center gap-3">
                                {fixture.homeLogo ? (
                                  <img alt="" className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 object-contain" src={fixture.homeLogo} />
                                ) : (
                                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[var(--color-surface-muted)] shrink-0" />
                                )}
                                <span className="truncate text-xs sm:text-sm font-extrabold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                                  {fixture.homeTeam}
                                </span>
                              </div>

                              {/* Kickoff Time / Live / Score Center */}
                              <div className="text-center">
                                <span className={`text-xs sm:text-sm font-black tabular-nums tracking-tight ${fixture.status === "live" ? "text-red-500 animate-pulse" : "text-[var(--color-text-primary)]"}`}>
                                  {scoreOrTime(fixture, timezone)}
                                </span>
                                {fixture.status === "live" && (
                                  <span className="block text-[8.5px] font-black uppercase tracking-wider text-red-500 bg-red-500/10 rounded px-1 mt-0.5">
                                    LIVE
                                  </span>
                                )}
                              </div>

                              {/* Away Team (Name + Logo on Right) */}
                              <div className="flex min-w-0 items-center justify-end gap-3 text-right">
                                <span className="truncate text-xs sm:text-sm font-extrabold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                                  {fixture.awayTeam}
                                </span>
                                {fixture.awayLogo ? (
                                  <img alt="" className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 object-contain" src={fixture.awayLogo} />
                                ) : (
                                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-[var(--color-surface-muted)] shrink-0" />
                                )}
                              </div>

                              {/* Far Right Analytics Bar Chart Icon */}
                              <div className="flex items-center justify-end pl-1">
                                <span className="text-[var(--color-text-secondary)] opacity-50 group-hover:opacity-100 group-hover:text-[var(--color-accent)] transition-all">
                                  <BarChartIcon />
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </section>

          {/* Right Sidebar (Standings & Leaderboard) */}
          <aside className="flex flex-col gap-6">
            {/* Premier League Table Preview */}
            <section className="card overflow-hidden border border-[var(--color-border)] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4 bg-[var(--color-surface-subtle)]/70">
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--color-accent)] block mb-0.5">
                    LEAGUE TABLE
                  </span>
                  <h2 className="font-serif font-black text-lg text-[var(--color-text-primary)] m-0">
                    Standings
                  </h2>
                </div>
                <button
                  aria-haspopup="dialog"
                  className="px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-[var(--color-accent)] transition-all hover:bg-[var(--color-accent-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  disabled={!standings.length || standingsAvailability?.state === "PROVIDER_UNAVAILABLE"}
                  onClick={() => setShowAllStandings(true)}
                  ref={allStandingsButtonRef}
                  type="button"
                >
                  All standings
                </button>
              </div>

              {standingsAvailability?.state === "PROVIDER_UNAVAILABLE" ? (
                <div className="p-5 text-xs text-[var(--color-text-secondary)] font-medium">Standings are temporarily unavailable.</div>
              ) : standings.length === 0 ? (
                <div className="p-5 text-xs text-[var(--color-text-secondary)] font-medium">No standings available.</div>
              ) : (
                <ol className="m-0 list-none divide-y divide-[var(--color-border)]/60 p-0">
                  {standings.slice(0, 5).map((team) => (
                    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem] items-center gap-2.5 px-5 py-3 text-xs group transition-colors hover:bg-[var(--color-surface-hover)]" key={team.teamId}>
                      <span className="font-black tabular-nums text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)]">
                        {team.rank}
                      </span>
                      <div className="flex min-w-0 items-center gap-2.5">
                        {team.teamLogo && <img alt="" className="h-5 w-5 shrink-0 object-contain" src={team.teamLogo} />}
                        <span className="truncate font-bold text-[var(--color-text-primary)]">{team.teamName}</span>
                      </div>
                      <span className="text-right font-black tabular-nums text-[var(--color-accent)] text-sm">{team.points}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Leaderboard Section */}
            <div className="card p-5 border border-[var(--color-border)] rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-[var(--color-border)]/60 pb-3">
                <div>
                  <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-[var(--color-accent)] block mb-0.5">
                    COMMUNITY RANKINGS
                  </span>
                  <h2 className="font-serif font-black text-lg text-[var(--color-text-primary)] m-0">
                    Leaderboard
                  </h2>
                </div>
                <button
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] transition-colors cursor-pointer"
                  onClick={() => setLeaderboardPeriod(leaderboardPeriod === "weekly" ? "all" : "weekly")}
                  type="button"
                >
                  {leaderboardPeriod === "weekly" ? "Weekly" : "All-Time"}
                </button>
              </div>

              <LeaderboardPanel entries={leaderboard} error={leaderboardError} isLoading={leaderboardLoading} />
            </div>
          </aside>
        </div>

        {/* Centered Modal Dialog for All Standings with Soft Backdrop Overlay */}
        <FullStandingsDialog
          availability={standingsAvailability}
          closeButtonRef={dialogCloseButtonRef}
          onClose={() => setShowAllStandings(false)}
          open={showAllStandings}
          standings={standings}
          titleId="full-standings-title"
        />
      </div>
    </PublicShell>
  );
}
