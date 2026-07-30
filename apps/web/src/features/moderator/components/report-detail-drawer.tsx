"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/shared/components/toast";

export type ModReportDetail = {
  id: number;
  targetType: "THREAD" | "POST";
  targetId: number;
  reporter: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  createdAt?: string;
  author?: {
    username: string;
    avatarUrl?: string;
    strikes: number;
  };
  contentSnippet?: string;
  threadSlug?: string;
};

type ReportDetailDrawerProps = {
  report: ModReportDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (id: number) => void;
  isResolving?: boolean;
};

export function ReportDetailDrawer({
  report,
  isOpen,
  onClose,
  onResolve,
  isResolving = false,
}: ReportDetailDrawerProps) {
  const toast = useToast();
  const [hidden, setHidden] = useState(false);
  const [warned, setWarned] = useState(false);

  if (!isOpen || !report) return null;

  const contentText = report.contentSnippet || `${report.targetType} #${report.targetId} content flagged for review.`;

  const author = report.author || {
    username: report.reporter ? `author_of_${report.targetId}` : "unknown",
    strikes: 0,
  };

  const handleHideContent = () => {
    setHidden(true);
    toast({
      body: `Content for ${report.targetType} #${report.targetId} hidden from public view.`,
      type: "info",
      autoHideDuration: 3000,
    });
  };

  const handleWarnUser = () => {
    setWarned(true);
    toast({
      body: `Official warning issued to @${author.username}. Strike count updated.`,
      type: "info",
      autoHideDuration: 3000,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div
        className="relative w-full max-w-lg h-full flex flex-col shadow-2xl transition-transform duration-300 transform translate-x-0"
        style={{
          backgroundColor: "var(--color-background-body)",
          borderLeft: "1px solid var(--color-border)",
        }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between p-4 px-6 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[var(--color-accent)]">
              REPORT #{report.id}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
              style={{
                background: report.targetType === "THREAD" ? "rgba(180,95,53,0.15)" : "rgba(74,124,89,0.15)",
                color: report.targetType === "THREAD" ? "var(--color-accent)" : "#4a7c59",
              }}
            >
              {report.targetType}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
              style={{
                background: report.status === "OPEN" ? "rgba(185,28,28,0.15)" : "rgba(74,124,89,0.15)",
                color: report.status === "OPEN" ? "#b91c1c" : "#4a7c59",
              }}
            >
              {report.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Section 1: Reported Content Snippet */}
          <div className="card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
                Reported Content
              </span>
              <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                ID: {report.targetId}
              </span>
            </div>

            <div
              className={`p-3 rounded border text-xs leading-relaxed font-sans ${
                hidden ? "line-through opacity-50 bg-red-950/20" : "bg-black/10"
              }`}
              style={{ borderColor: "var(--color-border)" }}
            >
              {contentText}
            </div>

            {hidden && (
              <div className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
                Content has been hidden from public community feed.
              </div>
            )}

            <div className="pt-1 flex items-center justify-end">
              <Link
                href={`/forum/threads/${report.threadSlug || "champions-league-2026"}`}
                target="_blank"
                className="text-[11px] font-bold flex items-center gap-1 text-[var(--color-accent)] hover:underline"
              >
                View in context
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Section 2: Reporter & Reason */}
          <div className="card p-4 flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
              Flag Details
            </span>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[var(--color-text-secondary)]">Reported By:</span>
              <span className="font-bold text-[var(--color-text-primary)]">@{report.reporter}</span>
            </div>
            <div className="flex items-start justify-between text-xs pt-1">
              <span className="text-[var(--color-text-secondary)]">Reason:</span>
              <span className="font-semibold text-amber-500 max-w-[240px] text-right">
                {report.reason}
              </span>
            </div>
          </div>

          {/* Section 3: Author & Violation History */}
          <div className="card p-4 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
              Author Profile & Violations
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 border border-[var(--color-accent)] flex items-center justify-center text-xs font-black text-[var(--color-accent)]">
                  {author.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--color-text-primary)]">@{author.username}</div>
                  <div className="text-[10px] text-[var(--color-text-secondary)]">Community Member</div>
                </div>
              </div>

              {/* Strikes badge */}
              <div className="flex items-center gap-1.5">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase"
                  style={{
                    background: (author.strikes + (warned ? 1 : 0)) >= 2 ? "rgba(185,28,28,0.15)" : "rgba(217,119,6,0.15)",
                    color: (author.strikes + (warned ? 1 : 0)) >= 2 ? "#b91c1c" : "#d97706",
                  }}
                >
                  {author.strikes + (warned ? 1 : 0)} STRIKE{(author.strikes + (warned ? 1 : 0)) > 1 ? "S" : ""}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 border-t border-[var(--color-border)]">
              <button
                onClick={handleWarnUser}
                disabled={warned}
                className="flex-1 py-1.5 px-3 rounded text-[10px] font-black uppercase transition-all border border-amber-600/40 text-amber-500 hover:bg-amber-600/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {warned ? "Warning Sent" : "Issue Warning"}
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Actions Footer */}
        <div
          className="p-4 px-6 border-t flex flex-col gap-2.5"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onResolve(report.id);
                onClose();
              }}
              disabled={isResolving}
              className="flex-1 py-2.5 px-4 rounded text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
              style={{
                backgroundColor: "#4a7c59",
                color: "#ffffff",
              }}
            >
              {isResolving ? "Resolving..." : "Resolve Report"}
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded text-xs font-bold transition-all border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5 active:scale-[0.98] cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleHideContent}
              disabled={hidden}
              className="text-[10px] font-bold text-red-400 hover:underline disabled:opacity-50 cursor-pointer"
            >
              {hidden ? "Content Hidden" : "Hide Content Publicly"}
            </button>
            <span className="text-[10px] text-[var(--color-text-secondary)]">Mod Action ID #{report.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
