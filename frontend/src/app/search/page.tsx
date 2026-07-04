"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { data, http } from "@/shared/lib/api-client";
import type { NewsArticle } from "@/app/news/_types";
import type { ForumThread } from "@/app/forum/_types";

type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
};

type SearchResult = {
  news: PageResponse<NewsArticle>;
  forum: PageResponse<ForumThread>;
};

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState<"all" | "news" | "forum">("all");
  const [newsPage, setNewsPage] = useState(0);
  const [forumPage, setForumPage] = useState(0);

  const search = useQuery({
    queryKey: ["search", query, newsPage, forumPage],
    queryFn: () =>
      data<SearchResult>(
        http.get("/search", {
          params: {
            q: query,
            page: activeTab === "news" ? newsPage : activeTab === "forum" ? forumPage : 0,
            size: 20
          }
        })
      ),
    enabled: Boolean(query.trim())
  });

  const newsItems = search.data?.news.content ?? [];
  const forumItems = search.data?.forum.content ?? [];
  const totalNews = search.data?.news.totalElements ?? 0;
  const totalForum = search.data?.forum.totalElements ?? 0;

  return (
    <PublicShell>
      <div className="panel touchline p-6">
        <h1 className="display-face text-4xl font-black mb-2">Search Results</h1>
        <p className="text-sm opacity-60 mb-6">
          Found {totalNews + totalForum} results for <strong className="text-[var(--fv-clay)]">"{query}"</strong>
        </p>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-white/10 pb-3 mb-6">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            All ({totalNews + totalForum})
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "news"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            News ({totalNews})
          </button>
          <button
            onClick={() => setActiveTab("forum")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "forum"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            Forum ({totalForum})
          </button>
        </div>

        {search.isLoading && <LoadingBlock label="Searching..." />}
        {search.error && <ErrorBlock message="An error occurred while searching." />}

        {!search.isLoading && !search.error && totalNews === 0 && totalForum === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="h-16 w-16 text-white/20 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-xl font-bold mb-1">No results found</h3>
            <p className="text-sm opacity-60">Please try searching with a different keyword.</p>
          </div>
        )}

        {/* Results list */}
        <div className="grid gap-6">
          {/* News articles */}
          {(activeTab === "all" || activeTab === "news") && newsItems.length > 0 && (
            <div>
              {activeTab === "all" && <h2 className="text-lg font-black uppercase tracking-wider mb-3 opacity-80 text-[var(--fv-clay)]">News</h2>}
              <div className="grid gap-4">
                {newsItems.map((article) => (
                  <div key={article.id} className="border-b border-white/5 pb-4 last:border-0">
                    <Link
                      href={`/news/${article.slug}`}
                      className="text-lg font-bold hover:text-[var(--fv-grass, #10b981)] transition-colors"
                    >
                      {article.title}
                    </Link>
                    {article.summary && (
                      <p className="text-sm opacity-80 mt-1 line-clamp-2">{article.summary}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs opacity-50 mt-2">
                      {article.category && (
                        <span className="font-bold text-[var(--fv-clay)]">{article.category}</span>
                      )}
                      <span>
                        {new Date(article.publishedAt ?? "").toLocaleDateString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* News Pagination */}
              {activeTab === "news" && search.data && search.data.news.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                  <button
                    disabled={newsPage === 0}
                    onClick={() => setNewsPage((p) => p - 1)}
                    className="btn btn-secondary text-xs"
                  >
                    Previous
                  </button>
                  <span className="text-xs opacity-60">
                    Page {newsPage + 1} / {search.data.news.totalPages}
                  </span>
                  <button
                    disabled={newsPage >= search.data.news.totalPages - 1}
                    onClick={() => setNewsPage((p) => p + 1)}
                    className="btn btn-secondary text-xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Forum threads */}
          {(activeTab === "all" || activeTab === "forum") && forumItems.length > 0 && (
            <div className={activeTab === "all" && newsItems.length > 0 ? "mt-6 pt-6 border-t border-white/10" : ""}>
              {activeTab === "all" && <h2 className="text-lg font-black uppercase tracking-wider mb-3 opacity-80 text-[var(--fv-clay)]">Discussions</h2>}
              <div className="grid gap-4">
                {forumItems.map((thread) => (
                  <div key={thread.id} className="border-b border-white/5 pb-4 last:border-0">
                    <Link
                      href={`/forum/threads/${thread.slug}`}
                      className="text-lg font-bold hover:text-[var(--fv-grass, #10b981)] transition-colors"
                    >
                      {thread.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-3 text-xs opacity-50 mt-2">
                      <span className="bg-white/5 px-2 py-0.5 rounded text-[var(--fv-grass)] font-semibold">
                        {thread.category}
                      </span>
                      <span>Posted by @{thread.author}</span>
                      <span>{new Date(thread.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Forum Pagination */}
              {activeTab === "forum" && search.data && search.data.forum.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                  <button
                    disabled={forumPage === 0}
                    onClick={() => setForumPage((p) => p - 1)}
                    className="btn btn-secondary text-xs"
                  >
                    Previous
                  </button>
                  <span className="text-xs opacity-60">
                    Page {forumPage + 1} / {search.data.forum.totalPages}
                  </span>
                  <button
                    disabled={forumPage >= search.data.forum.totalPages - 1}
                    onClick={() => setForumPage((p) => p + 1)}
                    className="btn btn-secondary text-xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PublicShell><LoadingBlock label="Loading..." /></PublicShell>}>
      <SearchResults />
    </Suspense>
  );
}
