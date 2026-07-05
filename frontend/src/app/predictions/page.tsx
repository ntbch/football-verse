"use client";

import { useAuthStore } from "@/shared/lib/auth-store";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { usePredictionFixtures, usePredictionStats, useLeaderboard } from "./_api";
import { PickForm, UserPickDisplay, LeaderboardPanel, StatsBadges } from "./_components";

export default function PredictionsPage() {
  const auth = useAuthStore((state) => state.auth);
  const league = "premier-league";
  const trackedMatches = usePredictionFixtures(league);
  const predStats = usePredictionStats();
  const leaderboard = useLeaderboard("weekly");

  const upcoming = (trackedMatches.data ?? []).filter((m) => m.status === "upcoming");
  const results = (trackedMatches.data ?? []).filter((m) => m.status === "result");

  return (
    <PublicShell>
      <section className="panel touchline p-6">
        <h1 className="display-face text-5xl font-black">Predictions</h1>
        <p className="mt-2 text-[var(--fv-muted)]">Pick match outcomes and climb the leaderboard.</p>
        {auth ? <div className="mt-3"><StatsBadges isLoading={predStats.isLoading} stats={predStats.data} /></div> : null}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-4">
          <h2 className="display-face text-3xl font-black">Upcoming matches</h2>

          {trackedMatches.isLoading ? <LoadingBlock label="Loading matches" /> : null}
          {trackedMatches.error ? <ErrorBlock message="Could not load matches." /> : null}
          {!trackedMatches.isLoading && upcoming.length === 0 ? (
            <div className="panel p-5">No upcoming matches. Check back later.</div>
          ) : null}

          {upcoming.map((match) => (
            <article className="panel p-5" key={match.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--fv-muted)]">{match.round ?? match.leagueSlug}</p>
                  <p suppressHydrationWarning className="mt-1 text-sm font-bold text-[var(--fv-muted)]">
                    {new Date(match.kickoff).toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="text-right text-xl font-black">{match.homeTeam}</p>
                <div className="min-w-20 text-center display-face text-3xl font-black">- : -</div>
                <p className="text-xl font-black">{match.awayTeam}</p>
              </div>

              <PickForm auth={auth} match={match} />
            </article>
          ))}

          {results.length > 0 ? (
            <>
              <h2 className="display-face mt-6 text-3xl font-black">Results</h2>
              {results.map((match) => (
                <article className="panel p-5" key={match.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase text-[var(--fv-muted)]">{match.round ?? match.leagueSlug}</p>
                  </div>

                  <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className="text-right text-xl font-black">{match.homeTeam}</p>
                    <div className="min-w-20 text-center display-face text-3xl font-black">
                      {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
                    </div>
                    <p className="text-xl font-black">{match.awayTeam}</p>
                  </div>

                  {match.userPrediction ? <UserPickDisplay match={match} prediction={match.userPrediction} /> : null}
                </article>
              ))}
            </>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <LeaderboardPanel entries={leaderboard.data} error={leaderboard.error} isLoading={leaderboard.isLoading} />
          {auth ? <StatsBadges isLoading={predStats.isLoading} stats={predStats.data} /> : null}
        </aside>
      </section>
    </PublicShell>
  );
}
