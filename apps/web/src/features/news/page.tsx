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
import { LoadingBlock } from "@/shared/components/state-blocks";

export default function NewsListingPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<"ALL" | "NEWS" | "YOUTUBE">("ALL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(0);
  const size = 24;

  // 1. Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: qk.admin.newsCategories(),
    queryFn: () => data<NewsCategoryResponse[]>(http.get("/news/categories")),
  });

  // 2. Fetch news articles page
  const { data: pageData, isLoading } = useQuery({
    queryKey: [qk.news.list()[0], selectedCategory, page] as const,
    queryFn: () => {
      const params: any = { page, size, sort: "createdAt,desc" };
      if (selectedCategory !== null) {
        params.categories = selectedCategory;
      }
      return data<PageResponse<NewsArticleResponse>>(http.get("/news", { params }));
    },
    refetchInterval: 30_000,
  });

  const rawArticles = pageData?.content || [];
  const totalPages = pageData?.totalPages || 0;

  const getSourceType = (art: NewsArticleResponse): "YOUTUBE" | "NEWS" => {
    const url = (art.sourceUrl || "").toLowerCase();
    const name = (art.sourceName || "").toLowerCase();
    if (url.includes("youtube.com") || url.includes("youtu.be") || name.includes("youtube")) return "YOUTUBE";
    return "NEWS";
  };

  const getCardBadge = (art: NewsArticleResponse) => {
    if (art.category && art.category.trim()) {
      const cat = art.category.trim().toUpperCase();
      if (cat.includes("TRANSFER")) return { label: "TRANSFERS", color: "bg-emerald-600 text-white" };
      if (cat.includes("MATCH")) return { label: "MATCHES", color: "bg-sky-600 text-white" };
      if (cat.includes("RUMOUR")) return { label: "RUMOURS", color: "bg-purple-600 text-white" };
    }

    const title = (art.title || "").toLowerCase();
    const summary = (art.summary || "").toLowerCase();
    const text = `${title} ${summary}`;

    const transferKeywords = [
      "transfer", "transfers", "sign", "signs", "signed", "signing", "signings",
      "deal", "deals", "bid", "bids", "loan", "loans", "fee", "clause",
      "buy", "buys", "bought", "join", "joins", "joined", "agree", "agrees", "agreed",
      "target", "targets", "contract", "free agent", "release clause", "swap", "move",
      "coach", "coaches", "manager", "managers", "sacked", "appoint", "appoints", "appointed"
    ];
    if (transferKeywords.some(kw => text.includes(kw))) {
      return { label: "TRANSFERS", color: "bg-emerald-600 text-white" };
    }

    const st = getSourceType(art);
    if (st === "YOUTUBE") return { label: "YOUTUBE", color: "bg-red-600 text-white" };

    const matchKeywords = ["beat", "wins", "won", "defeat", "draw", "score", "vs", "highlight", "highlights", "final", "cup", "champion"];
    if (matchKeywords.some(kw => text.includes(kw))) {
      return { label: "MATCHES", color: "bg-sky-600 text-white" };
    }

    return { label: "NEWS", color: "bg-blue-600 text-white" };
  };

  const articles = rawArticles.filter(art => {
    if (selectedSourceType === "ALL") return true;
    return getSourceType(art) === selectedSourceType;
  });

  const handleSourceTypeChange = (type: "ALL" | "NEWS" | "YOUTUBE") => {
    setSelectedSourceType(type);
    setPage(0);
  };

  const handleCategoryChange = (catId: number | null) => {
    setSelectedCategory(catId);
    setPage(0);
  };

  return (
    <PublicShell>
      <div className="flex flex-col gap-5 w-full animate-fade-in">
        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24 w-full">
            {/* Mobile/Tablet Category Selector (Dropdown Popover) */}
            <div className="lg:hidden relative w-full">
              {isDropdownOpen && (
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}

              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-background-surface)] border border-[var(--color-border)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center justify-between shadow-sm active:scale-[0.99] transition-all z-40 relative cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  📰 Source Filter:{" "}
                  <span className="text-[var(--color-accent)]">
                    {selectedSourceType === "ALL"
                      ? "All Sources"
                      : selectedSourceType === "NEWS"
                      ? "News Outlets"
                      : "YouTube"}
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
                    { id: "YOUTUBE" as const, name: "YouTube Highlights" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleSourceTypeChange(item.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 rounded-lg text-left text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        selectedSourceType === item.id
                          ? "bg-[var(--color-accent)] text-white shadow-sm"
                          : "text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Source Filters Box (Peek.vn Style) */}
            <div className="card overflow-hidden hidden lg:block">
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="font-serif-title font-black text-[11px] m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
                  SOURCE FILTERS
                </h3>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5">
                {[
                  {
                    id: "ALL" as const,
                    name: "All Sources",
                    icon: (
                      <svg className="w-3.5 h-3.5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                    ),
                  },
                  {
                    id: "NEWS" as const,
                    name: "News Outlets",
                    icon: (
                      <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6m-6 4h6" />
                      </svg>
                    ),
                  },
                  {
                    id: "YOUTUBE" as const,
                    name: "YouTube Highlights",
                    icon: (
                      <svg className="w-3.5 h-3.5 text-red-500 fill-current" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSourceTypeChange(item.id)}
                    className={`px-3 py-2 rounded-lg text-left text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      selectedSourceType === item.id
                        ? "bg-[var(--color-accent)] text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-black/[0.04] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      <span>{item.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Cards */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="font-serif-title font-black text-[11px] m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
                  CATEGORIES
                </h3>
              </div>
              <div className="p-1.5 flex flex-col gap-0.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                    selectedCategory === null
                      ? "bg-black text-white shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:bg-black/[0.04] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span>All Categories</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? "bg-black text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-black/[0.04] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Articles Widget */}
            {articles.length > 0 && (
              <div className="card overflow-hidden hidden lg:block">
                <div className="px-4 py-3 border-b border-[var(--color-border)] bg-gray-50/50">
                  <h3 className="font-serif-title font-black text-xs m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[var(--color-accent)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1014.12 11.88" />
                    </svg>
                    <span>Trending</span>
                  </h3>
                </div>
                <div className="p-2 flex flex-col divide-y divide-gray-50">
                  {[...articles]
                    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
                    .slice(0, 4)
                    .map((art, idx) => (
                      <Link
                        key={art.id}
                        href={`/news/${art.slug}`}
                        className="flex items-start gap-2.5 py-2 px-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-base font-black text-[var(--color-accent)]/50 leading-none mt-0.5 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-[var(--color-text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--color-accent)] transition-colors m-0">
                            {art.title}
                          </p>
                          <span className="text-[9px] text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1.5 font-semibold">
                            <span className="flex items-center gap-0.5">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                              </svg>
                              {art.likes}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              {art.bookmarks}
                            </span>
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </aside>

          {/* Right Main Articles Panel */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <LoadingBlock label="Loading Publications" />
            ) : articles.length === 0 ? (
              <div className="text-center py-12 bg-white border border-[var(--color-border)] rounded-2xl p-6 flex flex-col items-center gap-2">
                <h3 className="m-0 font-serif-title font-black text-lg text-[var(--color-text-primary)]">
                  No Articles Found
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  No published articles available in this category yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Vertical Stream Cards (Peek.vn Card Styles - Compact Scale) */}
                <div className="flex flex-col gap-3.5">
                  {articles.map((art) => {
                    const st = getSourceType(art);
                    const isVideo = st === "YOUTUBE";
                    const badge = getCardBadge(art);

                    if (isVideo) {
                      // Peek.vn YouTube Video Card Variant
                      return (
                        <div key={art.id} className="card p-4 flex flex-col gap-2.5 overflow-hidden group relative">
                          {/* Video Thumbnail with Center Play Button */}
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center cursor-pointer">
                            <img
                              src={getArticleImage(art.id, art.content, art.imageUrl)}
                              alt={art.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 opacity-90"
                              onError={handleImageError}
                            />
                            <div className={`absolute top-2 left-2 ${badge.color} text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm z-10`}>
                              {badge.label}
                            </div>
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)]">
                            <span className="flex items-center gap-1 text-red-500 font-extrabold text-[11px]">
                              <span>▶</span>
                              <span>{art.sourceName || "YouTube Highlights"}</span>
                            </span>
                            <span className="text-[11px]">
                              {new Date(art.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>

                          <Link href={`/news/${art.slug}`}>
                            <h3 className="m-0 font-serif-title font-black text-base md:text-lg leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                              {art.title}
                            </h3>
                          </Link>

                          <div className="flex items-center justify-end border-t border-[var(--color-border)] pt-2 mt-0.5">
                            <Link
                              href={`/news/${art.slug}`}
                              className="text-[11px] font-black uppercase tracking-wider text-red-500 hover:underline"
                            >
                              Watch Video →
                            </Link>
                          </div>
                        </div>
                      );
                    }

                    // Peek.vn News Story Card Variant (Compact Proportions)
                    return (
                      <div key={art.id} className="card p-3.5 md:p-4 flex flex-col md:flex-row gap-4 overflow-hidden group">
                        {/* Left image thumbnail - Compact 192px width */}
                        <div className="aspect-[16/9] md:w-48 w-full rounded-lg overflow-hidden flex-shrink-0 bg-black/5 border border-[var(--color-border)] relative">
                          <img
                            src={getArticleImage(art.id, art.content, art.imageUrl)}
                            alt={art.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                            onError={handleImageError}
                          />
                          <div className={`absolute top-1.5 left-1.5 ${badge.color} text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm`}>
                            {badge.label}
                          </div>
                        </div>

                        {/* Right content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-text-secondary)]">
                              <span className="text-[var(--color-accent)] font-extrabold">
                                {art.sourceName || "Football News"}
                              </span>
                              <span>
                                {new Date(art.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>

                            <Link href={`/news/${art.slug}`}>
                              <h3 className="m-0 font-serif-title font-black text-base leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
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
                              <span className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                                </svg>
                                {art.likes}
                              </span>
                              <span className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors cursor-pointer">
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
                              <span>Read Article</span>
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
                      className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-surface)] text-xs font-bold text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs font-bold text-[var(--color-text-secondary)] px-2">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-3.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-surface)] text-xs font-bold text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
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
