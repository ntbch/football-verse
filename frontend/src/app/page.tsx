"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { ForumCategory, NewsArticle, PageResponse } from "@/shared/lib/types";

export default function HomePage() {
  const news = useQuery({
    queryKey: ["home-news"],
    queryFn: () => data<PageResponse<NewsArticle>>(http.get("/news?size=3"))
  });
  const forum = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => data<ForumCategory[]>(http.get("/forum/categories"))
  });

  return (
    <PublicShell>
      <section className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <div className="panel touchline p-6 md:p-8">
          <p className="font-bold uppercase text-[var(--fv-clay)]">Phase 1 live</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-black leading-none md:text-7xl">
            Newsroom pace. Terrace noise. One football hub.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--fv-muted)]">
            Read match stories, start forum threads, save articles, and moderate the community from a separate admin deck.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn" href="/news">
              Read news
            </Link>
            <Link className="btn btn-secondary" href="/forum">
              Enter forum
            </Link>
          </div>
        </div>

        <aside className="panel p-5">
          <h2 className="display-face text-3xl font-black">Touchline board</h2>
          <div className="mt-5 grid gap-3">
            <div className="border-l-4 border-[var(--fv-grass)] pl-3">
              <p className="text-3xl font-black">{news.data?.totalElements ?? 0}</p>
              <p className="text-sm uppercase text-[var(--fv-muted)]">Published articles</p>
            </div>
            <div className="border-l-4 border-[var(--fv-clay)] pl-3">
              <p className="text-3xl font-black">{forum.data?.length ?? 0}</p>
              <p className="text-sm uppercase text-[var(--fv-muted)]">Forum rooms</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="panel p-5">
          <h2 className="display-face text-3xl font-black">Latest</h2>
          {news.isLoading ? <LoadingBlock /> : null}
          {news.error ? <ErrorBlock message="Could not load news." /> : null}
          <div className="mt-4 grid gap-3">
            {news.data?.content.map((article) => (
              <Link className="border-t border-[var(--fv-line)] pt-3 hover:underline" href={`/news/${article.slug}`} key={article.id}>
                <p className="font-bold">{article.title}</p>
                <p className="text-sm text-[var(--fv-muted)]">{article.category ?? "Uncategorized"}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="display-face text-3xl font-black">Forum rooms</h2>
          <div className="mt-4 grid gap-3">
            {forum.data?.map((category) => (
              <Link className="border-t border-[var(--fv-line)] pt-3 font-bold hover:underline" href={`/forum/categories/${category.slug}`} key={category.id}>
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
