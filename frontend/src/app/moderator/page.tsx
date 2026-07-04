"use client";

import Link from "next/link";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useModeratorStats, useModeratorReports, useResolveReport, useHideForumTarget } from "./_api";
import dynamic from "next/dynamic";

const ModeratorStatsChart = dynamic(
  () => import("./_components/ModeratorStatsChart"),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse bg-white/5" /> }
);

export default function ModeratorDashboard() {
  const stats = useModeratorStats();
  const reports = useModeratorReports();
  const resolve = useResolveReport();
  const hide = useHideForumTarget();

  const isPending = stats.isLoading || reports.isLoading;
  const isError = stats.error || reports.error;

  const chartData = stats.data ? [
    { name: "Pending Reports", value: stats.data.pendingReports },
    { name: "Resolved Reports", value: stats.data.resolvedReports },
    { name: "Hidden Threads", value: stats.data.hiddenThreads },
    { name: "Hidden Posts", value: stats.data.hiddenPosts }
  ] : [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display-face text-5xl font-black">Moderator Dashboard</h1>
        <p className="text-[var(--fv-muted)]">Moderator panel for forum control and report management.</p>
      </div>

      {isPending ? <LoadingBlock /> : null}
      {isError ? <ErrorBlock message="Could not load moderator dashboard data." /> : null}

      {stats.data ? (
        <section className="grid gap-4 md:grid-cols-4">
          <div className="border border-white/15 p-5 bg-white/5">
            <p className="text-4xl font-black">{stats.data.pendingReports}</p>
            <p className="text-sm uppercase opacity-70">Pending Reports</p>
          </div>
          <div className="border border-white/15 p-5 bg-white/5">
            <p className="text-4xl font-black">{stats.data.resolvedReports}</p>
            <p className="text-sm uppercase opacity-70">Resolved Reports</p>
          </div>
          <div className="border border-white/15 p-5 bg-white/5">
            <p className="text-4xl font-black">{stats.data.hiddenThreads}</p>
            <p className="text-sm uppercase opacity-70">Hidden Threads</p>
          </div>
          <div className="border border-white/15 p-5 bg-white/5">
            <p className="text-4xl font-black">{stats.data.hiddenPosts}</p>
            <p className="text-sm uppercase opacity-70">Hidden Posts</p>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {stats.data ? (
          <div className="border border-white/15 p-5 bg-white/5">
            <h2 className="display-face text-2xl font-black mb-4">Forum Moderation Metrics</h2>
            <div className="h-64 w-full">
              <ModeratorStatsChart data={chartData} />
            </div>
          </div>
        ) : null}

        <div className="border border-white/15 p-5 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display-face text-2xl font-black">Recent Open Reports</h2>
            <Link href="/moderator/reports" className="text-sm font-bold underline hover:opacity-85">
              View All
            </Link>
          </div>
          <div className="grid gap-3">
            {reports.data?.length === 0 ? <p className="text-sm text-[var(--fv-muted)]">No open reports.</p> : null}
            {reports.data?.slice(0, 3).map((report) => (
              <div className="border-t border-white/10 pt-3 flex flex-col justify-between" key={report.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{report.targetType} #{report.targetId}</p>
                    <p className="text-xs text-[var(--fv-muted)] mt-1">{report.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 font-semibold" disabled={hide.isPending} onClick={() => hide.mutate({ type: report.targetType, id: report.targetId, hidden: true })}>
                      Hide
                    </button>
                    <button className="text-xs px-2 py-1 bg-[var(--fv-grass)] text-[var(--fv-ink)] font-semibold" disabled={resolve.isPending} onClick={() => resolve.mutate(report.id)}>
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
