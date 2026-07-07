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
    <div className="flex flex-col gap-4 w-full text-white">
      <h3 className="font-serif-title text-xl md:text-2xl font-black tracking-tight text-white m-0">
        Moderation Queue: Open Reports
      </h3>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-secondary)] font-bold">
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Content ID</th>
                <th className="py-3 px-4">Reporter</th>
                <th className="py-3 px-4">Flag Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-[var(--color-text-secondary)] italic">
                    Moderation queue is empty. Good job!
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-[var(--color-background-body)] text-white">
                    <td className="py-3 px-4 font-mono text-[var(--color-text-secondary)]">#{report.id}</td>
                    <td className="py-3 px-4 font-bold text-yellow-500">{report.targetType}</td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-300">ID: {report.targetId}</td>
                    <td className="py-3 px-4 font-bold">@{report.reporter}</td>
                    <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{report.reason}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold px-2 py-0.5 rounded text-[9px] bg-red-950 text-red-300 border border-red-800">
                        {report.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleResolve(report.id)}
                        className="btn btn-sm !bg-green-800 hover:!bg-green-700 !text-white text-[9px] font-bold uppercase rounded px-2.5 py-1 transition-colors"
                      >
                        Resolve Report
                      </button>
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
