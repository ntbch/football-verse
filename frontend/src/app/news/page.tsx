"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useNewsFeed } from "./_api";

export default function NewsPage() {
  const [page, setPage] = useState(0);
  const news = useNewsFeed(page);
  const articles = news.data?.content ?? [];
  const totalPages = news.data?.totalPages ?? 0;
  const totalArticles = news.data?.totalElements ?? 0;

  return (
    <PublicShell>
      <section className="panel touchline p-6">
        <h1 className="display-face text-5xl font-black">News wire</h1>
        <p className="mt-2 text-[var(--fv-muted)]">RSS and admin-published stories land here.</p>
      </section>

      <section className="mt-5 grid gap-4">
        {news.isLoading ? <LoadingBlock /> : null}
        {news.error ? <ErrorBlock message="Could not load news." /> : null}
        {articles.length === 0 && !news.isLoading ? (
          <div className="panel p-5">No published articles yet.</div>
        ) : null}
        {articles.map((article, index) => (
          <Link
            className="panel grid gap-3 p-5 hover:border-[var(--fv-ink)] md:grid-cols-[80px_1fr]"
            href={`/news/${article.slug}`}
            key={article.id}
          >
            <span className="display-face text-4xl font-black text-[var(--fv-clay)]">{String(page * (news.data?.size ?? 20) + index + 1).padStart(2, "0")}</span>
            <span>
              <span className="text-xs font-bold uppercase text-[var(--fv-muted)]">{article.category ?? "Uncategorized"}</span>
              <span className="mt-1 block text-2xl font-black">{article.title}</span>
              <span className="mt-2 block text-sm text-[var(--fv-muted)]">{article.summary ?? "Open the article for the full dispatch."}</span>
            </span>
          </Link>
        ))}
        {totalPages > 1 ? (
          <nav className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm font-bold uppercase text-[var(--fv-muted)]">
              Page {page + 1}/{totalPages} · {totalArticles} articles
            </p>
            <div className="flex gap-2">
              <button className="btn btn-secondary" disabled={page === 0 || news.isFetching} onClick={() => setPage((value) => Math.max(0, value - 1))}>
                Prev
              </button>
              <button className="btn btn-secondary" disabled={page + 1 >= totalPages || news.isFetching} onClick={() => setPage((value) => value + 1)}>
                Next
              </button>
            </div>
          </nav>
        ) : articles.length > 0 ? (
          <p className="text-sm font-bold uppercase text-[var(--fv-muted)]">Showing all {articles.length} articles</p>
        ) : null}
      </section>
    </PublicShell>
  );
}
