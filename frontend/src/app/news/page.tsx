"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { NewsArticle, PageResponse } from "@/shared/lib/types";

export default function NewsPage() {
  const news = useQuery({
    queryKey: ["news"],
    queryFn: () => data<PageResponse<NewsArticle>>(http.get("/news?size=20"))
  });

  return (
    <PublicShell>
      <section className="panel touchline p-6">
        <h1 className="display-face text-5xl font-black">News wire</h1>
        <p className="mt-2 text-[var(--fv-muted)]">RSS and admin-published stories land here.</p>
      </section>

      <section className="mt-5 grid gap-4">
        {news.isLoading ? <LoadingBlock /> : null}
        {news.error ? <ErrorBlock message="Could not load news." /> : null}
        {news.data?.content.length === 0 ? (
          <div className="panel p-5">No published articles yet. Admin can create one in `/admin/news/new`.</div>
        ) : null}
        {news.data?.content.map((article, index) => (
          <Link
            className="panel grid gap-3 p-5 hover:border-[var(--fv-ink)] md:grid-cols-[80px_1fr]"
            href={`/news/${article.slug}`}
            key={article.id}
          >
            <span className="display-face text-4xl font-black text-[var(--fv-clay)]">{String(index + 1).padStart(2, "0")}</span>
            <span>
              <span className="text-xs font-bold uppercase text-[var(--fv-muted)]">{article.category ?? "Uncategorized"}</span>
              <span className="mt-1 block text-2xl font-black">{article.title}</span>
              <span className="mt-2 block text-sm text-[var(--fv-muted)]">{article.summary ?? "Open the article for the full dispatch."}</span>
            </span>
          </Link>
        ))}
      </section>
    </PublicShell>
  );
}
