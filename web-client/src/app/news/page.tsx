"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import type { NewsArticleResponse, NewsCategoryResponse, PageResponse } from "@/shared/lib/types";
import { getArticleImage } from "@/shared/lib/images";
import { LoadingBlock } from "@/shared/components/state-blocks";

export default function NewsListingPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
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

  const articles = pageData?.content || [];
  const totalPages = pageData?.totalPages || 0;

  const handleCategoryChange = (catId: number | null) => {
    setSelectedCategory(catId);
    setPage(0);
  };

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        {/* Editorial Title Banner */}
        <div className="text-center py-6 border-b border-[var(--color-border)]">
          <h1 className="m-0 font-serif-title font-black text-4xl md:text-5xl uppercase tracking-tight text-[var(--color-text-primary)]">
            The Touchline News
          </h1>
          <p className="mt-2 font-serif italic text-sm md:text-base text-[var(--color-text-secondary)]">
            crawled updates, columns, and editorial publications
          </p>
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24">
            {/* Categories Box */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                  📰 Categories
                </h3>
              </div>
              <div className="p-3 flex flex-col gap-1">
                <button
                  onClick={() => handleCategoryChange(null)}
                  className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    selectedCategory === null
                      ? "bg-[var(--color-accent)] text-white shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  All Articles
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      selectedCategory === cat.id
                        ? "bg-[var(--color-accent)] text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Articles Widget */}
            {articles.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                  <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[var(--color-accent)] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1014.12 11.88" />
                    </svg>
                    <span>Trending</span>
                  </h3>
                </div>
                <div className="p-3 flex flex-col divide-y divide-gray-50">
                  {[...articles]
                    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
                    .slice(0, 4)
                    .map((art, idx) => (
                      <Link
                        key={art.id}
                        href={`/news/${art.slug}`}
                        className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-lg font-black text-[var(--color-accent)]/40 leading-none mt-0.5 tabular-nums">
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

            {/* Quick Info Card */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
                  </svg>
                  <span>Overview</span>
                </h3>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">Total Articles</span>
                  <span className="font-black text-[var(--color-accent)] tabular-nums">
                    {pageData?.totalElements ?? articles.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">Categories</span>
                  <span className="font-black tabular-nums">{categories.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">Current Page</span>
                  <span className="font-black tabular-nums">
                    {page + 1} / {totalPages || 1}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Articles Panel */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <LoadingBlock label="Loading Publications" />
            ) : articles.length === 0 ? (
              <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
                <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
                  No Articles Found
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No published articles available in this category yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Vertical grid layout for news articles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {articles.map((art) => (
                    <div
                      key={art.id}
                      className="group flex flex-col h-full overflow-hidden card"
                    >
                      {/* Vertical Image header */}
                      <div className="h-48 w-full relative overflow-hidden flex-shrink-0">
                        <img
                          src={getArticleImage(art.id, art.content)}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-[var(--color-accent)] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          {art.category || "General"}
                        </div>
                      </div>
                      {/* Vertical text body */}
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
                            <h4 className="m-0 font-serif-title font-black text-lg leading-snug hover:text-[var(--color-accent)] cursor-pointer line-clamp-2 transition-colors">
                              {art.title}
                            </h4>
                          </Link>
                          <p className="text-xs text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                            {art.summary}
                          </p>
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3.5 mt-1 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] font-semibold">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                              </svg>
                              {art.likes}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] font-semibold">
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              {art.bookmarks}
                            </span>
                          </div>
                          <Link
                            href={`/news/${art.slug}`}
                            className="font-bold text-[var(--color-accent)] hover:opacity-85 transition-opacity"
                          >
                            Read Full Article →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <button
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="btn btn-secondary !px-4 !py-2 !text-xs"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-semibold px-4 py-2 border border-[var(--color-border)] bg-white rounded-full text-[var(--color-text-secondary)]">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      className="btn btn-secondary !px-4 !py-2 !text-xs"
                    >
                      Next
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
