"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

type DashboardStats = {
  totalUsers: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  newsSourcesCount: number;
};

type UserGrowthEntry = { date: string; count: number };

type AdminUser = {
  id: number;
  email: string;
  username: string;
  status: "ACTIVE" | "MUTED" | "BANNED";
  roles: string[];
  createdAt?: string;
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

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: stats } = useQuery({
    queryKey: qk.admin.dashboardStats(),
    queryFn: () => data<DashboardStats>(http.get("/admin/dashboard/stats")),
  });

  const { data: growth = [] } = useQuery({
    queryKey: qk.admin.userGrowth(),
    queryFn: () => data<UserGrowthEntry[]>(http.get("/admin/dashboard/user-growth")),
  });

  const { data: userList } = useQuery({
    queryKey: qk.admin.users(),
    queryFn: () => data<AdminUser[]>(http.get("/admin/users")),
  });

  const recentUsers = (userList ?? []).slice(0, 6);
  const totalArticles = (stats?.publishedArticles ?? 0) + (stats?.draftArticles ?? 0) + (stats?.archivedArticles ?? 0);
  const pubPct = totalArticles > 0 ? Math.round(((stats?.publishedArticles ?? 0) / totalArticles) * 100) : 0;
  const signupTotal = growth.reduce((acc, g) => acc + g.count, 0);
  const signupPeak = growth.length > 0 ? Math.max(...growth.map((g) => g.count)) : 0;

  const articleBreakdown = [
    { name: "Published", value: stats?.publishedArticles ?? 0, color: "#4a7c59" },
    { name: "Drafts", value: stats?.draftArticles ?? 0, color: "#B45F35" },
    { name: "Archived", value: stats?.archivedArticles ?? 0, color: "#9ca3af" },
  ];

  const CHART_COLORS = {
    axis: "#9ca3af",
    tooltip_bg: "#FFFDF9",
    tooltip_border: "#D8D0BC",
    area_stroke: "#B45F35",
    area_fill_start: "rgba(180,95,53,0.15)",
    area_fill_end: "rgba(180,95,53,0)",
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            System Overview
          </h1>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "#4a7c59" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse inline-block" />
          LIVE
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard accent label="Total Users" value={stats?.totalUsers ?? "—"} sub="all registered accounts"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiCard label="Published" value={stats?.publishedArticles ?? "—"} sub={`${pubPct}% of all content`}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Drafts" value={stats?.draftArticles ?? "—"} sub="pending review"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <KpiCard label="Sources" value={stats?.newsSourcesCount ?? "—"} sub="active crawl feeds"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z" /></svg>}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Signup Trend — 2/3 */}
        <div className="card lg:col-span-2 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>User Sign-up Trend</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Last 7 days</div>
            </div>
            <div className="flex items-center gap-5 text-right">
              <div>
                <div className="text-xl font-black tabular-nums leading-none font-serif-title" style={{ color: "var(--color-text-primary)" }}>{signupTotal}</div>
                <div className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--color-text-secondary)" }}>total signups</div>
              </div>
              <div>
                <div className="text-xl font-black tabular-nums leading-none font-serif-title" style={{ color: "var(--color-text-primary)" }}>{signupPeak}</div>
                <div className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--color-text-secondary)" }}>peak / day</div>
              </div>
            </div>
          </div>
          <div className="h-44">
            {mounted && growth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B45F35" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#B45F35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: CHART_COLORS.tooltip_bg, border: `1px solid ${CHART_COLORS.tooltip_border}`, borderRadius: 8, fontSize: 11, color: "#10140F" }} labelStyle={{ color: "#6D715F", fontWeight: 700 }} itemStyle={{ color: "#B45F35" }} />
                  <Area type="monotone" dataKey="count" stroke="#B45F35" strokeWidth={2} fill="url(#growthGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>No signup data for this period</div>
            )}
          </div>
        </div>

        {/* Content Breakdown — 1/3 */}
        <div className="card p-5 flex flex-col gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>Content Breakdown</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{totalArticles} articles total</div>
          </div>
          {mounted && (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={articleBreakdown} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <XAxis dataKey="name" stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} />
                  <YAxis stroke={CHART_COLORS.axis} fontSize={9} tickLine={false} tick={{ fill: CHART_COLORS.axis }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: CHART_COLORS.tooltip_bg, border: `1px solid ${CHART_COLORS.tooltip_border}`, borderRadius: 8, fontSize: 11, color: "#10140F" }} itemStyle={{ color: "#10140F" }} cursor={{ fill: "rgba(16,20,15,0.04)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {articleBreakdown.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-col gap-2 mt-auto pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            {articleBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>{item.name}</span>
                </div>
                <span className="font-black tabular-nums" style={{ color: "var(--color-text-primary)" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Users table ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>Recent Users</span>
          <Link href="/admin/users" className="text-[10px] font-bold hover:opacity-70 transition-opacity" style={{ color: "var(--color-accent)" }}>
            View All →
          </Link>
        </div>
        {recentUsers.length === 0 ? (
          <div className="p-6 text-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>No users found</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                {["User", "Email", "Role", "Status", "Joined"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u, i) => (
                <tr key={u.id} className="hover:bg-black/[0.025] transition-colors" style={{ borderBottom: i < recentUsers.length - 1 ? "1px solid var(--color-border)" : undefined }}>
                  <td className="px-5 py-3 font-bold" style={{ color: "var(--color-text-primary)" }}>{u.username}</td>
                  <td className="px-5 py-3 font-medium" style={{ color: "var(--color-text-secondary)" }}>{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider" style={
                      u.roles?.includes("ADMIN") ? { background: "rgba(180,95,53,0.12)", color: "#B45F35" }
                        : u.roles?.includes("MODERATOR") ? { background: "rgba(180,95,53,0.07)", color: "#8B4513" }
                          : { background: "rgba(109,113,95,0.12)", color: "#6D715F" }
                    }>
                      {u.roles?.includes("ADMIN") ? "Admin" : u.roles?.includes("MODERATOR") ? "Mod" : "User"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black" style={{
                      color: u.status === "ACTIVE" ? "#4a7c59" : u.status === "BANNED" ? "#b91c1c" : "#6D715F"
                    }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{
                        background: u.status === "ACTIVE" ? "#4a7c59" : u.status === "BANNED" ? "#b91c1c" : "#9ca3af"
                      }} />
                      {u.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", label: "Manage Users", desc: "Roles, bans, accounts" },
          { href: "/admin/news", label: "News CMS", desc: "Create & publish articles" },
          { href: "/admin/news/sources", label: "News Sources", desc: "Add & monitor feeds" },
          { href: "/admin/reports", label: "Report Queue", desc: "Review flagged content" },
        ].map((q) => (
          <Link key={q.href} href={q.href}
            className="card flex flex-col gap-1.5 p-4 hover:shadow-md transition-all active:scale-[0.98] group"
          >
            <span className="text-xs font-black group-hover:underline" style={{ color: "var(--color-accent)" }}>{q.label} →</span>
            <span className="text-[10px] font-medium" style={{ color: "var(--color-text-secondary)" }}>{q.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
