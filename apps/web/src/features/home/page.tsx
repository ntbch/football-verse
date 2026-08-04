"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import type { PageResponse } from "@/shared/lib/api-types";
import type { NewsArticleResponse } from "@/features/news/types";
import type { LeaderboardEntryResponse, MatchCentreResponse } from "@/features/predictions/types";
import type { ForumCategoryResponse, ThreadResponse } from "@/features/forum/types";
import { getArticleImage, handleImageError } from "@/shared/lib/images";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { LeaderboardWidget, CommunityWidget, EditorsPickWidget, MatchdayPulseWidget } from "./_components";
import { FollowingOnboarding, useFollowingFeed } from "@/features/following";
import { useAuthStore } from "@/shared/lib/auth-store";

type HomeInitialData = {
  newsPage?: PageResponse<NewsArticleResponse>;
  leaderboard?: LeaderboardEntryResponse[];
  matchday?: MatchCentreResponse;
  categories?: ForumCategoryResponse[];
  threadsPage?: PageResponse<ThreadResponse>;
};

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HomePage({ initialData }: { initialData?: HomeInitialData }) {
  const auth = useAuthStore((state) => state.auth);
  const [initialDataUpdatedAt] = React.useState(() => Date.now());
  /* 1 — News */
  const { data: newsPage, isLoading: newsLoading, isError: newsError, refetch: refetchNews } = useQuery({
    queryKey: ["home-news"] as const,
    queryFn: () =>
      data<PageResponse<NewsArticleResponse>>(
        http.get("/news", { params: { page: 0, size: 15 } })
      ),
    initialData: initialData?.newsPage,
    initialDataUpdatedAt: initialData?.newsPage ? initialDataUpdatedAt : undefined,
    staleTime: 60_000,
  });
  const rawArticles = newsPage?.content ?? [];
  const articles = [...rawArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  /* 2 — Leaderboard */
  const { data: leaderboard = [], isError: leaderboardError, refetch: refetchLeaderboard } = useQuery({
    queryKey: qk.predictions.leaderboard("weekly"),
    queryFn: () =>
      data<LeaderboardEntryResponse[]>(
        http.get("/predictions/leaderboard", { params: { period: "weekly", limit: 5 } })
      ),
    initialData: initialData?.leaderboard,
    initialDataUpdatedAt: initialData?.leaderboard ? initialDataUpdatedAt : undefined,
    staleTime: 60_000,
  });

  const { data: matchday, isError: matchdayError, refetch: refetchMatchday } = useQuery({
    queryKey: ["home-matchday-pulse"] as const,
    queryFn: () => data<MatchCentreResponse>(http.get("/predictions/match-centre", { params: { league: "premier-league" } })),
    initialData: initialData?.matchday,
    initialDataUpdatedAt: initialData?.matchday ? initialDataUpdatedAt : undefined,
    staleTime: 120_000,
  });
  const matchdayFixtures = (matchday?.fixtures ?? []).filter((fixture) => fixture.status === "upcoming" || fixture.status === "live");

  /* 3 — Forum */
  const { data: categories = [], isError: categoriesError, refetch: refetchCategories } = useQuery({
    queryKey: qk.forum.categories(),
    queryFn: () => data<ForumCategoryResponse[]>(http.get("/forum/categories")),
    initialData: initialData?.categories,
    initialDataUpdatedAt: initialData?.categories ? initialDataUpdatedAt : undefined,
    staleTime: 5 * 60_000,
  });
  const firstCatSlug = categories[0]?.slug ?? "";
  const { data: threadsPage, isError: threadsError, refetch: refetchThreads } = useQuery({
    queryKey: qk.forum.threads(firstCatSlug),
    queryFn: () =>
      data<PageResponse<ThreadResponse>>(
        http.get(`/forum/categories/${firstCatSlug}/threads`, { params: { size: 4 } })
      ),
    enabled: !!firstCatSlug,
    initialData: initialData?.threadsPage,
    initialDataUpdatedAt: initialData?.threadsPage ? initialDataUpdatedAt : undefined,
    staleTime: 60_000,
  });
  const threads = threadsPage?.content?.slice(0, 4) ?? [];
  const { data: followingFeed, isLoading: followingLoading, isError: followingError, refetch: refetchFollowing } = useFollowingFeed(Boolean(auth));
  const personalizedStories = followingFeed?.items.map(({ article }) => article) ?? [];
  const primaryArticles = followingFeed?.follows.length && personalizedStories.length ? personalizedStories : articles;
  const hero = primaryArticles[0];
  const secondary = primaryArticles.slice(1, 3);
  const mainFeed = primaryArticles.slice(3, 11);
  const sideArticles = primaryArticles.slice(11, 15);

  return (
    <PublicShell>
      <div className="flex flex-col gap-8 w-full">
        {/* HERO + SECONDARY */}
        {newsLoading ? (
          <LoadingBlock label="Loading headlines" />
        ) : newsError ? (
          <ErrorBlock message="Could not load headlines." onRetry={() => void refetchNews()} />
        ) : hero ? (
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
            {/* Main Hero — 3 cols */}
            <Link
              href={`/news/${hero.slug}`}
              className="xl:col-span-7 editorial-story relative min-h-[390px] md:min-h-[500px] group block bg-[var(--color-surface-muted)] transition-shadow duration-500"
            >
              <img
                src={getArticleImage(hero.id, undefined, hero.imageUrl, 1600)}
                alt={hero.title}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={handleImageError}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
              <div className="story-overlay story-overlay-strong absolute inset-0" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-9">
                <span className="story-category inline-block px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 shadow-sm">
                  {hero.category || "Top Story"}
                </span>
                <h2 className="font-serif-title font-black text-3xl md:text-[2.8rem] text-[var(--color-story-text)] leading-[1.08] tracking-tight mb-3 max-w-3xl">
                  {hero.title}
                </h2>
                <p className="text-[var(--color-story-muted)] text-sm leading-relaxed line-clamp-2 max-w-xl mb-4">
                  {hero.summary}
                </p>
                <span className="text-[10px] text-[var(--color-story-muted)] font-semibold uppercase tracking-wider">
                  {timeAgo(hero.publishedAt)}
                  {hero.contentKind === "AGGREGATED_STORY" && ` · ${hero.sourceCount || 1} source${(hero.sourceCount || 1) === 1 ? "" : "s"}`}
                </span>
              </div>
            </Link>

            {/* Side stories — 2 cols stacked */}
            <div className="xl:col-span-5 flex flex-col gap-5">
              {secondary.map((art) => (
                <Link
                  key={art.id}
                  href={`/news/${art.slug}`}
                  className="editorial-story relative flex-1 min-h-[205px] group block bg-[var(--color-surface-muted)] transition-shadow duration-500"
                >
                  <img
                    src={getArticleImage(art.id, undefined, art.imageUrl, 800)}
                    alt={art.title}
                    loading="lazy"
                    decoding="async"
                    onError={handleImageError}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  />
                  <div className="story-overlay absolute inset-0" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                    <span className="story-category story-category-light inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-2">
                      {art.category || "News"}
                    </span>
                    <h3 className="font-serif-title font-black text-base md:text-lg text-[var(--color-story-text)] leading-snug line-clamp-2">
                      {art.title}
                    </h3>
                    <span className="text-[10px] text-[var(--color-story-muted)] font-semibold mt-1 block">
                      {timeAgo(art.publishedAt)}
                      {art.contentKind === "AGGREGATED_STORY" && ` · ${art.sourceCount || 1} source${(art.sourceCount || 1) === 1 ? "" : "s"}`}
                    </span>
                  </div>
                </Link>
              ))}
              {secondary.length === 0 && (
                <div className="editorial-panel flex-1 flex items-center justify-center p-8">
                  <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">
                    More stories coming soon.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="editorial-panel p-16 text-center">
            <p className="text-sm text-[var(--color-text-secondary)] font-serif italic">
              No stories published yet.
            </p>
          </section>
        )}

        {/* MAIN CONTENT GRID (2/3 News Feed + 1/3 Widgets Sidebar) */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-8 items-start">
          {/* Left Column — 2/3: News Feed */}
          <div className="flex flex-col gap-7">
            {mainFeed.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-5">
                  <h3 className="editorial-section-title m-0">Latest stories</h3>
                  <span className="editorial-rule" />
                  <Link
                    href="/news"
                    className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline underline-offset-4 transition-colors"
                  >
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {mainFeed.map((art) => (
                    <Link
                      key={art.id}
                      href={`/news/${art.slug}`}
                      className="group editorial-panel overflow-hidden transition-all duration-300 flex flex-col"
                    >
                      <div className="relative h-48 overflow-hidden bg-[var(--color-surface-muted)]">
                        <img
                          src={getArticleImage(art.id, undefined, art.imageUrl, 800)}
                          alt={art.title}
                          loading="lazy"
                          decoding="async"
                          onError={handleImageError}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="story-category story-category-light px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                            {art.category || "News"}
                          </span>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col gap-2.5 flex-1">
                        <h4 className="font-serif-title font-black text-base leading-snug m-0 text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-200 line-clamp-2">
                          {art.title}
                        </h4>
                        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 flex-1">
                          {art.summary}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-2">
                          <span className="text-[9px] text-[var(--color-text-secondary)] font-semibold">
                            {timeAgo(art.publishedAt)}
                            {art.contentKind === "AGGREGATED_STORY" && ` · ${art.sourceCount || 1} source${(art.sourceCount || 1) === 1 ? "" : "s"}`}
                          </span>
                          {art.tags?.[0] && (
                            <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                              {art.tags[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {auth ? (
              <section className="editorial-panel p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="editorial-kicker m-0">Your selection</p>
                    <h3 className="editorial-section-title m-0 mt-1">Following</h3>
                  </div>
                  {followingFeed?.follows.length ? <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{followingFeed.follows.length} followed</span> : null}
                </div>

                {followingLoading ? <LoadingBlock label="Loading following feed" /> : followingError ? <ErrorBlock message="Following feed could not be loaded." onRetry={() => void refetchFollowing()} /> : !followingFeed?.follows.length ? (
                  <div className="flex flex-col gap-3">
                    <FollowingOnboarding follows={[]} />
                  </div>
                ) : followingFeed.follows.length < 3 ? (
                  <FollowingOnboarding follows={followingFeed.follows} />
                ) : followingFeed.items.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="m-0 text-sm text-[var(--color-text-secondary)]">No recent stories match your follows yet.</p>
                    <Link className="min-h-11 inline-flex items-center text-xs font-bold text-[var(--color-accent)] hover:underline" href="/news">Browse latest news</Link>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {followingFeed.items.map(({ article, reasons }) => (
                      <Link className="rounded-xl border border-[var(--color-border)] px-4 py-3 transition-colors hover:border-[var(--color-accent)]" href={`/news/${article.slug}`} key={article.id}>
                        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">Because you follow {reasons.join(", ")}</p>
                        <h4 className="m-0 mt-1 font-serif-title text-base font-black text-[var(--color-text-primary)]">{article.title}</h4>
                        <p className="m-0 mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{article.summary}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
            {!auth ? <section className="editorial-panel flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
              <div><p className="editorial-kicker m-0">Personal intelligence</p><h3 className="editorial-section-title m-0 mt-1">Follow teams to tune Home</h3><p className="m-0 mt-1 text-sm text-[var(--color-text-secondary)]">Save your clubs, players and competitions in one feed.</p></div>
              <Link className="min-h-11 inline-flex items-center rounded-full bg-[var(--color-accent)] px-4 text-xs font-bold text-[var(--color-text-inverse)]" href="/login?next=/">Start with a follow</Link>
            </section> : null}
          </div>

          {/* Right Column — 1/3: Widgets Sidebar */}
          <aside className="flex flex-col gap-5 xl:sticky xl:top-24">
            <MatchdayPulseWidget error={matchdayError} fixtures={matchdayFixtures} onRetry={() => void refetchMatchday()} />
            <LeaderboardWidget leaderboard={leaderboard} error={leaderboardError} onRetry={() => void refetchLeaderboard()} />
            <CommunityWidget
              threads={threads}
              error={categoriesError || threadsError}
              onRetry={() => {
                void refetchCategories();
                void refetchThreads();
              }}
            />
            <EditorsPickWidget articles={sideArticles} />
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
