"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

type ForumReport = {
  id: number;
  targetType: "THREAD" | "POST";
  targetId: number;
  reporter: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  createdAt?: string;
};

type StatusFilter = "ALL" | "OPEN" | "RESOLVED";

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<StatusFilter>("OPEN");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // 1. Fetch Reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: qk.admin.reports(),
    queryFn: () => data<ForumReport[]>(http.get("/admin/forum/reports")),
  });

  // 2. Resolve Report Mutation
  const resolveMutation = useMutation({
    mutationFn: (id: number) => data<ForumReport>(http.patch(`/admin/forum/reports/${id}/resolve`)),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.reports() });
      toast({ body: `Report #${r.id} resolved.`, type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to resolve."), type: "error" }),
  });

  // 3. Hide Thread Mutation
  const hideThreadMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<any>(http.patch(`/admin/forum/threads/${id}/hide`, null, { params: { value } })),
    onSuccess: () => {
      toast({ body: "Thread hidden successfully.", type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to hide thread."), type: "error" }),
  });

  // 4. Hide Post Mutation
  const hidePostMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<any>(http.patch(`/admin/forum/posts/${id}/hide`, null, { params: { value } })),
    onSuccess: () => {
      toast({ body: "Post hidden successfully.", type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to hide post."), type: "error" }),
  });

  // 5. Lock Thread Mutation
  const lockThreadMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<any>(http.patch(`/admin/forum/threads/${id}/lock`, null, { params: { value } })),
    onSuccess: () => {
      toast({ body: "Thread locked successfully.", type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to lock thread."), type: "error" }),
  });

  const counts = useMemo(() => ({
    ALL: reports.length,
    OPEN: reports.filter((r) => r.status === "OPEN").length,
    RESOLVED: reports.filter((r) => r.status === "RESOLVED").length,
  }), [reports]);

  const sortedReports = useMemo(() => {
    let base = filter === "ALL" ? reports : reports.filter((r) => r.status === filter);
    
    // Filter by selected date
    if (selectedDate) {
      base = base.filter((r) => {
        if (!r.createdAt) return false;
        
        // 1. Direct substring match (e.g. "2026-07-02")
        if (r.createdAt.startsWith(selectedDate)) return true;
        
        try {
          const d = new Date(r.createdAt);
          if (isNaN(d.getTime())) return false;
          
          // 2. Local date match
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const localDateStr = `${year}-${month}-${day}`;
          if (localDateStr === selectedDate) return true;
          
          // 3. UTC date match
          const utcDateStr = d.toISOString().split("T")[0];
          if (utcDateStr === selectedDate) return true;
        } catch (e) {}
        
        return false;
      });
    }

    return [...base].sort((a, b) => {
      const da = new Date(a.createdAt ?? 0).getTime();
      const db = new Date(b.createdAt ?? 0).getTime();
      return db - da;
    });
  }, [reports, filter, selectedDate]);

  // Selected report details
  const selectedReport = useMemo(() => {
    if (selectedReportId !== null) {
      return sortedReports.find((r) => r.id === selectedReportId) || null;
    }
    return sortedReports[0] || null;
  }, [sortedReports, selectedReportId]);

  // Reset selection on filter or date change
  useEffect(() => {
    setSelectedReportId(null);
  }, [filter, selectedDate]);

  if (isLoading) return <LoadingBlock label="Fetching moderation reports" />;

  return (
    <div className="flex flex-col gap-4 w-full h-[calc(100vh-48px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Report Queue</h1>
          <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{counts.OPEN} open reports</span>
        </div>
        
        {/* Date Filter & Mod Panel Tag */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[10px] font-semibold border rounded-full px-3 py-1.5 focus:outline-none"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-background-body)",
                color: "var(--color-text-primary)",
              }}
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 border rounded-full transition-all"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-full text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-red-500/10 text-red-600 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            Moderation Panel
          </div>
        </div>
      </div>

      {/* Stats pills */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {(["ALL", "OPEN", "RESOLVED"] as StatusFilter[]).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`card p-3 flex flex-col gap-0.5 text-left hover:shadow-md transition-shadow active:scale-[0.98] border-b-3 ${
              filter === s ? "!border-b-[var(--color-accent)] bg-black/[0.01]" : "!border-b-transparent"
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{s}</span>
            <span className="text-lg font-black font-serif-title" style={{ color: s === "OPEN" ? "#b91c1c" : s === "RESOLVED" ? "#4a7c59" : "var(--color-text-primary)" }}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Double Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Left Panel: Report list explorer */}
        <div className="flex flex-col gap-2 h-full min-h-0">
          <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: "var(--color-text-secondary)" }}>Report Logs</span>
          
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
            {sortedReports.length === 0 ? (
              <div className="card p-8 text-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                No {filter.toLowerCase()} reports found {selectedDate ? "on this date" : ""}.
              </div>
            ) : sortedReports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReportId(r.id)}
                className={`card p-4 text-left transition-all hover:shadow-sm shrink-0 flex flex-col gap-1.5 border-l-3 ${
                  selectedReport?.id === r.id
                    ? "!border-l-[var(--color-accent)] bg-black/[0.01]"
                    : "!border-l-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px]" style={{ color: "var(--color-text-secondary)" }}>Report #{r.id}</span>
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase" style={
                    r.targetType === "THREAD"
                      ? { background: "rgba(180,95,53,0.12)", color: "var(--color-accent)" }
                      : { background: "rgba(109,113,95,0.12)", color: "var(--color-text-secondary)" }
                  }>
                    {r.targetType}
                  </span>
                </div>
                <p className="text-xs font-bold truncate m-0" style={{ color: "var(--color-text-primary)" }}>
                  {r.reason}
                </p>
                <div className="flex items-center justify-between text-[9px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  <span>by @{r.reporter}</span>
                  <span className="font-mono">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Selected Report review details */}
        <div className="lg:col-span-2 h-full min-h-0">
          {selectedReport ? (
            <div className="card p-5 flex flex-col h-full min-h-0">
              {/* Header Details */}
              <div className="flex items-start justify-between gap-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>
                    Report Details #{selectedReport.id}
                  </span>
                  <h3 className="font-serif-title font-black text-sm m-0 mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                    Reported Reason: {selectedReport.reason}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                  selectedReport.status === "OPEN"
                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                    : "bg-green-500/10 text-green-600 border-green-500/20"
                }`}>
                  {selectedReport.status}
                </span>
              </div>

              {/* Information Rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs py-3 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Reporter</span>
                  <span className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>@{selectedReport.reporter}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Report Date</span>
                  <span className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
                    {selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Target Content Type</span>
                  <span className="font-bold font-mono text-sm text-[var(--color-accent)]">{selectedReport.targetType}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Target Database ID</span>
                  <span className="font-bold font-mono text-sm" style={{ color: "var(--color-text-primary)" }}>ID: {selectedReport.targetId}</span>
                </div>
              </div>

              {/* Action Buttons section */}
              <div className="flex flex-col gap-3 pt-4 mt-2 shrink-0">
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Administrative Actions</span>
                
                <div className="flex flex-wrap gap-2">
                  {selectedReport.status === "OPEN" && (
                    <button
                      onClick={() => resolveMutation.mutate(selectedReport.id)}
                      className="px-4 py-2 bg-[#4a7c59] hover:opacity-90 text-white rounded-full text-xs font-bold transition-all"
                    >
                      Resolve & Close Report
                    </button>
                  )}

                  {selectedReport.targetType === "THREAD" ? (
                    <>
                      <button
                        onClick={() => hideThreadMutation.mutate({ id: selectedReport.targetId, value: true })}
                        className="px-4 py-2 bg-red-600/10 text-red-600 hover:bg-red-600/20 rounded-full text-xs font-bold transition-all border border-red-500/20"
                      >
                        Hide reported thread
                      </button>
                      <button
                        onClick={() => lockThreadMutation.mutate({ id: selectedReport.targetId, value: true })}
                        className="px-4 py-2 bg-amber-600/10 text-amber-600 hover:bg-amber-600/20 rounded-full text-xs font-bold transition-all border border-amber-500/20"
                      >
                        Lock reported thread
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => hidePostMutation.mutate({ id: selectedReport.targetId, value: true })}
                      className="px-4 py-2 bg-red-600/10 text-red-600 hover:bg-red-600/20 rounded-full text-xs font-bold transition-all border border-red-500/20"
                    >
                      Hide reported post
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[10px] italic mt-auto pt-3 border-t" style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                Resolving a report closes the ticket. Hiding target contents immediately blocks them from the public forum view.
              </div>
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
              Select a report log from the list to begin review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
