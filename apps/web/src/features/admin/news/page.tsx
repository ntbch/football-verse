"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { formatDate } from "@/shared/lib/format";
import type { NewsArticleResponse, NewsCategoryResponse } from "@/features/news/types";
import type { PageResponse } from "@/shared/lib/api-types";
import { useToast } from "@/shared/components/toast";

type StatusTab = "PUBLISHED" | "DRAFT" | "ARCHIVED";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  PUBLISHED: { bg: "rgba(74,124,89,0.15)", color: "#4a7c59" },
  DRAFT: { bg: "rgba(180,95,53,0.15)", color: "var(--color-accent)" },
  ARCHIVED: { bg: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" },
};

export default function AdminNewsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<StatusTab>("PUBLISHED");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const size = 15;

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: qk.admin.newsCategories(),
    queryFn: () => data<NewsCategoryResponse[]>(http.get("/admin/news/categories")),
  });

  const dateParams = useMemo(() => {
    if (!selectedDate) return { startDate: "", endDate: "" };
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      };
    } catch (e) {
      return { startDate: "", endDate: "" };
    }
  }, [selectedDate]);

  useEffect(() => {
    setPage(0);
  }, [search, selectedDate, selectedCategoryId]);

  // Fetch real status counts
  const { data: dbCounts = { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 } } = useQuery({
    queryKey: [qk.admin.news()[0], "counts", search, dateParams.startDate, dateParams.endDate, selectedCategoryId],
    queryFn: () => data<Record<StatusTab, number>>(http.get("/admin/news/meta/counts", { 
      params: { 
        search, 
        startDate: dateParams.startDate, 
        endDate: dateParams.endDate,
        categoryId: selectedCategoryId || undefined
      } 
    })),
  });

  // Fetch page filtered by status
  const { data: pageData, isLoading, error, refetch } = useQuery({
    queryKey: [qk.admin.news()[0], page, size, tab, search, dateParams.startDate, dateParams.endDate, selectedCategoryId],
    queryFn: () => data<PageResponse<NewsArticleResponse>>(http.get("/admin/news", { 
      params: { 
        page, 
        size, 
        status: tab, 
        search, 
        startDate: dateParams.startDate, 
        endDate: dateParams.endDate,
        categoryId: selectedCategoryId || undefined
      } 
    })),
  });

  const allArticles = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => data<any>(http.delete(`/admin/news/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.news() });
      toast({ body: "Article deleted successfully.", type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to delete article."), type: "error" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      data<any>(http.patch(`/admin/news/${id}/status`, { status })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.news() });
      toast({ body: "Article publication status updated.", type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update status."), type: "error" }),
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    statusMutation.mutate({ id, status: newStatus });
  };

  const filtered = useMemo(() => {
    return [...allArticles].sort((a, b) => {
      if (tab !== "PUBLISHED") {
        return b.id - a.id;
      }
      const da = new Date(a.publishedAt ?? 0).getTime();
      const db = new Date(b.publishedAt ?? 0).getTime();
      if (db === da) return b.id - a.id;
      return db - da;
    });
  }, [allArticles, tab]);

  if (isLoading) return <LoadingBlock label="Fetching article repository" />;
  if (error && !pageData) return <ErrorBlock message="Article repository could not be loaded." onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-5 w-full">
      {error ? <ErrorBlock message="Article repository could not be refreshed. Showing the last available results." onRetry={() => refetch()} /> : null}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-xl font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            News CMS & Editorial Center
          </h1>
          <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mt-0.5">
            Manage stories, drafts, categories, and automated ingestion publishing
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative w-48 hidden sm:block">
            <input
              placeholder="Search title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-black/10 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)] transition-all"
            />
            <svg className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <Link href="/admin/news/new" className="shrink-0">
            <button className="py-2 px-4 rounded-full text-xs font-black uppercase tracking-wider bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md">
              Write New Story
            </button>
          </Link>
        </div>
      </div>

      {/* Status Tabs & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)]">
        {/* Left: Status Tabs */}
        <div className="flex items-center gap-1">
          {(["PUBLISHED", "DRAFT", "ARCHIVED"] as StatusTab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(0); }}
              className={`px-4 py-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                tab === t ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t} ({dbCounts[t] ?? 0})
            </button>
          ))}
        </div>

        {/* Right: Category filter & Date Picker */}
        <div className="flex flex-wrap items-center gap-2 pb-2 shrink-0">
          {/* Category Dropdown */}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="text-xs font-semibold border border-[var(--color-border)] rounded-full px-3 py-1.5 bg-black/10 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold border border-[var(--color-border)] rounded-full px-3 py-1.5 bg-black/10 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-[var(--color-border)] rounded-full transition-all text-[var(--color-text-primary)]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Listing */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-black/10 text-[var(--color-text-secondary)] font-bold text-[10px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Likes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Published At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-[var(--color-text-secondary)] italic">
                    No {tab.toLowerCase()} articles found matching your active filters.
                  </td>
                </tr>
              ) : (
                filtered.map((art) => (
                  <tr key={art.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-bold max-w-sm truncate text-[var(--color-text-primary)]">
                      {art.title}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {art.category || "General"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-[var(--color-text-primary)] font-mono">
                        <span>{art.likes}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={art.status}
                        onChange={(e) => handleStatusChange(art.id, e.target.value)}
                        className="text-[10px] font-black rounded px-2.5 py-1 border cursor-pointer focus:outline-none"
                        style={{
                          background: STATUS_STYLES[art.status]?.bg || "rgba(0,0,0,0.1)",
                          color: STATUS_STYLES[art.status]?.color || "var(--color-text-primary)",
                          borderColor: `${STATUS_STYLES[art.status]?.color || "var(--color-border)"}40`
                        }}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {formatDate(art.publishedAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Link href={`/news/${art.slug}`} target="_blank">
                          <button className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border border-[var(--color-border)] transition-all bg-white/5 hover:bg-white/10 text-[var(--color-text-primary)] cursor-pointer">
                            View
                          </button>
                        </Link>
                        <Link href={`/admin/news/${art.id}`}>
                          <button className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border border-[var(--color-accent)]/30 transition-all bg-[var(--color-accent)]/15 hover:bg-[var(--color-accent)]/25 text-[var(--color-accent)] cursor-pointer">
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(art.id)}
                          className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border border-red-500/20 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="py-1.5 px-3 rounded text-xs font-bold border border-[var(--color-border)] bg-white/5 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono px-3 py-1.5 card" style={{ color: "var(--color-text-secondary)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="py-1.5 px-3 rounded text-xs font-bold border border-[var(--color-border)] bg-white/5 hover:bg-white/10 disabled:opacity-40 cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
