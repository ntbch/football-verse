"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useNewsCategories, useNewsFeed, useNewsTags } from "./_api";

export default function NewsPage() {
  const [page, setPage] = useState(0);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const news = useNewsFeed(page, { categoryIds, tagIds });
  const categories = useNewsCategories();
  const tags = useNewsTags();
  const articles = news.data?.content ?? [];
  const totalPages = news.data?.totalPages ?? 0;
  const totalArticles = news.data?.totalElements ?? 0;
  const hasFilters = categoryIds.length > 0 || tagIds.length > 0;

  const toggleFilter = (id: number, values: number[], setValues: (next: number[]) => void) => {
    setPage(0);
    setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  };

  return (
    <PublicShell>
      <section className="panel touchline p-6">
        <h1 className="display-face text-5xl font-black">News wire</h1>
        <p className="mt-2 text-[var(--fv-muted)]">RSS and admin-published stories land here.</p>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="panel h-fit p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="display-face text-2xl font-black">Filters</h2>
            {hasFilters ? (
              <button className="text-sm font-bold text-[var(--fv-clay)]" type="button" onClick={() => { setCategoryIds([]); setTagIds([]); setPage(0); }}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <h3 className="font-black uppercase text-[var(--fv-muted)]">Categories</h3>
              {categories.isLoading ? <LoadingBlock label="Loading categories" /> : null}
              {categories.error ? <ErrorBlock message="Could not load categories." /> : null}
              <div className="mt-2 grid gap-2">
                {categories.data?.map((category) => (
                  <label className="flex items-center gap-2 font-bold" key={category.id}>
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => toggleFilter(category.id, categoryIds, setCategoryIds)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-black uppercase text-[var(--fv-muted)]">Tags</h3>
              {tags.isLoading ? <LoadingBlock label="Loading tags" /> : null}
              {tags.error ? <ErrorBlock message="Could not load tags." /> : null}
              <div className="mt-2 grid gap-2">
                {tags.data?.map((tag) => (
                  <label className="flex items-center gap-2 font-bold" key={tag.id}>
                    <input
                      type="checkbox"
                      checked={tagIds.includes(tag.id)}
                      onChange={() => toggleFilter(tag.id, tagIds, setTagIds)}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="grid gap-4">
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
                <span suppressHydrationWarning className="text-xs font-bold uppercase text-[var(--fv-muted)]">
                  {article.category ?? "Uncategorized"}
                  {article.publishedAt ? ` - ${new Date(article.publishedAt).toLocaleDateString("en-US")}` : ""}
                </span>
                <span className="mt-1 block text-2xl font-black">{article.title}</span>
                <span className="mt-2 block text-sm text-[var(--fv-muted)]">{article.summary ?? "Open the article for the full dispatch."}</span>
                {article.tags.length > 0 ? (
                  <span className="mt-3 flex flex-wrap gap-2">
                    {article.tags.map((tag) => <span className="border border-[var(--fv-line)] px-2 py-1 text-xs font-bold uppercase" key={tag}>{tag}</span>)}
                  </span>
                ) : null}
              </span>
            </Link>
          ))}
          {totalPages > 1 ? (
            <nav className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm font-bold uppercase text-[var(--fv-muted)]">
                Page {page + 1}/{totalPages} - {totalArticles} articles
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
        </div>
      </section>
    </PublicShell>
  );
}
