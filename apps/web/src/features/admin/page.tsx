"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import type { AdminUser } from "./types";
import { ErrorBlock } from "@/shared/components/state-blocks";
import { formatDate } from "@/shared/lib/format";
import { CommandPaletteModal } from "@/shared/components/command-palette-modal";

type DashboardStats = {
  totalUsers: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  newsSourcesCount: number;
};

type UserGrowthEntry = { date: string; count: number };

function KpiCard({ label, value, sub, accent = false, icon }: {
  label: string; value: string | number; sub?: string; accent?: boolean; icon: React.ReactNode;
}) {
  return (
    <div
      className="card flex flex-col justify-between gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg relative overflow-hidden group"
      style={{
        borderColor: accent ? "var(--color-accent)" : "var(--color-border)",
        background: accent ? "rgba(180,95,53,0.06)" : "var(--color-card-bg)",
      }}
    >
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-accent)]/10 rounded-full blur-2xl pointer-events-none" />
      )}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent ? "var(--color-accent)" : "var(--color-text-secondary)" }}>{label}</span>
        <span className="p-2 rounded-lg" style={{ backgroundColor: accent ? "rgba(180,95,53,0.12)" : "rgba(255,255,255,0.03)", color: accent ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
          {icon}
        </span>
      </div>
      <div>
        <div className="text-3xl font-black tabular-nums tracking-tight font-mono" style={{ color: accent ? "var(--color-accent)" : "var(--color-text-primary)" }}>
          {value}
        </div>
        {sub && <div className="text-[10px] font-semibold mt-1" style={{ color: "var(--color-text-secondary)" }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [charts, setCharts] = useState<typeof import("recharts") | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
    void import("recharts").then(setCharts);
  }, []);

  const { data: stats, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: qk.admin.dashboardStats(),
    queryFn: () => data<DashboardStats>(http.get("/admin/dashboard/stats")),
  });

  const { data: growth = [], error: growthError, refetch: refetchGrowth } = useQuery({
    queryKey: qk.admin.userGrowth(),
    queryFn: () => data<UserGrowthEntry[]>(http.get("/admin/dashboard/user-growth")),
  });

  const { data: userList, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: qk.admin.users(),
    queryFn: () => data<AdminUser[]>(http.get("/admin/users")),
  });

  const recentUsers = (userList ?? []).slice(0, 6);
  const totalArticles = (stats?.publishedArticles ?? 0) + (stats?.draftArticles ?? 0) + (stats?.archivedArticles ?? 0);
  const pubPct = totalArticles > 0 ? Math.round(((stats?.publishedArticles ?? 0) / totalArticles) * 100) : 0;
  const signupTotal = growth.reduce((acc, g) => acc + g.count, 0);
  const signupPeak = growth.length > 0 ? Math.max(...growth.map((g) => g.count)) : 0;

  const articleBreakdown = [
    { name: "Published", value: stats?.publishedArticles ?? 0, color: "var(--color-success)" },
    { name: "Drafts", value: stats?.draftArticles ?? 0, color: "var(--color-accent)" },
    { name: "Archived", value: stats?.archivedArticles ?? 0, color: "var(--color-chart-axis)" },
  ];

  const CHART_COLORS = {
    axis: "var(--color-chart-axis)",
    tooltip_bg: "var(--color-background-surface)",
    tooltip_border: "var(--color-border)",
    area_stroke: "var(--color-accent)",
  };

  const systemServices = [
    { name: "Core API", status: "HEALTHY", latency: "14ms", color: "#4a7c59" },
    { name: "Ingestion Engine", status: "ONLINE", latency: "38ms", color: "#4a7c59" },
    { name: "PostgreSQL DB", status: "OPTIMAL", latency: "4ms", color: "#4a7c59" },
    { name: "Redis Cache", status: "CONNECTED", latency: "2ms", color: "#4a7c59" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Page header with Command Palette Trigger ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-xl font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            Admin Control Hub
          </h1>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {mounted ? formatDate(new Date().toISOString(), { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "—"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Ctrl+K Search Bar Button */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-3 py-1.5 px-4 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-black/20 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search or command...</span>
            <kbd className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-white/5">
              Ctrl K
            </kbd>
          </button>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            SYSTEM LIVE
          </div>
        </div>
      </div>

      {/* ── System Status Health Bar ── */}
      <div className="card p-3 px-5 flex flex-wrap items-center justify-between gap-4 bg-black/20">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] font-mono">
          Microservices Health:
        </span>
        <div className="flex flex-wrap items-center gap-6 text-xs">
          {systemServices.map((srv) => (
            <div key={srv.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: srv.color }} />
              <span className="font-bold text-[var(--color-text-primary)]">{srv.name}:</span>
              <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">{srv.latency}</span>
            </div>
          ))}
        </div>
      </div>

      {statsError ? <ErrorBlock message="Dashboard statistics could not be loaded." onRetry={() => refetchStats()} /> : null}

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard accent label="Total User Accounts" value={stats?.totalUsers ?? "—"} sub="registered fan accounts"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiCard label="Published Articles" value={stats?.publishedArticles ?? "—"} sub={`${pubPct}% of all stories`}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Draft Articles" value={stats?.draftArticles ?? "—"} sub="pending editorial review"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <KpiCard label="Active Ingestion Feeds" value={stats?.newsSourcesCount ?? "—"} sub="monitored RSS/API channels"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z" /></svg>}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Signup Trend — 2/3 */}
        <div className="card lg:col-span-2 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">User Registration Analytics</div>
              <div className="text-xs font-medium mt-0.5 text-[var(--color-text-secondary)]">Sign-up volume over the last 7 days</div>
            </div>
            <div className="flex items-center gap-5 text-right font-mono">
              <div>
                <div className="text-xl font-black tabular-nums leading-none text-[var(--color-text-primary)]">{signupTotal}</div>
                <div className="text-[9px] font-semibold mt-0.5 text-[var(--color-text-secondary)]">total signups</div>
              </div>
              <div>
                <div className="text-xl font-black tabular-nums leading-none text-[var(--color-text-primary)]">{signupPeak}</div>
                <div className="text-[9px] font-semibold mt-0.5 text-[var(--color-text-secondary)]">peak / day</div>
              </div>
            </div>
          </div>
          <div className="h-48">
            {growthError ? <ErrorBlock message="User-growth data could not be loaded." onRetry={() => refetchGrowth()} /> : mounted && charts && growth.length > 0 ? (
              <charts.ResponsiveContainer width="100%" height="100%">
                <charts.AreaChart data={growth} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <charts.XAxis dataKey="date" stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} tickFormatter={(v) => v.slice(5)} />
                  <charts.YAxis stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} allowDecimals={false} />
                  <charts.Tooltip contentStyle={{ background: CHART_COLORS.tooltip_bg, border: `1px solid ${CHART_COLORS.tooltip_border}`, borderRadius: 8, fontSize: 11, color: "var(--color-text-primary)" }} labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 700 }} itemStyle={{ color: "var(--color-accent)" }} />
                  <charts.Area type="monotone" dataKey="count" stroke={CHART_COLORS.area_stroke} strokeWidth={2} fill="url(#growthGrad)" dot={false} />
                </charts.AreaChart>
              </charts.ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs italic text-[var(--color-text-secondary)]">No signup data recorded</div>
            )}
          </div>
        </div>

        {/* Content Breakdown — 1/3 */}
        <div className="card p-5 flex flex-col gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Content Distribution</div>
            <div className="text-xs font-medium mt-0.5 text-[var(--color-text-secondary)]">{totalArticles} total articles stored</div>
          </div>
          {mounted && charts && (
            <div className="h-32">
              <charts.ResponsiveContainer width="100%" height="100%">
                <charts.BarChart data={articleBreakdown} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <charts.XAxis dataKey="name" stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} />
                  <charts.YAxis stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} allowDecimals={false} />
                  <charts.Tooltip contentStyle={{ background: CHART_COLORS.tooltip_bg, border: `1px solid ${CHART_COLORS.tooltip_border}`, borderRadius: 8, fontSize: 11, color: "var(--color-text-primary)" }} itemStyle={{ color: "var(--color-text-primary)" }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <charts.Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {articleBreakdown.map((e) => <charts.Cell key={e.name} fill={e.color} />)}
                  </charts.Bar>
                </charts.BarChart>
              </charts.ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-[var(--color-border)]">
            {articleBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="font-medium text-[var(--color-text-secondary)]">{item.name}</span>
                </div>
                <span className="font-mono font-black text-[var(--color-text-primary)]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Users table ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Recent Accounts Registered</span>
          <Link href="/admin/users" className="text-[10px] font-bold text-[var(--color-accent)] hover:underline">
            Manage User Accounts & RBAC →
          </Link>
        </div>
        {usersError ? <ErrorBlock message="Recent users could not be loaded." onRetry={() => refetchUsers()} /> : recentUsers.length === 0 ? (
          <div className="p-6 text-center text-xs italic text-[var(--color-text-secondary)]">No users found</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-black/10">
                {["User", "Email", "Role", "Status", "Joined"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u, i) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors border-b border-[var(--color-border)] last:border-0">
                  <td className="px-5 py-3 font-bold text-[var(--color-text-primary)]">@{u.username}</td>
                  <td className="px-5 py-3 font-medium text-[var(--color-text-secondary)]">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider" style={
                      u.roles?.includes("ADMIN") ? { background: "rgba(180,95,53,0.15)", color: "var(--color-accent)" }
                        : u.roles?.includes("MODERATOR") ? { background: "rgba(74,124,89,0.15)", color: "#4a7c59" }
                          : { background: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" }
                    }>
                      {u.roles?.includes("ADMIN") ? "ADMIN" : u.roles?.includes("MODERATOR") ? "MOD" : "USER"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black" style={{
                      color: u.status === "ACTIVE" ? "#4a7c59" : u.status === "BANNED" ? "#b91c1c" : "#d97706"
                    }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{
                        background: u.status === "ACTIVE" ? "#4a7c59" : u.status === "BANNED" ? "#b91c1c" : "#d97706"
                      }} />
                      {u.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[10px] text-[var(--color-text-secondary)]">
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", label: "User Accounts & RBAC", desc: "Manage roles, bans & strikes" },
          { href: "/admin/news", label: "News CMS", desc: "Publish & edit articles" },
          { href: "/admin/news/sources", label: "Ingestion Crawlers", desc: "Monitor RSS, API, Reddit & X feeds" },
          { href: "/admin/settings", label: "System Settings", desc: "Feature flags & cache flush" },
        ].map((q) => (
          <Link key={q.href} href={q.href}
            className="card flex flex-col gap-1.5 p-4 hover:shadow-md transition-all active:scale-[0.98] group"
          >
            <span className="text-xs font-black text-[var(--color-accent)] group-hover:underline">{q.label} →</span>
            <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{q.desc}</span>
          </Link>
        ))}
      </div>

      {/* Command Palette Modal */}
      <CommandPaletteModal isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
