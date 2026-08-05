"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import { formatDate } from "@/shared/lib/format";

type ClusterDecision = {
  id: number;
  rawItemId: number;
  selectedStoryId: number | null;
  action: string;
  model: string;
  modelRevision?: string;
  semanticScore?: number;
  lexicalScore?: number;
  entityScore?: number;
  timeScore?: number;
  finalScore?: number;
  reasonCode: string;
  candidateSnapshot?: string;
  createdAt: string;
};

export default function AdminAiEnginePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(0);

  // Query real cluster decisions from backend
  const { data: decisions = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "ai-clusters", page],
    queryFn: () => data<ClusterDecision[]>(http.get("/admin/news/clusters/decisions", { params: { page, size: 30 } })),
  });

  // Re-cluster pipeline mutation
  const crawlMutation = useMutation({
    mutationFn: () => data<any>(http.post("/admin/news/crawl")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ai-clusters"] });
      toast({ body: "AI Clustering engine executed. Refreshed vector decisions log.", type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to run clustering engine."), type: "error" }),
  });

  if (isLoading) return <LoadingBlock label="Loading AI Vector & Story Clustering metrics" />;

  const totalDecisions = decisions.length;
  const createdCount = decisions.filter((d) => d.action === "CREATE_NEW_STORY" || d.action === "STORY_CREATED").length;
  const mergedCount = decisions.filter((d) => d.action === "ATTACH_EXISTING_STORY" || d.action === "MERGED").length;

  return (
    <div className="flex flex-col gap-6 w-full">
      {error ? <ErrorBlock message="Failed to fetch AI cluster decisions." onRetry={() => refetch()} /> : null}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-xl font-black font-serif-title tracking-tight m-0 text-[var(--color-text-primary)]">
            AI & Vector Story Clustering Engine
          </h1>
          <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mt-0.5">
            Monitor Gemini API model performance, pgvector 384-dim semantic similarity scores, and story group decisions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="py-2 px-4 rounded-full text-xs font-bold transition-all border border-[var(--color-border)] bg-white/5 hover:bg-white/10 active:scale-[0.98] cursor-pointer"
          >
            Refresh Decisions Log
          </button>
          <button
            onClick={() => crawlMutation.mutate()}
            disabled={crawlMutation.isPending}
            className="py-2 px-5 rounded-full text-xs font-black uppercase tracking-wider bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md"
          >
            {crawlMutation.isPending ? "Executing AI Engine..." : "Run AI Re-Clustering"}
          </button>
        </div>
      </div>

      {/* Model Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">AI Model Provider</div>
          <div className="text-base font-bold text-[var(--color-text-primary)] font-mono">Google Gemini 3.5 Flash</div>
          <div className="text-[10px] text-[var(--color-accent)] font-medium">Vector Embedding: 384 dimensions</div>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Clustering Algorithm</div>
          <div className="text-base font-bold text-[var(--color-text-primary)] font-mono">Hybrid Vector + Lexical</div>
          <div className="text-[10px] text-emerald-400 font-medium">pgvector Cosine Distance</div>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Decisions Logged</div>
          <div className="text-xl font-bold font-mono text-[var(--color-accent)]">{totalDecisions}</div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">Recent raw item decisions</div>
        </div>

        <div className="card p-4 flex flex-col gap-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">Story Merge Ratio</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {totalDecisions > 0 ? Math.round((mergedCount / totalDecisions) * 100) : 0}%
          </div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">{mergedCount} merged / {createdCount} new</div>
        </div>
      </div>

      {/* Vector Score Weights Info */}
      <div className="card p-5 flex flex-col gap-3 border-l-4 border-l-[var(--color-accent)] bg-black/10">
        <div className="text-xs font-bold text-[var(--color-text-primary)] flex items-center justify-between">
          <span>Vector Scoring Function Weights</span>
          <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">S_final = 0.45 S_sem + 0.25 S_lex + 0.20 S_ent + 0.10 S_time</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px]">
          <div className="p-2.5 rounded bg-black/20 border border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)] block text-[10px]">Semantic (0.45)</span>
            <span className="font-bold text-[var(--color-accent)]">Gemini Embeddings</span>
          </div>
          <div className="p-2.5 rounded bg-black/20 border border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)] block text-[10px]">Lexical (0.25)</span>
            <span className="font-bold text-gray-300">Jaccard N-gram</span>
          </div>
          <div className="p-2.5 rounded bg-black/20 border border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)] block text-[10px]">Entity (0.20)</span>
            <span className="font-bold text-emerald-400">Named Entities</span>
          </div>
          <div className="p-2.5 rounded bg-black/20 border border-[var(--color-border)]">
            <span className="text-[var(--color-text-secondary)] block text-[10px]">Time Decay (0.10)</span>
            <span className="font-bold text-blue-400">72-hour Half-life</span>
          </div>
        </div>
      </div>

      {/* Cluster Decisions Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
            Raw News Item Vector Decision Audit Log
          </span>
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
            Page {page + 1}
          </span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-black/10">
                {["Decision ID", "Raw Item", "Story ID", "AI Action", "Semantic Score", "Final Score", "Reason Code", "Timestamp"].map((h) => (
                  <th key={h} className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-left text-[var(--color-text-secondary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs italic text-[var(--color-text-secondary)]">
                    No AI clustering decisions logged yet. Run AI Re-Clustering to evaluate raw stories.
                  </td>
                </tr>
              ) : (
                decisions.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.03] transition-colors border-b border-[var(--color-border)] last:border-0 font-mono">
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">#{d.id}</td>
                    <td className="py-3 px-4 font-bold text-[var(--color-text-primary)]">Item #{d.rawItemId}</td>
                    <td className="py-3 px-4 text-[var(--color-accent)] font-bold">
                      {d.selectedStoryId ? `Story #${d.selectedStoryId}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          d.action.includes("CREATE") || d.action.includes("STORY_CREATED")
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {d.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-primary)]">
                      {d.semanticScore != null ? Number(d.semanticScore).toFixed(4) : "N/A"}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {d.finalScore != null ? Number(d.finalScore).toFixed(4) : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-[var(--color-text-secondary)] truncate max-w-xs">
                      {d.reasonCode}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap">
                      {formatDate(d.createdAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded text-xs font-bold border border-[var(--color-border)] disabled:opacity-40 cursor-pointer"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={decisions.length < 30}
            className="px-3 py-1 rounded text-xs font-bold border border-[var(--color-border)] disabled:opacity-40 cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
