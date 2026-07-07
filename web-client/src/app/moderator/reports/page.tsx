"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

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

  // 1. Fetch moderator reports
  const { data: reports = [], isLoading } = useQuery({
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

  if (isLoading) {
    return <LoadingBlock label="Fetching reported content" />;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>
            Open Reports Queue
          </h1>
          <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>
            {reports.length} reports
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-background-body)" }}>
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
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                    Moderation queue is empty. Good job!
                  </td>
                </tr>
              ) : (
                reports.map((report, i) => (
                  <tr
                    key={report.id}
                    className="hover:bg-black/[0.02] transition-colors"
                    style={{ borderBottom: i < reports.length - 1 ? "1px solid var(--color-border)" : undefined }}
                  >
                    <td className="py-3 px-4 font-mono text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                      #{report.id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                        style={{
                          background: report.targetType === "THREAD" ? "rgba(180,95,53,0.12)" : "rgba(74,124,89,0.12)",
                          color: report.targetType === "THREAD" ? "var(--color-accent)" : "#4a7c59",
                        }}
                      >
                        {report.targetType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                      ID: {report.targetId}
                    </td>
                    <td className="py-3 px-4 font-bold" style={{ color: "var(--color-text-primary)" }}>
                      @{report.reporter}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate" style={{ color: "var(--color-text-secondary)" }} title={report.reason}>
                      {report.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                        style={{ background: "rgba(185,28,28,0.12)", color: "#b91c1c" }}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleResolve(report.id)}
                          className="px-3 py-1.5 rounded text-[9px] font-black uppercase transition-colors hover:opacity-80 active:scale-[0.98] cursor-pointer"
                          style={{ background: "rgba(74,124,89,0.15)", color: "#4a7c59" }}
                        >
                          Resolve Report
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
    </div>
  );
}
