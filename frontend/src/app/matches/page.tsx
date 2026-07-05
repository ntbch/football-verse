"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { RoundSelect } from "./_components";
import type { MatchStatus } from "./_types";
import type { MatchCentreFixture, AiPredictionSummary } from "@/app/predictions/_types";
import { PickForm, UserPickDisplay, LeaderboardPanel, StatsBadges } from "@/app/predictions/_components";
import { useMatchCentre, usePredictionStats, useLeaderboard } from "@/app/predictions/_api";

type MatchTab = MatchStatus;

const tabs: { value: MatchTab; label: string }[] = [
  { value: "upcoming", label: "Next fixtures" },
  { value: "live", label: "Live" },
  { value: "result", label: "Match history" }
];

const currentStatus = (fixture: MatchCentreFixture): MatchStatus => {
  if (fixture.status === "live") return "live";
  return Date.parse(fixture.kickoff) > Date.now() ? "upcoming" : "result";
};

const formClass = (mark: string) => {
  if (mark === "W") return "bg-[var(--fv-grass)] text-white";
  if (mark === "D") return "bg-[var(--fv-sun)] text-[var(--fv-ink)]";
  return "bg-[var(--fv-clay)] text-white";
};

const ProbabilityBar = ({ ai }: { ai: AiPredictionSummary }) => (
  <div className="grid gap-1 text-xs font-black">
    <div className="grid grid-cols-3 gap-1 text-center">
      <span>H {ai.homePct}%</span>
      <span>D {ai.drawPct}%</span>
      <span>A {ai.awayPct}%</span>
    </div>
    <div className="flex h-2 overflow-hidden border border-[var(--fv-line)]">
      <span className="bg-[var(--fv-grass)]" style={{ width: `${ai.homePct}%` }} />
      <span className="bg-[var(--fv-sun)]" style={{ width: `${ai.drawPct}%` }} />
      <span className="bg-[var(--fv-clay)]" style={{ width: `${ai.awayPct}%` }} />
    </div>
  </div>
);

const PredictionSummary = ({ ai }: {
  ai: AiPredictionSummary;
}) => (
    <div className="mt-5 grid gap-4 border-t border-[var(--fv-line)] pt-4 xl:grid-cols-[1fr_0.85fr]">
      <div className="grid content-start gap-3">
        <p className="text-xs font-black uppercase text-[var(--fv-clay)]">Prediction</p>
        <ProbabilityBar ai={ai} />
        <p className="text-sm font-bold text-[var(--fv-muted)]">{ai.trend}</p>
      </div>

      <div className="grid content-start gap-3">
        <div className="grid gap-2 text-xs font-black uppercase">
          <div className="flex items-center justify-between gap-2">
            <span>Home form</span>
            <span className="flex gap-1">{ai.homeForm.map((mark, index) => <span className={`px-2 py-1 ${formClass(mark)}`} key={`h${mark}-${index}`}>{mark}</span>)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Away form</span>
            <span className="flex gap-1">{ai.awayForm.map((mark, index) => <span className={`px-2 py-1 ${formClass(mark)}`} key={`a${mark}-${index}`}>{mark}</span>)}</span>
          </div>
        </div>
      </div>
    </div>
);

// ponytail: keep old StandingsPanel for backward compat until both pages converge.
const StandingsPanel = ({ error, isLoading, rows }: {
  error?: unknown;
  isLoading?: boolean;
  rows?: { rank: number; teamId: string; teamName: string; teamLogo: string; points: number; played: number }[];
}) => (
  <aside className="panel h-fit p-5">
    <h2 className="display-face text-3xl font-black">Standings</h2>
    {isLoading ? <LoadingBlock label="Loading standings" /> : null}
    {error ? <ErrorBlock message="Could not load standings." /> : null}
    <div className="mt-4 grid gap-2">
      {rows?.length === 0 ? <p>No standings returned.</p> : null}
      {rows?.map((row) => (
        <div className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-2 border-t border-[var(--fv-line)] pt-2 text-sm" key={row.teamId}>
          <span className="font-black">{row.rank}</span>
          <span className="flex items-center gap-2 font-bold">
            {row.teamLogo ? <img alt="" className="h-8 w-8 object-contain" loading="lazy" src={row.teamLogo} /> : null}
            {row.teamName}
          </span>
          <span className="text-[var(--fv-muted)]">{row.played}</span>
          <span className="font-black">{row.points}</span>
        </div>
      ))}
    </div>
  </aside>
);

export default function MatchesPage() {
  const leagueSlug = "premier-league";
  const [status, setStatus] = useState<MatchTab>("upcoming");
  const [round, setRound] = useState("");
  const auth = useAuthStore((state) => state.auth);
  const matchCentre = useMatchCentre(leagueSlug, round || undefined);
  const predStats = usePredictionStats();
  const leaderboard = useLeaderboard("weekly");

  useEffect(() => {
    if (!round && matchCentre.data?.currentRound) setRound(matchCentre.data.currentRound ?? "");
  }, [round, matchCentre.data?.currentRound]);

  const displayedFixtures = useMemo(() => {
    const source = matchCentre.data?.fixtures ?? [];
    return source.filter((f) => currentStatus(f) === status).sort((a, b) => {
      const left = new Date(a.kickoff).getTime();
      const right = new Date(b.kickoff).getTime();
      return status === "result" ? right - left : left - right;
    });
  }, [matchCentre.data?.fixtures, status]);

  return (
    <PublicShell>
      <section className="panel touchline p-6">
        <p className="font-bold uppercase text-[var(--fv-clay)]">Premier League</p>
        <h1 className="display-face mt-2 text-5xl font-black">Match centre</h1>
        <p className="mt-2 text-[var(--fv-muted)]">Fixtures, results, standings, and predictions.</p>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-4">
          <div className="panel flex flex-wrap items-center gap-2 p-3">
            {tabs.map((tab) => (
              <button
                className={status === tab.value ? "btn" : "btn btn-secondary"}
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          {status !== "live" ? (
            <RoundSelect disabled={matchCentre.isLoading} onChange={setRound} rounds={matchCentre.data?.rounds} value={round} />
          ) : null}

          {matchCentre.isLoading ? <LoadingBlock label="Loading fixtures" /> : null}
          {matchCentre.error && displayedFixtures.length === 0 ? <ErrorBlock message="Could not load fixtures." /> : null}
          {!matchCentre.isLoading && displayedFixtures.length === 0 ? <div className="panel p-5">No {status} matches. Try another tab.</div> : null}

          {displayedFixtures.map((fixture) => (
            <article className="panel p-5" key={fixture.fixtureId}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--fv-muted)]">{fixture.round ?? fixture.league}</p>
                  <p suppressHydrationWarning className="mt-1 text-sm font-bold text-[var(--fv-muted)]">
                    {new Date(fixture.kickoff).toLocaleString("en-US")}
                  </p>
                </div>
                <span className="border border-[var(--fv-line)] px-3 py-1 text-xs font-black uppercase">{currentStatus(fixture)}</span>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="flex items-center justify-end gap-2 text-right text-xl font-black">
                  {fixture.homeTeam}
                  {fixture.homeLogo ? <img alt="" className="h-8 w-8 object-contain" loading="lazy" src={fixture.homeLogo} /> : null}
                </p>
                <div className="min-w-20 text-center display-face text-3xl font-black">
                  {fixture.homeScore ?? "-"} : {fixture.awayScore ?? "-"}
                </div>
                <p className="flex items-center gap-2 text-xl font-black">
                  {fixture.awayLogo ? <img alt="" className="h-8 w-8 object-contain" loading="lazy" src={fixture.awayLogo} /> : null}
                  {fixture.awayTeam}
                </p>
              </div>

              {fixture.aiPrediction ? (
                <PredictionSummary ai={fixture.aiPrediction} />
              ) : null}
              {fixture.userPrediction ? (
                <UserPickDisplay match={fixture} prediction={fixture.userPrediction} />
              ) : status === "upcoming" && auth ? (
                <PickForm auth={auth} match={fixture} />
              ) : null}
            </article>
          ))}
        </div>

        <aside className="grid content-start gap-4">
          <StandingsPanel error={matchCentre.error ? "Failed" : undefined} isLoading={matchCentre.isLoading} rows={matchCentre.data?.standings} />
          {auth ? (
            <>
              <LeaderboardPanel entries={leaderboard.data} error={leaderboard.error} isLoading={leaderboard.isLoading} />
              <StatsBadges isLoading={predStats.isLoading} stats={predStats.data} />
            </>
          ) : null}
        </aside>
      </section>
    </PublicShell>
  );
}
