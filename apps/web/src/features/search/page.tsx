"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PublicShell } from "@/shared/components/page-shell";
import { http, data } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { getArticleImage } from "@/shared/lib/images";
import type { SearchResponse } from "./types";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState<"news" | "forum">("news");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all");

  // Fetch search results
  const { data: results, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => data<SearchResponse>(http.get("/search", { params: { q, size: 100 } })),
    enabled: !!q.trim(),
  });

  const newsList = results?.news?.content || [];
  const forumList = results?.forum?.content || [];

  // Dynamic category extraction
  const newsCategories = Array.from(new Set(newsList.map((art) => art.category || "Others")));
  const forumCategories = Array.from(new Set(forumList.map((thread) => thread.categoryName || "Others")));

  const handleTabChange = (tab: "news" | "forum") => {
    setActiveTab(tab);
    setSelectedCategory(null);
    setTimeFilter("all");
  };

  const filterByTime = (dateStr: string) => {
    if (timeFilter === "all") return true;
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    if (timeFilter === "24h") return diffMs <= 24 * 60 * 60 * 1000;
    if (timeFilter === "week") return diffMs <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === "month") return diffMs <= 30 * 24 * 60 * 60 * 1000;
    return true;
  };

  const filteredNewsList = newsList.filter((art) => {
    const matchCat = !selectedCategory || (art.category || "Others") === selectedCategory;
    const matchTime = filterByTime(art.publishedAt);
    return matchCat && matchTime;
  });

  const filteredForumList = forumList.filter((thread) => {
    const matchCat = !selectedCategory || (thread.categoryName || "Others") === selectedCategory;
    const matchTime = filterByTime(thread.createdAt);
    return matchCat && matchTime;
  });

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto animate-fade-in mt-4 px-4">
        {/* Search Header */}
        <div className="text-center py-6 border-b border-[var(--color-border)] mb-4">
          <h1 className="m-0 font-serif-title font-black text-3xl md:text-4xl uppercase tracking-tight text-[var(--color-text-primary)]">
            Search Results
          </h1>
          {q.trim() ? (
            <p className="mt-2 font-serif italic text-xs md:text-sm text-[var(--color-text-secondary)]">
              Showing search results for &ldquo;<span className="text-[var(--color-accent)] font-semibold">{q}</span>&rdquo;
            </p>
          ) : (
            <p className="mt-2 font-serif italic text-xs md:text-sm text-[var(--color-text-secondary)]">
              Enter a search query in the header to find publications and discussions.
            </p>
          )}
        </div>

        {q.trim() && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Sidebar Filters */}
            <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24">
              {/* Category Filter */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/30">
                  <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Filters</span>
                  </h3>
                </div>
                <div className="p-3 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)] px-2 mb-1 block">
                    Category
                  </span>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      selectedCategory === null
                        ? "bg-[var(--color-accent)] text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-body)]/40 hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    All Categories ({activeTab === "news" ? newsList.length : forumList.length})
                  </button>

                  {(activeTab === "news" ? newsCategories : forumCategories).map((cat) => {
                    const count = activeTab === "news"
                      ? newsList.filter((art) => (art.category || "Others") === cat).length
                      : forumList.filter((thread) => (thread.categoryName || "Others") === cat).length;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-between ${
                          selectedCategory === cat
                            ? "bg-[var(--color-accent)] text-white shadow-sm"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-body)]/40 hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span className="truncate mr-2">{cat}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                          selectedCategory === cat ? "bg-white/20 text-white" : "bg-[var(--color-background-body)] text-[var(--color-text-secondary)]"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Filter */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-background-body)]/30">
                  <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Time Range</span>
                  </h3>
                </div>
                <div className="p-3 flex flex-col gap-1">
                  {[
                    { val: "all", label: "Anytime" },
                    { val: "24h", label: "Past 24 Hours" },
                    { val: "week", label: "Past Week" },
                    { val: "month", label: "Past Month" },
                  ].map(({ val, label }) => {
                    const count = activeTab === "news"
                      ? newsList.filter((art) => {
                          const matchCat = !selectedCategory || (art.category || "Others") === selectedCategory;
                          const date = new Date(art.publishedAt);
                          const diffMs = Date.now() - date.getTime();
                          if (val === "all") return matchCat;
                          if (val === "24h") return matchCat && diffMs <= 24 * 60 * 60 * 1000;
                          if (val === "week") return matchCat && diffMs <= 7 * 24 * 60 * 60 * 1000;
                          if (val === "month") return matchCat && diffMs <= 30 * 24 * 60 * 60 * 1000;
                          return false;
                        }).length
                      : forumList.filter((thread) => {
                          const matchCat = !selectedCategory || (thread.categoryName || "Others") === selectedCategory;
                          const date = new Date(thread.createdAt);
                          const diffMs = Date.now() - date.getTime();
                          if (val === "all") return matchCat;
                          if (val === "24h") return matchCat && diffMs <= 24 * 60 * 60 * 1000;
                          if (val === "week") return matchCat && diffMs <= 7 * 24 * 60 * 60 * 1000;
                          if (val === "month") return matchCat && diffMs <= 30 * 24 * 60 * 60 * 1000;
                          return false;
                        }).length;

                    return (
                      <button
                        key={val}
                        onClick={() => setTimeFilter(val)}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-between ${
                          timeFilter === val
                            ? "bg-[var(--color-accent)] text-white shadow-sm"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background-body)]/40 hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                          timeFilter === val ? "bg-white/20 text-white" : "bg-[var(--color-background-body)] text-[var(--color-text-secondary)]"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Main Panel */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="flex justify-center border-b border-[var(--color-border)] mb-6 gap-6">
                <button
                  onClick={() => handleTabChange("news")}
                  className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 active:scale-95 ${
                    activeTab === "news"
                      ? "border-[var(--color-accent)] text-[var(--color-accent)] font-extrabold"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  News Articles ({newsList.length})
                </button>
                <button
                  onClick={() => handleTabChange("forum")}
                  className={`pb-2.5 px-4 text-xs font-black uppercase tracking-wider transition-all duration-200 border-b-2 active:scale-95 ${
                    activeTab === "forum"
                      ? "border-[var(--color-accent)] text-[var(--color-accent)] font-extrabold"
                      : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Forum Discussions ({forumList.length})
                </button>
              </div>

              {/* Results Grid / List */}
              {isLoading ? (
                <LoadingBlock label="Searching website..." />
              ) : activeTab === "news" ? (
                filteredNewsList.length === 0 ? (
                  <div className="text-center py-16 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
                    <h3 className="m-0 font-serif-title font-black text-lg text-[var(--color-text-primary)]">
                      No News Articles Found
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      No articles found matching the active filters and keyword.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                    {filteredNewsList.map((art, idx) => (
                      <div
                        key={art.id}
                        className="group flex flex-col h-full overflow-hidden card"
                      >
                        {/* Image header */}
                        <div className="h-44 w-full relative overflow-hidden flex-shrink-0">
                          <img
                            src={getArticleImage(art.id, art.content, art.imageUrl)}
                            alt={art.title}
                            loading={idx < 6 ? "eager" : "lazy"}
                            fetchPriority={idx < 3 ? "high" : "auto"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                          <div className="absolute top-2 left-2 bg-[var(--color-accent)] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            {art.category || "Others"}
                          </div>
                        </div>
                        {/* Text body */}
                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-semibold text-[var(--color-text-secondary)]">
                              {new Date(art.publishedAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <Link href={`/news/${art.slug}`}>
                              <h4 className="m-0 font-serif-title font-black text-base leading-snug hover:text-[var(--color-accent)] cursor-pointer line-clamp-2 transition-colors">
                                {art.title}
                              </h4>
                            </Link>
                            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                              {art.summary}
                            </p>
                          </div>
                          <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 mt-1 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] font-semibold">
                                <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                                </svg>
                                {art.likes}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] font-semibold">
                                <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                {art.bookmarks}
                              </span>
                            </div>
                            <Link
                              href={`/news/${art.slug}`}
                              className="font-bold text-xs text-[var(--color-accent)] hover:opacity-85 transition-opacity"
                            >
                              Read Article →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : filteredForumList.length === 0 ? (
                <div className="text-center py-16 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
                  <h3 className="m-0 font-serif-title font-black text-lg text-[var(--color-text-primary)]">
                    No Forum Discussions Found
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    No discussions found matching the active filters and keyword.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredForumList.map((thread) => (
                    <div
                      key={thread.id}
                      className="p-5 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200 text-left"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold flex-wrap">
                            <span className="text-[var(--color-accent)] font-extrabold uppercase">
                              {thread.categoryName}
                            </span>
                            <span>·</span>
                            <span className="text-[var(--color-text-primary)]">@{thread.authorUsername}</span>
                            <span>·</span>
                            <span>
                              {new Date(thread.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <Link href={`/forum/threads/${thread.slug}`}>
                            <h4 className="m-0 font-serif-title font-black text-base text-[var(--color-text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors leading-snug">
                              {thread.title}
                            </h4>
                          </Link>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] shrink-0 font-bold">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{thread.replyCount}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                            </svg>
                            <span>{thread.likes}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PublicShell><LoadingBlock label="Loading Search" /></PublicShell>}>
      <SearchContent />
    </Suspense>
  );
}
