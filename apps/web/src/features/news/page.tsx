"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import type { NewsArticleResponse, NewsCategoryResponse } from "./types";
import type { PageResponse } from "@/shared/lib/api-types";
import { getArticleImage, handleImageError } from "@/shared/lib/images";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { formatDate } from "@/shared/lib/format";

type SourceType = "ALL" | "NEWS" | "REDDIT" | "X" | "YOUTUBE";

export default function NewsListingPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType>("ALL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(0);
  const size = 24;

  // 1. Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: qk.admin.newsCategories(),
    queryFn: () => data<NewsCategoryResponse[]>(http.get("/news/categories")),
  });

  // 2. Fetch news articles page
  const { data: pageData, isLoading, isError, refetch } = useQuery({
    queryKey: [qk.news.list()[0], selectedCategory, selectedSourceType, page] as const,
    queryFn: () => {
      const params: any = { page, size, sort: "createdAt,desc" };
      if (selectedCategory !== null) {
        params.categories = selectedCategory;
      }
      if (selectedSourceType === "YOUTUBE") {
        params.provider = "youtube";
      } else if (selectedSourceType === "REDDIT") {
        params.provider = "reddit";
      } else if (selectedSourceType === "X") {
        params.provider = "x";
      } else if (selectedSourceType === "NEWS") {
        params.provider = "news";
      }
      return data<PageResponse<NewsArticleResponse>>(http.get("/news", { params }));
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  });

  const rawArticles = pageData?.content || [];
  const totalPages = pageData?.totalPages || 0;

  const getSourceType = (art: NewsArticleResponse): SourceType => {
    const sources = art.sources || [];
    const sourceNames = sources.map((s) => (s.name || "").toLowerCase()).join(" ");
    const sourceUrls = sources.map((s) => (s.url || "").toLowerCase()).join(" ");
    const primaryUrl = (art.sourceUrl || "").toLowerCase();
    const primaryName = (art.sourceName || "").toLowerCase();

    const allNames = `${primaryName} ${sourceNames}`;
    const allUrls = `${primaryUrl} ${sourceUrls}`;

    if (allUrls.includes("reddit.com") || allNames.includes("reddit")) return "REDDIT";
    if (
      allUrls.includes("x.com") ||
      allUrls.includes("twitter.com") ||
      allNames.includes("twitter") ||
      allNames.includes("x.com") ||
      allNames.includes("(x)") ||
      allNames.includes("fabrizio") ||
      allNames.includes("ornstein") ||
      allNames.includes("di marzio")
    )
      return "X";
    if (allUrls.includes("youtube.com") || allUrls.includes("youtu.be") || allNames.includes("youtube")) return "YOUTUBE";
    return "NEWS";
  };

  const getCardBadge = (art: NewsArticleResponse) => {
    const st = getSourceType(art);
    if (st === "REDDIT") return { label: "REDDIT", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" };
    if (st === "X") return { label: "X JOURNALIST", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
    if (st === "YOUTUBE") return { label: "YOUTUBE", color: "news-badge-youtube" };

    if (art.category && art.category.trim()) {
      const catName = art.category.trim();
      const upperCat = catName.toUpperCase();

      if (upperCat.includes("TRANSFER")) return { label: catName.toUpperCase(), color: "news-badge-success" };
      if (upperCat.includes("MATCH")) return { label: catName.toUpperCase(), color: "news-badge-info" };
      if (upperCat.includes("RUMOUR")) return { label: catName.toUpperCase(), color: "news-badge-accent" };
      if (upperCat.includes("OPINION")) return { label: catName.toUpperCase(), color: "news-badge-info" };
      return { label: catName.toUpperCase(), color: "news-badge-neutral" };
    }

    return { label: "NEWS", color: "news-badge-info" };
  };

  const articles = rawArticles.filter(art => {
    if (selectedSourceType === "ALL") return true;
    return getSourceType(art) === selectedSourceType;
  });

  const handleSourceTypeChange = (type: SourceType) => {
    setSelectedSourceType(type);
    setPage(0);
  };

  const handleCategoryChange = (catId: number | null) => {
    setSelectedCategory(catId);
    setPage(0);
  };

  const feedArticles = articles;

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full animate-fade-in max-w-7xl mx-auto">
        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[15rem_minmax(0,1fr)] gap-8 items-start">
          {/* Left Sidebar */}
          <aside className="flex flex-col gap-4 xl:sticky xl:top-24 w-full">
            {/* Mobile/Tablet Source Selector */}
            <div className="lg:hidden relative w-full">
              {isDropdownOpen && (
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}

              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="min-h-11 w-full px-4 py-3 rounded-xl bg-[var(--color-background-surface)] border border-[var(--color-border)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center justify-between shadow-sm active:scale-[0.99] transition-all z-40 relative cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <span>Filter:</span>
                  <span className="text-[var(--color-accent)] font-black">
                    {selectedSourceType === "ALL" ? "All Sources" : selectedSourceType}
                  </span>
                </span>
                <svg
                  className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-xl shadow-premium p-1.5 flex flex-col gap-1 animate-fade-in">
                  {[
                    { id: "ALL" as const, name: "All Sources" },
                    { id: "NEWS" as const, name: "News Outlets" },
                    { id: "REDDIT" as const, name: "Reddit Subreddits" },
                    { id: "X" as const, name: "X Journalists" },
                    { id: "YOUTUBE" as const, name: "YouTube Highlights" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleSourceTypeChange(item.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`min-h-11 w-full px-3.5 py-2 rounded-lg text-left text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        selectedSourceType === item.id
                          ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Source Filters Box */}
            <div className="card overflow-hidden hidden lg:block">
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <h3 className="font-sans font-black text-[11px] m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
                  SOURCE PROVIDERS
                </h3>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5">
                {[
                  { id: "ALL" as const, name: "All Sources", icon: "🌐" },
                  { id: "NEWS" as const, name: "News Outlets", icon: "📰" },
                  { id: "REDDIT" as const, name: "Reddit", icon: "💬" },
                  { id: "X" as const, name: "X (Twitter)", icon: "🐤" },
                  { id: "YOUTUBE" as const, name: "YouTube Highlights", icon: "▶" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSourceTypeChange(item.id)}
                    className={`min-h-11 px-3 py-2 rounded-lg text-left text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      selectedSourceType === item.id
                        ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs">{item.icon}</span>
                      <span>{item.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Cards */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <h3 className="font-sans font-black text-[11px] m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
                  CATEGORIES
                </h3>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`min-h-11 w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    selectedCategory === null
                      ? "bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>All Categories</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`min-h-11 w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? "bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Most Liked Stories Widget */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-center justify-between">
                <h3 className="font-sans font-black text-[11px] m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
                  MOST LIKED STORIES
                </h3>
                <span className="text-xs">🔥</span>
              </div>
              <div className="p-2 flex flex-col gap-1">
                {articles.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-secondary)] p-2 m-0 text-center">
                    No articles to display
                  </p>
                ) : (
                  articles
                    .slice()
                    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                    .slice(0, 4)
                    .map((art, idx) => (
                      <Link
                        key={art.id}
                        href={`/news/${art.slug}`}
                        className="flex items-start gap-2.5 py-2 px-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors group"
                      >
                        <span className="text-base font-black text-[var(--color-accent)]/50 leading-none mt-0.5 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] line-clamp-2 m-0 leading-tight transition-colors">
                            {art.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--color-text-secondary)] font-medium">
                            <span>❤️ {art.likes || 0}</span>
                            <span>•</span>
                            <span>{formatDate(art.publishedAt)}</span>
                          </div>
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </div>
          </aside>

          {/* Right Main Articles Panel */}
          <div>
            {isLoading ? (
              <LoadingBlock label="Fetching Aggregated Football Stories" />
            ) : isError ? (
              <ErrorBlock message="Could not load articles." onRetry={() => void refetch()} />
            ) : articles.length === 0 ? (
              <div className="text-center py-12 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col items-center gap-2">
                <h3 className="m-0 font-sans font-black text-lg text-[var(--color-text-primary)]">
                  No Articles Found
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  No articles found for the selected provider or category.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Vertical Stream Cards */}
                <div className="flex flex-col gap-3.5">
                  {feedArticles.map((art) => {
                    const st = getSourceType(art);
                    const isVideo = st === "YOUTUBE";
                    const badge = getCardBadge(art);

                    if (isVideo) {
                      return (
                        <div key={art.id} className="card p-4 flex flex-col gap-2.5 overflow-hidden group relative">
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-[var(--color-text-primary)] flex items-center justify-center">
                            <img
                              src={getArticleImage(art.id, art.content, art.imageUrl)}
                              alt={art.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 opacity-90"
                              onError={(event) => handleImageError(event, art.imageUrl)}
                            />
                            <div className={`absolute top-2 left-2 ${badge.color} text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm z-10 border`}>
                              {badge.label}
                            </div>
                            <div className="absolute inset-0 bg-[var(--color-overlay)] flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-[var(--color-brand-youtube)]/90 text-[var(--color-text-inverse)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)]">
                            <span className="flex items-center gap-1 text-[var(--color-brand-youtube)] font-extrabold text-[11px]">
                              <span>▶</span>
                              <span>{art.sourceName || "YouTube Highlights"}</span>
                            </span>
                            <span className="text-[11px]">
                              {formatDate(art.publishedAt)}
                            </span>
                          </div>

                          <Link href={`/news/${art.slug}`}>
                            <h3 className="m-0 font-sans font-black text-base md:text-lg leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                              {art.title}
                            </h3>
                          </Link>

                          <div className="flex items-center justify-end border-t border-[var(--color-border)] pt-2 mt-0.5">
                            <Link
                              href={`/news/${art.slug}`}
                              className="text-[11px] font-black uppercase tracking-wider text-[var(--color-brand-youtube)] hover:underline"
                            >
                              Watch Highlights →
                            </Link>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={art.id} className="card p-3.5 md:p-4 flex flex-col md:flex-row gap-4 overflow-hidden group">
                        {/* Left image thumbnail */}
                        <div className="aspect-[16/9] md:w-48 w-full rounded-lg overflow-hidden flex-shrink-0 bg-[var(--color-surface-muted)] border border-[var(--color-border)] relative">
                          <img
                            src={getArticleImage(art.id, art.content, art.imageUrl)}
                            alt={art.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                            onError={(event) => handleImageError(event, art.imageUrl)}
                          />
                          <div className={`absolute top-1.5 left-1.5 ${badge.color} text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm border`}>
                            {badge.label}
                          </div>
                        </div>

                        {/* Right content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-text-secondary)]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[var(--color-accent)] font-extrabold">
                                  {art.sourceName || "Football News"}
                                </span>
                                {art.sourceCount && art.sourceCount > 1 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    {art.sourceCount} Outlets Clustered
                                  </span>
                                ) : null}
                              </div>
                              <span>
                                {formatDate(art.publishedAt)}
                              </span>
                            </div>

                            <Link href={`/news/${art.slug}`}>
                              <h3 className="m-0 font-sans font-black text-base leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                                {art.title}
                              </h3>
                            </Link>

                            {art.summary && (
                              <p className="m-0 text-[11px] md:text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                                {art.summary}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 mt-0.5 text-[11px] font-bold text-[var(--color-text-secondary)]">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                                </svg>
                                {art.likes}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                {art.bookmarks}
                              </span>
                            </div>

                            <Link
                              href={`/news/${art.slug}`}
                              className="text-[11px] font-black uppercase tracking-wider text-[var(--color-accent)] hover:underline flex items-center gap-1"
                            >
                              <span>Read Story</span>
                              <span>→</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-3">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="min-h-11 px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-surface)] text-xs font-bold text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)] transition-colors active:scale-95"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs font-bold text-[var(--color-text-secondary)] px-2">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="min-h-11 px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-surface)] text-xs font-bold text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface-hover)] transition-colors active:scale-95"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
