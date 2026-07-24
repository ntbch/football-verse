"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";

type ModStats = {
  pendingReports: number;
  resolvedReports: number;
  hiddenThreads: number;
  hiddenPosts: number;
};

function KpiCard({ label, value, sub, accent = false, icon }: {
  label: string; value: string | number; sub?: string; accent?: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-3 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{icon}</span>
      </div>
      <div>
        <div className="text-3xl font-black tabular-nums tracking-tight font-serif-title" style={{ color: accent ? "var(--color-accent)" : "var(--color-text-primary)" }}>
          {value}
        </div>
        {sub && <div className="text-[10px] font-semibold mt-1" style={{ color: "var(--color-text-secondary)" }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function ModeratorDashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Fetch mod dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: qk.moderator.stats(),
    queryFn: () => data<ModStats>(http.get("/moderator/dashboard/stats")),
  });

  if (isLoading) {
    return <LoadingBlock label="Fetching moderation statistics" />;
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            Moderator Console
          </h1>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {mounted ? new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "—"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "#B45F35" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse inline-block" />
          LIVE
        </div>
      </div>

      {/* ── KPI tiles ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          <KpiCard
            accent
            label="Pending Reports"
            value={stats.pendingReports}
            sub="awaiting review"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            }
          />
          <KpiCard
            label="Resolved Reports"
            value={stats.resolvedReports}
            sub="actions completed"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <KpiCard
            label="Hidden Threads"
            value={stats.hiddenThreads}
            sub="removed public topics"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            }
          />
          <KpiCard
            label="Hidden Posts"
            value={stats.hiddenPosts}
            sub="removed comments"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
        </div>
      )}

      {/* ── Guidelines ── */}
      <div className="card p-5 w-full">
        <div className="flex flex-col gap-3">
          <h4 className="font-serif-title m-0 text-sm font-bold uppercase text-[var(--color-accent)] tracking-wider">
            Moderation Guidelines
          </h4>
          <div className="text-[11px] leading-relaxed font-medium text-[var(--color-text-secondary)] flex flex-col gap-2">
            <p className="m-0">1. Review open report flags. Read post content within thread contexts before resolving.</p>
            <p className="m-0">2. Mute or hide toxic comments immediately to protect the Fan Community Arena.</p>
            <p className="m-0">3. Lock discussion threads that decay into flame wars or ads.</p>
            <p className="m-0">4. Keep pin limits low: pin only official match predictions or important announcements.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
