"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import type { NewsArticleResponse, PageResponse } from "@/shared/lib/types";
import { useToast } from "@/shared/components/toast";

export default function AdminNewsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const size = 15;

  // 1. Fetch articles page
  const { data: pageData, isLoading } = useQuery({
    queryKey: [qk.admin.news()[0], page] as const,
    queryFn: () => data<PageResponse<NewsArticleResponse>>(http.get("/admin/news", { params: { page, size } })),
  });

  const articles = pageData?.content || [];
  const totalPages = pageData?.totalPages || 0;

  // 2. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => data<any>(http.delete(`/admin/news/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.news() });
      toast({
        body: "Article deleted successfully.",
        type: "info",
        autoHideDuration: 3000,
      });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to delete article."),
        type: "error",
      });
    },
  });

  // 3. Status Toggle Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      data<any>(http.patch(`/admin/news/${id}/status`, { status })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.news() });
      toast({
        body: "Article status updated.",
        type: "info",
        autoHideDuration: 3000,
      });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to update article status."),
        type: "error",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: number, newStatus: string) => {
    statusMutation.mutate({ id, status: newStatus });
  };

  if (isLoading) {
    return <LoadingBlock label="Fetching article repository" />;
  }

  return (
    <div className="flex flex-col gap-4 w-full text-white">
      <div className="flex items-center justify-between w-full flex-wrap gap-2">
        <h3 className="font-serif-title text-xl md:text-2xl font-black tracking-tight text-white m-0">
          Editorial Publications CMS
        </h3>
        <Link href="/admin/news/new">
          <button type="button" className="btn btn-primary !rounded-full !px-4 !py-2 !text-xs">
            Write New Article
          </button>
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-secondary)] font-bold">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Likes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Published At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-[var(--color-text-secondary)] italic">
                    No articles found in the repository.
                  </td>
                </tr>
              ) : (
                articles.map((art) => (
                  <tr key={art.id} className="hover:bg-[var(--color-background-body)] text-white">
                    <td className="py-3 px-4 font-bold max-w-xs truncate">{art.title}</td>
                    <td className="py-3 px-4">{art.category || "General"}</td>
                    <td className="py-3 px-4 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                      </svg>
                      <span>{art.likes}</span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={art.status}
                        onChange={(e) => handleStatusChange(art.id, e.target.value)}
                        className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-[10px] font-bold rounded p-1 focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Link href={`/admin/news/${art.id}`}>
                          <button className="btn btn-sm !bg-slate-700 hover:!bg-slate-600 !text-white text-[9px] font-bold uppercase rounded px-2.5 py-1 transition-colors">
                            Edit
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(art.id)}
                          className="btn btn-sm !bg-red-800 hover:!bg-red-700 !text-white text-[9px] font-bold uppercase rounded px-2.5 py-1 transition-colors"
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
            className="btn btn-secondary !px-4 !py-2 !text-xs"
          >
            Previous
          </button>
          <span className="text-xs font-semibold px-4 py-2 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded text-gray-300">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn btn-secondary !px-4 !py-2 !text-xs"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
