"use client";

import React, { useState } from"react";
import Link from"next/link";
import { useQuery } from"@tanstack/react-query";
import { PublicShell } from"@/shared/components/page-shell";
import { qk } from"@/shared/lib/query-keys";
import { http, data } from"@/shared/lib/api-client";
import { NewsArticleResponse, NewsCategoryResponse, PageResponse } from"@/shared/lib/types";
import { getArticleImage } from"@/shared/lib/images";
import { LoadingBlock } from"@/shared/components/state-blocks";

export default function NewsListingPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const size = 12;

  // 1. Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: qk.admin.newsCategories(),
    queryFn: () => data<NewsCategoryResponse[]>(http.get("/news/categories")),
  });

  // 2. Fetch news articles page
  const { data: pageData, isLoading } = useQuery({
    queryKey: [qk.news.list()[0], selectedCategory, page] as const,
    queryFn: () => {
      const params: any = { page, size };
      if (selectedCategory !== null) {
        params.categories = selectedCategory;
      }
      return data<PageResponse<NewsArticleResponse>>(http.get("/news", { params }));
    },
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
          <h1 className="m-0 font-serif font-black text-4xl md:text-5xl uppercase tracking-tight text-[var(--color-text-primary)]">
            The Touchline News
          </h1>
          <p className="mt-2 font-serif italic text-sm md:text-base text-[var(--color-text-secondary)]">
            crawled updates, columns, and editorial publications
          </p>
        </div>

        {/* Categories Navigation Bar */}
        <div className="py-2 border-b border-[var(--color-border)] overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-2 min-w-max pb-1">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all-300 ${
                selectedCategory === null
                  ?"bg-[var(--fv-clay)] text-white shadow-sm"
                  :"bg-[var(--color-background-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              All Articles
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all-300 ${
                  selectedCategory === cat.id
                    ?"bg-[var(--fv-clay)] text-white shadow-sm"
                    :"bg-[var(--color-background-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <LoadingBlock label="Loading Publications" />
        ) : articles.length === 0 ? (
          <div className="text-center py-16 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
            <h3 className="m-0 font-serif font-black text-xl text-[var(--color-text-primary)]">No Articles Found</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">No published articles available in this category yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Grid layout for news articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {articles.map((art) => (
                <div
                  key={art.id}
                  className="group flex flex-col h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] shadow-premium shadow-premium-hover transition-all-300"
                >
                  <div className="h-48 w-full relative overflow-hidden">
                    <img
                      src={getArticleImage(art.id, art.content)}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-[var(--fv-clay)] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {art.category ||"General"}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-semibold text-[var(--color-text-secondary)]">
                        {new Date(art.publishedAt).toLocaleDateString("en-US", {
                          year:"numeric",
                          month:"short",
                          day:"numeric",
                        })}
                      </span>
                      <Link href={`/news/${art.slug}`}>
                        <h4 className="m-0 font-serif font-black text-lg leading-snug hover:text-[var(--color-accent)] cursor-pointer line-clamp-2 transition-all-300">
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
                          👍 {art.likes}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)] font-semibold">
                          🔖 {art.bookmarks}
                        </span>
                      </div>
                      <Link
                        href={`/news/${art.slug}`}
                        className="font-bold text-[var(--color-accent)] hover:opacity-80 transition-all-300"
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
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border border-[var(--color-border)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-all-300"
                >
                  Previous
                </button>
                <span className="text-xs font-semibold px-4 py-2 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-full text-[var(--color-text-secondary)]">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border border-[var(--color-border)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-all-300"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
