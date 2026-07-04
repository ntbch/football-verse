"use client";

import Link from "next/link";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAdminDashboardStats, useAdminUserGrowth, useCrawlNow } from "./_api";
import dynamic from "next/dynamic";

const UserGrowthChart = dynamic(
  () => import("./_components/UserGrowthChart"),
  { ssr: false, loading: () => <div className="h-72 w-full animate-pulse bg-white/5" /> }
);

export default function AdminPage() {
  const stats = useAdminDashboardStats();
  const growth = useAdminUserGrowth();
  const crawl = useCrawlNow();

  const isPending = stats.isLoading || growth.isLoading;
  const isError = stats.error || growth.error;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-face text-5xl font-black">Control Room</h1>
          <p className="text-[var(--fv-muted)]">Manage users, crawled content, and system configurations.</p>
        </div>
        <button
          className="btn bg-[var(--fv-grass)] text-[var(--fv-ink)] font-bold py-2 px-4 hover:opacity-90"
          disabled={crawl.isPending}
          onClick={() => crawl.mutate()}
        >
          {crawl.isPending ? "Crawling RSS..." : "Crawl RSS Now"}
        </button>
      </div>

      {isPending ? <LoadingBlock /> : null}
      {isError ? <ErrorBlock message="Could not load admin stats." /> : null}

      {stats.data ? (
        <section className="grid gap-4 md:grid-cols-4">
          <Link className="border border-white/15 p-5 hover:bg-white/10 bg-white/5" href="/admin/users">
            <p className="text-4xl font-black">{stats.data.totalUsers}</p>
            <p className="text-sm uppercase opacity-70">Total Users</p>
          </Link>
          <Link className="border border-white/15 p-5 hover:bg-white/10 bg-white/5" href="/admin/news">
            <p className="text-4xl font-black">{stats.data.publishedArticles}</p>
            <p className="text-sm uppercase opacity-70">Published Stories</p>
          </Link>
          <div className="border border-white/15 p-5 bg-white/5">
            <p className="text-4xl font-black">{stats.data.draftArticles}</p>
            <p className="text-sm uppercase opacity-70">Draft Articles</p>
          </div>
          <Link className="border border-white/15 p-5 hover:bg-white/10 bg-white/5" href="/admin/news/sources">
            <p className="text-4xl font-black">{stats.data.newsSourcesCount}</p>
            <p className="text-sm uppercase opacity-70">RSS Sources</p>
          </Link>
        </section>
      ) : null}

      {growth.data ? (
        <div className="border border-white/15 p-5 bg-white/5">
          <h2 className="display-face text-2xl font-black mb-4">User Growth (Last 7 Days)</h2>
          <div className="h-72 w-full">
            <UserGrowthChart data={growth.data} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
