"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { NewsArticle, NewsCategory } from "@/app/news/_types";
import type { NewsSource } from "../_types";
import {
  useAdminNews,
  useAdminNewsCategories,
  useAdminNewsSources,
  useCreateNewsCategory,
  useCreateNewsSource,
  useToggleNewsSource,
  useDeleteNewsSource,
  useCrawlNow,
  useUpdateNewsStatus,
  useDeleteNewsArticle
} from "../_api";

export default function AdminNewsPage() {
  const [name, setName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const news = useAdminNews();
  const categories = useAdminNewsCategories();
  const sources = useAdminNewsSources();

  const createCategory = useCreateNewsCategory();
  const createSource = useCreateNewsSource();
  const toggleSource = useToggleNewsSource();
  const deleteSource = useDeleteNewsSource();
  const crawlNow = useCrawlNow();
  const updateStatus = useUpdateNewsStatus();
  const deleteArticle = useDeleteNewsArticle();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-face text-4xl font-black">News CMS</h1>
        <Link className="btn bg-[var(--fv-grass)] text-[var(--fv-ink)]" href="/admin/news/new">New article</Link>
      </div>
      <section className="mt-5 grid gap-5 md:grid-cols-[1fr_320px]">
        <div className="border border-white/15">
          {news.isLoading ? <LoadingBlock /> : null}
          {news.error ? <ErrorBlock message="Could not load articles." /> : null}
          {updateStatus.error || deleteArticle.error ? <ErrorBlock message="Could not update article." /> : null}
          {news.data?.content.map((article: NewsArticle) => (
            <article className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-[1fr_auto]" key={article.id}>
              <div>
                <p className="font-bold">{article.title}</p>
                <p className="text-xs uppercase opacity-70">{article.status} / {article.category ?? "uncategorized"}</p>
                {article.summary ? <p className="mt-2 text-sm opacity-80">{article.summary}</p> : null}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Link className="btn" href={`/admin/news/${article.id}`}>Edit</Link>
                {article.status !== "PUBLISHED" ? (
                  <button className="btn" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: article.id, status: "PUBLISHED" })}>Publish</button>
                ) : null}
                {article.status !== "DRAFT" ? (
                  <button className="btn" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: article.id, status: "DRAFT" })}>Draft</button>
                ) : null}
                {article.status !== "ARCHIVED" ? (
                  <button className="btn" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: article.id, status: "ARCHIVED" })}>Archive</button>
                ) : null}
                <button className="btn border-red-300/40 text-red-100" disabled={deleteArticle.isPending} onClick={() => deleteArticle.mutate(article.id)}>Delete</button>
              </div>
            </article>
          ))}
          {news.data?.content.length === 0 ? <div className="p-4 opacity-70">No articles yet.</div> : null}
        </div>
        <aside className="border border-white/15 p-4 flex flex-col gap-6">
          <div>
            <h2 className="font-black">Categories</h2>
            <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) createCategory.mutate(name, { onSuccess: () => setName("") }); }}>
              <input className="input text-[var(--fv-ink)]" value={name} onChange={(event) => setName(event.target.value)} />
              <button className="btn" disabled={createCategory.isPending || !name.trim()}>{createCategory.isPending ? "Adding..." : "Add"}</button>
            </form>
            <div className="mt-4 grid gap-2 text-sm">
              {categories.isLoading ? <LoadingBlock /> : null}
              {categories.error ? <ErrorBlock message="Could not load categories." /> : null}
              {createCategory.error ? <ErrorBlock message="Could not create category." /> : null}
              {categories.data?.length === 0 ? <span>No categories yet.</span> : null}
              {categories.data?.map((category: NewsCategory) => <span key={category.id}>{category.name}</span>)}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Sources</h2>
              <button 
                className="btn text-xs py-1 px-2 border-green-300/40 text-green-100" 
                onClick={() => crawlNow.mutate()}
                disabled={crawlNow.isPending}
              >
                {crawlNow.isPending ? "Crawling..." : "Crawl now"}
              </button>
            </div>
            <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); if (sourceName.trim() && sourceUrl.trim()) createSource.mutate({ name: sourceName, feedUrl: sourceUrl }, { onSuccess: () => { setSourceName(""); setSourceUrl(""); } }); }}>
              <input className="input text-[var(--fv-ink)] text-xs placeholder:text-gray-500" placeholder="Name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
              <input className="input text-[var(--fv-ink)] text-xs placeholder:text-gray-500" placeholder="Feed URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              <button className="btn w-full text-xs py-2" disabled={createSource.isPending || !sourceName.trim() || !sourceUrl.trim()}>{createSource.isPending ? "Adding..." : "Add Source"}</button>
            </form>
            <div className="mt-4 grid gap-3 text-sm max-h-[300px] overflow-y-auto">
              {sources.isLoading ? <LoadingBlock /> : null}
              {sources.error ? <ErrorBlock message="Could not load sources." /> : null}
              {createSource.error || toggleSource.error || deleteSource.error ? <ErrorBlock message="Could not update source." /> : null}
              {sources.data?.map((source: NewsSource) => (
                <div key={source.id} className="flex flex-col gap-1 p-2 border border-white/5 bg-white/5 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{source.name}</span>
                    <div className="flex gap-2">
                      <button 
                        className={`text-xs ${source.active ? 'text-green-300' : 'text-gray-400'}`} 
                        disabled={toggleSource.isPending}
                        onClick={() => toggleSource.mutate(source.id)}
                      >
                        {source.active ? "Active" : "Inactive"}
                      </button>
                      <button className="text-xs text-red-300" disabled={deleteSource.isPending} onClick={() => deleteSource.mutate(source.id)}>Delete</button>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-60 break-all">{source.feedUrl}</span>
                </div>
              ))}
              {sources.data?.length === 0 ? <div className="text-xs opacity-60">No sources yet.</div> : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
