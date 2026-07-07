"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type DashboardStats = {
  totalUsers: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  newsSourcesCount: number;
};

type UserGrowthEntry = {
  date: string;
  count: number;
};

export default function AdminDashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: qk.admin.dashboardStats(),
    queryFn: () => data<DashboardStats>(http.get("/admin/dashboard/stats")),
  });

  // 2. Fetch User Growth
  const { data: growth = [], isLoading: isGrowthLoading } = useQuery({
    queryKey: qk.admin.userGrowth(),
    queryFn: () => data<UserGrowthEntry[]>(http.get("/admin/dashboard/user-growth")),
  });

  if (isStatsLoading || isGrowthLoading) {
    return <LoadingBlock label="Fetching dashboard analytics" />;
  }

  return (
    <div className="flex flex-col gap-6 w-full text-white">
      <h3 className="font-serif-title text-xl md:text-2xl font-black tracking-tight text-white m-0">
        System Overview
      </h3>

      {/* Stats Cards Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full text-center">
          <div className="card p-5">
            <span className="text-2xl font-black text-[var(--color-accent)]">{stats.totalUsers}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              TOTAL USERS
            </div>
          </div>
          <div className="card p-5">
            <span className="text-2xl font-black text-white">{stats.publishedArticles}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              PUBLISHED
            </div>
          </div>
          <div className="card p-5">
            <span className="text-2xl font-black text-white">{stats.draftArticles}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              DRAFTS
            </div>
          </div>
          <div className="card p-5">
            <span className="text-2xl font-black text-white">{stats.archivedArticles}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              ARCHIVED
            </div>
          </div>
          <div className="card p-5">
            <span className="text-2xl font-black text-white">{stats.newsSourcesCount}</span>
            <div className="text-[10px] text-[var(--color-text-secondary)] font-bold mt-1 uppercase">
              RSS SOURCES
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="card p-5 w-full">
        <div className="flex flex-col gap-4 w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)]">
            User Sign-up Activity (Last 7 Days)
          </span>
          <div className="h-64 w-full">
            {mounted && growth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growth} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A7FF00" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#A7FF00" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#8A9E92" fontSize={10} tickLine={false} />
                  <YAxis stroke="#8A9E92" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1F16", border: "1px solid #1F2E24", color: "#FFF" }}
                    itemStyle={{ color: "#A7FF00" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#A7FF00"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--color-text-secondary)] italic">
                No signup activities logged in the last 7 days.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
