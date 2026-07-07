"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import {
  NewsArticleResponse,
  PageResponse,
  LeaderboardEntryResponse,
  ForumCategoryResponse,
  ThreadResponse,
} from "@/shared/lib/types";
import { getArticleImage } from "@/shared/lib/images";
import { LoadingBlock } from "@/shared/components/state-blocks";

/* ── helpers ──────────────────────────────────────────── */
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

export default function HomePage() {
  /* 1 — News */
  const { data: newsPage, isLoading: newsLoading } = useQuery({
    queryKey: ["home-news"] as const,
    queryFn: () =>
      data<PageResponse<NewsArticleResponse>>(
        http.get("/news", { params: { page: 0, size: 15 } })
      ),
  });
  const rawArticles = newsPage?.content ?? [];
  const articles = [...rawArticles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const hero = articles[0];
  const secondary = articles.slice(1, 3);
  const mainFeed = articles.slice(3, 11); // 8 articles for feed
  const sideArticles = articles.slice(11, 15); // 4 articles for side feed

  /* 2 — Leaderboard */
  const { data: leaderboard = [] } = useQuery({
    queryKey: qk.predictions.leaderboard("weekly"),
    queryFn: () =>
      data<LeaderboardEntryResponse[]>(
        http.get("/predictions/leaderboard", { params: { period: "weekly" } })
      ),
  });

  /* 3 — Forum */
  const { data: categories = [] } = useQuery({
    queryKey: qk.forum.categories(),
    queryFn: () => data<ForumCategoryResponse[]>(http.get("/forum/categories")),
  });
  const firstCatSlug = categories[0]?.slug ?? "";
  const { data: threadsPage } = useQuery({
    queryKey: qk.forum.threads(firstCatSlug),
    queryFn: () =>
      data<PageResponse<ThreadResponse>>(
        http.get(`/forum/categories/${firstCatSlug}/threads`, { params: { size: 4 } })
      ),
    enabled: !!firstCatSlug,
  });
  const threads = threadsPage?.content?.slice(0, 4) ?? [];

  return (
    <PublicShell>
      <div className="flex flex-col gap-8 w-full">

        {/* ═══════════════ HERO + SECONDARY ═══════════════ */}
        {newsLoading ? (
          <LoadingBlock label="Loading headlines" />
        ) : hero ? (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Main Hero — 3 cols */}
            <Link
              href={`/news/${hero.slug}`}
              className="lg:col-span-3 relative rounded-2xl overflow-hidden min-h-[380px] md:min-h-[460px] group block shadow-lg hover:shadow-xl transition-shadow duration-500 bg-gray-100"
            >
              <img
                src={getArticleImage(hero.id, hero.content)}
                alt={hero.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop";
                }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--fv-clay)] text-white text-[10px] font-bold uppercase tracking-wider mb-3 shadow-sm">
                  {hero.category || "Top Story"}
                </span>
                <h1 className="font-serif font-black text-2xl md:text-[2.5rem] text-white leading-[1.15] tracking-tight mb-2">
                  {hero.title}
                </h1>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed line-clamp-2 max-w-lg mb-3">
                  {hero.summary}
                </p>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  {timeAgo(hero.publishedAt)}
                </span>
              </div>
            </Link>

            {/* Side stories — 2 cols stacked */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {secondary.map((art) => (
                <Link
                  key={art.id}
                  href={`/news/${art.slug}`}
                  className="relative flex-1 rounded-2xl overflow-hidden min-h-[180px] md:min-h-[220px] group block shadow-md hover:shadow-lg transition-shadow duration-500 bg-gray-100"
                >
                  <img
                    src={getArticleImage(art.id, art.content)}
                    alt={art.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540747737956-3787293a9fc1?q=80&w=800&auto=format&fit=crop";
                    }}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-white/90 text-[var(--fv-clay)] text-[9px] font-bold uppercase tracking-wider mb-2">
                      {art.category || "News"}
                    </span>
                    <h2 className="font-serif font-black text-sm md:text-base text-white leading-snug line-clamp-2">
                      {art.title}
                    </h2>
                    <span className="text-[10px] text-gray-400 font-semibold mt-1 block">
                      {timeAgo(art.publishedAt)}
                    </span>
                  </div>
                </Link>
              ))}
              {/* Fallback if only 1 article */}
              {secondary.length === 0 && (
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-[var(--fv-paper)] to-white border border-[var(--fv-line)] flex items-center justify-center p-8">
                  <p className="text-xs text-[var(--fv-muted)] font-serif italic">More stories coming soon.</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-white border border-[var(--fv-line)] p-16 text-center shadow-sm">
            <p className="text-sm text-[var(--fv-muted)] font-serif italic">No stories published yet.</p>
          </section>
        )}

        {/* ═══════════════ MAIN CONTENT GRID (2/3 News Feed + 1/3 Widgets Sidebar) ═══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — 2/3: News Feed */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {mainFeed.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4 border-b border-[var(--fv-line)] pb-2">
                  <h3 className="font-serif font-black text-lg tracking-tight m-0">Latest Stories</h3>
                  <Link href="/news" className="text-[10px] font-bold uppercase tracking-wider text-[var(--fv-clay)] hover:underline underline-offset-4 transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mainFeed.map((art) => (
                    <Link
                      key={art.id}
                      href={`/news/${art.slug}`}
                      className="group rounded-2xl overflow-hidden bg-white border border-[var(--fv-line)] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                    >
                      <div className="relative h-40 overflow-hidden bg-gray-100">
                        <img
                          src={getArticleImage(art.id, art.content)}
                          alt={art.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop";
                          }}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-0.5 rounded-full bg-white/90 text-[var(--fv-clay)] text-[8px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                            {art.category || "News"}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <h4 className="font-serif font-black text-sm leading-snug m-0 text-[var(--fv-ink)] group-hover:text-[var(--fv-clay)] transition-colors duration-200 line-clamp-2">
                          {art.title}
                        </h4>
                        <p className="text-[11px] text-[var(--fv-muted)] leading-relaxed line-clamp-2 flex-1">
                          {art.summary}
                        </p>
                        <div className="flex items-center justify-between mt-auto pt-2">
                          <span className="text-[9px] text-[var(--fv-muted)] font-semibold">
                            {timeAgo(art.publishedAt)}
                          </span>
                          {art.tags?.[0] && (
                            <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-gray-50 text-[var(--fv-muted)] border border-gray-100">
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
          </div>

          {/* Right Column — 1/3: Widgets Sidebar */}
          <div className="flex flex-col gap-6">
            {/* ── Predictions Widget ── */}
            <div className="rounded-2xl bg-white border border-[var(--fv-line)] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[var(--fv-line)] flex items-center justify-between">
                <h3 className="font-serif font-black text-sm m-0">🏆 Top Predictors</h3>
                <Link href="/predictions" className="text-[9px] font-bold uppercase tracking-wider text-[var(--fv-clay)] hover:underline underline-offset-4">
                  Play →
                </Link>
              </div>
              {leaderboard.length > 0 ? (
                <div className="divide-y divide-gray-50 flex-1">
                  {leaderboard.slice(0, 5).map((u, i) => (
                    <div key={u.userId} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          i === 0 ? "bg-yellow-100 text-yellow-700" :
                          i === 1 ? "bg-gray-100 text-gray-600" :
                          i === 2 ? "bg-orange-50 text-orange-600" :
                          "bg-gray-50 text-[var(--fv-muted)]"
                        }`}>
                          {i + 1}
                        </span>
                        <span className="text-xs font-bold">@{u.username}</span>
                      </div>
                      <span className="text-xs font-black text-[var(--fv-clay)] tabular-nums">{u.points} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-xs text-[var(--fv-muted)] font-serif italic">No predictions yet.</p>
                </div>
              )}
              <Link
                href="/predictions"
                className="block text-center py-3 border-t border-[var(--fv-line)] text-[10px] font-bold uppercase tracking-wider text-[var(--fv-ink)] hover:bg-gray-50 transition-colors"
              >
                Make Your Predictions
              </Link>
            </div>

            {/* ── Community Widget ── */}
            <div className="rounded-2xl bg-white border border-[var(--fv-line)] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[var(--fv-line)] flex items-center justify-between">
                <h3 className="font-serif font-black text-sm m-0">💬 Community</h3>
                <Link href="/forum" className="text-[9px] font-bold uppercase tracking-wider text-[var(--fv-clay)] hover:underline underline-offset-4">
                  Forum →
                </Link>
              </div>
              {threads.length > 0 ? (
                <div className="divide-y divide-gray-50 flex-1">
                  {threads.map((t) => (
                    <Link
                      key={t.id}
                      href={`/forum/threads/${t.slug}`}
                      className="flex flex-col gap-1 px-5 py-3 hover:bg-gray-50/50 transition-colors"
                    >
                      <h4 className="text-xs font-bold m-0 leading-snug line-clamp-1 text-[var(--fv-ink)]">
                        {t.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[9px] text-[var(--fv-muted)]">
                        <span>@{t.authorUsername}</span>
                        <span>•</span>
                        <span>{t.replyCount} replies</span>
                        <span>•</span>
                        <span>{timeAgo(t.lastPostAt || t.createdAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-xs text-[var(--fv-muted)] font-serif italic">No discussions yet.</p>
                </div>
              )}
              <Link
                href="/forum"
                className="block text-center py-3 border-t border-[var(--fv-line)] text-[10px] font-bold uppercase tracking-wider text-[var(--fv-ink)] hover:bg-gray-50 transition-colors"
              >
                Join the Conversation
              </Link>
            </div>

            {/* ── More Articles Widget (Side Articles) ── */}
            <div className="rounded-2xl bg-white border border-[var(--fv-line)] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-[var(--fv-line)] flex items-center justify-between">
                <h3 className="font-serif font-black text-sm m-0">📰 Editor's Pick</h3>
                <Link href="/news" className="text-[9px] font-bold uppercase tracking-wider text-[var(--fv-clay)] hover:underline underline-offset-4">
                  All →
                </Link>
              </div>
              {sideArticles.length > 0 ? (
                <div className="divide-y divide-gray-50 flex-1">
                  {sideArticles.map((art) => (
                    <Link
                      key={art.id}
                      href={`/news/${art.slug}`}
                      className="flex gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors items-center"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <img
                          src={getArticleImage(art.id, art.content)}
                          alt={art.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579952365116-61317f0501cd?q=80&w=800&auto=format&fit=crop";
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <h4 className="text-xs font-bold m-0 leading-snug line-clamp-2 text-[var(--fv-ink)]">
                          {art.title}
                        </h4>
                        <span className="text-[9px] text(--fv-muted)">{timeAgo(art.publishedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-xs text-[var(--fv-muted)] font-serif italic">More stories coming soon.</p>
                </div>
              )}
              <Link
                href="/news"
                className="block text-center py-3 border-t border-[var(--fv-line)] text-[10px] font-bold uppercase tracking-wider text-[var(--fv-ink)] hover:bg-gray-50 transition-colors"
              >
                Browse All Articles
              </Link>
            </div>
          </div>
        </div>

      </div>
    </PublicShell>
  );
}
