"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import { ReportDetailDrawer, ModReportDetail } from "../components/report-detail-drawer";

type ModReport = {
  id: number;
  targetType: "THREAD" | "POST";
  targetId: number;
  reporter: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
};

export default function ModeratorReportsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "THREAD" | "POST">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("OPEN");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeReport, setActiveReport] = useState<ModReportDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 1. Fetch moderator reports
  const { data: reports = [], isLoading, error, refetch } = useQuery({
    queryKey: qk.moderator.reports(),
    queryFn: () => data<ModReport[]>(http.get("/moderator/forum/reports")),
  });

  // 2. Resolve Report Mutation
  const resolveMutation = useMutation({
    mutationFn: (id: number) => data<ModReport>(http.patch(`/moderator/forum/reports/${id}/resolve`)),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: qk.moderator.reports() });
      queryClient.invalidateQueries({ queryKey: qk.moderator.stats() });
      toast({
        body: `Report #${updated.id} resolved.`,
        type: "info",
        autoHideDuration: 3000,
      });
      setSelectedIds((prev) => prev.filter((i) => i !== updated.id));
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to resolve report."),
        type: "error",
      });
    },
  });

  const handleResolve = (id: number) => {
    resolveMutation.mutate(id);
  };

  const handleBatchResolve = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => resolveMutation.mutate(id));
    toast({
      body: `Resolving ${selectedIds.length} selected reports...`,
      type: "info",
      autoHideDuration: 3000,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredReports.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenInspect = (report: ModReport) => {
    setActiveReport(report);
    setDrawerOpen(true);
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (typeFilter !== "ALL" && r.targetType !== typeFilter) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchReporter = r.reporter.toLowerCase().includes(q);
        const matchReason = r.reason.toLowerCase().includes(q);
        const matchId = r.id.toString().includes(q) || r.targetId.toString().includes(q);
        return matchReporter || matchReason || matchId;
      }
      return true;
    });
  }, [reports, typeFilter, statusFilter, search]);

  if (isLoading) {
    return <LoadingBlock label="Fetching reported content" />;
  }
  if (error && reports.length === 0) return <ErrorBlock message="Reported content could not be loaded." onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-5 w-full">
      {error ? <ErrorBlock message="Reported content could not be refreshed. Showing the last available results." onRetry={() => refetch()} /> : null}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-xl font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            Flagged Queue
          </h1>
          <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mt-0.5">
            Review user-flagged threads and comments for community policy violations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--color-text-secondary)] px-3 py-1 rounded bg-black/10 border border-[var(--color-border)]">
            {filteredReports.length} / {reports.length} Reports
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by reporter, reason, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Filter Badges & Batch Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Type Filter */}
          <div className="flex items-center rounded border border-[var(--color-border)] p-0.5 bg-black/10 text-xs">
            {(["ALL", "THREAD", "POST"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                  typeFilter === t ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {t === "ALL" ? "All Types" : t}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center rounded border border-[var(--color-border)] p-0.5 bg-black/10 text-xs">
            {(["ALL", "OPEN", "RESOLVED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                  statusFilter === s ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Batch action button */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchResolve}
              className="py-1.5 px-3 rounded text-[10px] font-black uppercase transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: "#4a7c59", color: "#ffffff" }}
            >
              Resolve Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-background-body)" }}>
                <th className="py-3 px-4 w-10 text-left">
                  <input
                    type="checkbox"
                    checked={filteredReports.length > 0 && selectedIds.length === filteredReports.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="accent-[var(--color-accent)] cursor-pointer"
                  />
                </th>
                {["Report ID", "Target Type", "Content ID", "Reporter", "Flag Reason", "Status", "Actions"].map((h, i) => (
                  <th
                    key={h}
                    className={`py-3 px-4 text-[10px] font-black uppercase tracking-wider ${i === 6 ? "text-right" : "text-left"}`}
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs italic text-[var(--color-text-secondary)]">
                    No reports found matching your active filters.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, i) => (
                  <tr
                    key={report.id}
                    onClick={() => handleOpenInspect(report)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    style={{ borderBottom: i < filteredReports.length - 1 ? "1px solid var(--color-border)" : undefined }}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(report.id)}
                        onChange={() => handleToggleSelect(report.id)}
                        className="accent-[var(--color-accent)] cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] font-bold text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)] transition-colors">
                      #{report.id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                        style={{
                          background: report.targetType === "THREAD" ? "rgba(180,95,53,0.12)" : "rgba(74,124,89,0.12)",
                          color: report.targetType === "THREAD" ? "var(--color-accent)" : "#4a7c59",
                        }}
                      >
                        {report.targetType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      ID: {report.targetId}
                    </td>
                    <td className="py-3 px-4 font-bold text-[var(--color-text-primary)]">
                      @{report.reporter}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[var(--color-text-secondary)]" title={report.reason}>
                      {report.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                        style={{
                          background: report.status === "OPEN" ? "rgba(185,28,28,0.12)" : "rgba(74,124,89,0.12)",
                          color: report.status === "OPEN" ? "#b91c1c" : "#4a7c59",
                        }}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenInspect(report)}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all bg-white/5 border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-white/10 active:scale-[0.98] cursor-pointer"
                        >
                          Inspect
                        </button>
                        {report.status === "OPEN" && (
                          <button
                            onClick={() => handleResolve(report.id)}
                            className="px-3 py-1 rounded text-[9px] font-black uppercase transition-colors hover:opacity-90 active:scale-[0.98] cursor-pointer"
                            style={{ background: "rgba(74,124,89,0.15)", color: "#4a7c59" }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer */}
      <ReportDetailDrawer
        report={activeReport}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onResolve={handleResolve}
        isResolving={resolveMutation.isPending}
      />
    </div>
  );
}
