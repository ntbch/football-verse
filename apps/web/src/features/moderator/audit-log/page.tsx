"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import { formatDate } from "@/shared/lib/format";
import { LoadingBlock } from "@/shared/components/state-blocks";

type AuditEntry = {
  id: string;
  timestamp: string;
  moderator: string;
  action: "RESOLVE_REPORT" | "HIDE_POST" | "HIDE_THREAD" | "ISSUE_WARNING" | "LOCK_THREAD";
  targetType: "THREAD" | "POST" | "USER";
  targetId: string;
  reason: string;
};

export default function ModeratorAuditLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  // Fetch real audit logs from backend if available
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["moderator", "audit-logs"],
    queryFn: async () => {
      try {
        return await data<AuditEntry[]>(http.get("/moderator/audit-logs"));
      } catch (err) {
        return [];
      }
    },
  });

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((entry) => {
      if (actionFilter !== "ALL" && entry.action !== actionFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          entry.moderator.toLowerCase().includes(q) ||
          entry.targetId.toLowerCase().includes(q) ||
          entry.reason.toLowerCase().includes(q) ||
          entry.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, search, actionFilter]);

  const getActionBadge = (action: AuditEntry["action"]) => {
    switch (action) {
      case "RESOLVE_REPORT":
        return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-400">Resolved</span>;
      case "ISSUE_WARNING":
        return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/15 text-amber-400">User Warned</span>;
      case "HIDE_POST":
      case "HIDE_THREAD":
        return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/15 text-red-400">Content Hidden</span>;
      case "LOCK_THREAD":
        return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-500/15 text-purple-400">Thread Locked</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gray-500/15 text-gray-300">{action}</span>;
    }
  };

  if (isLoading) {
    return <LoadingBlock label="Fetching moderation audit logs" />;
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-xl font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            Moderation Audit Log
          </h1>
          <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mt-0.5">
            Immutable system audit trail recording every moderator action and automated decision
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-secondary)]">
          Total Logs: <span className="font-bold text-[var(--color-text-primary)]">{filteredLogs.length}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by moderator, target ID, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[var(--color-text-secondary)]">Action Type:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-1.5 px-3 text-xs rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            <option value="RESOLVE_REPORT">Resolve Report</option>
            <option value="ISSUE_WARNING">Issue Warning</option>
            <option value="HIDE_POST">Hide Post</option>
            <option value="HIDE_THREAD">Hide Thread</option>
            <option value="LOCK_THREAD">Lock Thread</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-background-body)" }}>
                {["Log ID", "Timestamp", "Moderator", "Action Taken", "Target", "Audit Note / Reason"].map((h) => (
                  <th
                    key={h}
                    className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-left"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs italic text-[var(--color-text-secondary)]">
                    No moderation audit log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: i < filteredLogs.length - 1 ? "1px solid var(--color-border)" : undefined }}
                  >
                    <td className="py-3 px-4 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {entry.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap">
                      {formatDate(entry.timestamp, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-4 font-bold text-[var(--color-text-primary)]">
                      @{entry.moderator}
                    </td>
                    <td className="py-3 px-4">
                      {getActionBadge(entry.action)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {entry.targetType} {entry.targetId}
                    </td>
                    <td className="py-3 px-4 max-w-md text-[var(--color-text-secondary)] leading-normal">
                      {entry.reason}
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
