"use client";

import Link from "next/link";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAdminUsers, useAdminNews, useAdminReports } from "./_api";

export default function AdminPage() {
  const users = useAdminUsers();
  const news = useAdminNews(1);
  const reports = useAdminReports();

  return (
    <div>
      <h1 className="display-face text-5xl font-black">Control room</h1>
      {users.isLoading || news.isLoading || reports.isLoading ? <LoadingBlock /> : null}
      {users.error || news.error || reports.error ? <ErrorBlock message="Could not load admin summary." /> : null}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Link className="border border-white/15 p-5 hover:bg-white/10" href="/admin/users">
          <p className="text-4xl font-black">{users.data?.length ?? 0}</p>
          <p className="text-sm uppercase opacity-70">users</p>
        </Link>
        <Link className="border border-white/15 p-5 hover:bg-white/10" href="/admin/news">
          <p className="text-4xl font-black">{news.data?.totalElements ?? 0}</p>
          <p className="text-sm uppercase opacity-70">active stories</p>
        </Link>
        <Link className="border border-white/15 p-5 hover:bg-white/10" href="/admin/reports">
          <p className="text-4xl font-black">{reports.data?.length ?? 0}</p>
          <p className="text-sm uppercase opacity-70">open reports</p>
        </Link>
      </section>
    </div>
  );
}
