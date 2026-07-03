"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { AdminUser, ForumReport, NewsArticle, PageResponse } from "@/shared/lib/types";

export default function AdminPage() {
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => data<AdminUser[]>(http.get("/admin/users")) });
  const news = useQuery({ queryKey: ["admin-news"], queryFn: () => data<PageResponse<NewsArticle>>(http.get("/admin/news?size=1")) });
  const reports = useQuery({ queryKey: ["admin-reports"], queryFn: () => data<ForumReport[]>(http.get("/admin/forum/reports")) });

  return (
    <div>
      <h1 className="display-face text-5xl font-black">Control room</h1>
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
