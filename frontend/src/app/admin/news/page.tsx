"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data, http } from "@/shared/lib/api-client";
import type { NewsArticle, NewsCategory, NewsSource, PageResponse } from "@/shared/lib/types";

export default function AdminNewsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const news = useQuery({ queryKey: ["admin-news"], queryFn: () => data<PageResponse<NewsArticle>>(http.get("/admin/news?size=50")) });
  const categories = useQuery({ queryKey: ["news-categories"], queryFn: () => data<NewsCategory[]>(http.get("/admin/news/categories")) });
  const sources = useQuery({ queryKey: ["news-sources"], queryFn: () => data<NewsSource[]>(http.get("/admin/news/sources")) });

  const createCategory = useMutation({
    mutationFn: () => data<NewsCategory>(http.post("/admin/news/categories", { name })),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["news-categories"] });
    }
  });

  const createSource = useMutation({
    mutationFn: () => data<NewsSource>(http.post("/admin/news/sources", { name: sourceName, feedUrl: sourceUrl })),
    onSuccess: () => {
      setSourceName("");
      setSourceUrl("");
      queryClient.invalidateQueries({ queryKey: ["news-sources"] });
    }
  });

  const toggleSource = useMutation({
    mutationFn: (id: number) => data<NewsSource>(http.patch(`/admin/news/sources/${id}/toggle`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news-sources"] })
  });

  const deleteSource = useMutation({
    mutationFn: (id: number) => data<{ deleted: boolean }>(http.delete(`/admin/news/sources/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news-sources"] })
  });

  const crawlNow = useMutation({
    mutationFn: () => data<{ saved: number }>(http.post("/admin/news/crawl")),
    onSuccess: (res) => {
      alert(`Crawled successfully! Saved ${res.saved} new articles.`);
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
    },
    onError: (err: any) => {
      alert("Crawl failed: " + (err.response?.data?.message || err.message));
    }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: NewsArticle["status"] }) =>
      data<NewsArticle>(http.patch(`/admin/news/${id}/status`, { status })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-news"] })
  });
  
  const deleteArticle = useMutation({
    mutationFn: (id: number) => data<{ deleted: boolean }>(http.delete(`/admin/news/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-news"] })
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-face text-4xl font-black">News CMS</h1>
        <Link className="btn bg-[var(--fv-grass)] text-[var(--fv-ink)]" href="/admin/news/new">New article</Link>
      </div>
      <section className="mt-5 grid gap-5 md:grid-cols-[1fr_320px]">
        <div className="border border-white/15">
          {news.data?.content.map((article) => (
            <article className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-[1fr_auto]" key={article.id}>
              <div>
                <p className="font-bold">{article.title}</p>
                <p className="text-xs uppercase opacity-70">{article.status} / {article.category ?? "uncategorized"}</p>
                {article.summary ? <p className="mt-2 text-sm opacity-80">{article.summary}</p> : null}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Link className="btn" href={`/admin/news/${article.id}`}>Edit</Link>
                {article.status !== "PUBLISHED" ? (
                  <button className="btn" onClick={() => updateStatus.mutate({ id: article.id, status: "PUBLISHED" })}>Publish</button>
                ) : null}
                {article.status !== "DRAFT" ? (
                  <button className="btn" onClick={() => updateStatus.mutate({ id: article.id, status: "DRAFT" })}>Draft</button>
                ) : null}
                {article.status !== "ARCHIVED" ? (
                  <button className="btn" onClick={() => updateStatus.mutate({ id: article.id, status: "ARCHIVED" })}>Archive</button>
                ) : null}
                <button className="btn border-red-300/40 text-red-100" onClick={() => deleteArticle.mutate(article.id)}>Delete</button>
              </div>
            </article>
          ))}
          {news.data?.content.length === 0 ? <div className="p-4 opacity-70">No articles yet.</div> : null}
        </div>
        <aside className="border border-white/15 p-4 flex flex-col gap-6">
          <div>
            <h2 className="font-black">Categories</h2>
            <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) createCategory.mutate(); }}>
              <input className="input text-[var(--fv-ink)]" value={name} onChange={(event) => setName(event.target.value)} />
              <button className="btn">Add</button>
            </form>
            <div className="mt-4 grid gap-2 text-sm">
              {categories.data?.map((category) => <span key={category.id}>{category.name}</span>)}
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
            <form className="mt-3 flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); if (sourceName.trim() && sourceUrl.trim()) createSource.mutate(); }}>
              <input className="input text-[var(--fv-ink)] text-xs placeholder:text-gray-500" placeholder="Name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
              <input className="input text-[var(--fv-ink)] text-xs placeholder:text-gray-500" placeholder="Feed URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              <button className="btn w-full text-xs py-2">Add Source</button>
            </form>
            <div className="mt-4 grid gap-3 text-sm max-h-[300px] overflow-y-auto">
              {sources.data?.map((source) => (
                <div key={source.id} className="flex flex-col gap-1 p-2 border border-white/5 bg-white/5 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{source.name}</span>
                    <div className="flex gap-2">
                      <button 
                        className={`text-xs ${source.active ? 'text-green-300' : 'text-gray-400'}`} 
                        onClick={() => toggleSource.mutate(source.id)}
                      >
                        {source.active ? "Active" : "Inactive"}
                      </button>
                      <button className="text-xs text-red-300" onClick={() => deleteSource.mutate(source.id)}>Delete</button>
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
