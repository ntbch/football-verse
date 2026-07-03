"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data, http } from "@/shared/lib/api-client";
import type { NewsArticle, NewsCategory, PageResponse } from "@/shared/lib/types";

export default function AdminNewsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const news = useQuery({ queryKey: ["admin-news"], queryFn: () => data<PageResponse<NewsArticle>>(http.get("/admin/news?size=50")) });
  const categories = useQuery({ queryKey: ["news-categories"], queryFn: () => data<NewsCategory[]>(http.get("/admin/news/categories")) });
  const createCategory = useMutation({
    mutationFn: () => data<NewsCategory>(http.post("/admin/news/categories", { name })),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["news-categories"] });
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
        <aside className="border border-white/15 p-4">
          <h2 className="font-black">Categories</h2>
          <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) createCategory.mutate(); }}>
            <input className="input text-[var(--fv-ink)]" value={name} onChange={(event) => setName(event.target.value)} />
            <button className="btn">Add</button>
          </form>
          <div className="mt-4 grid gap-2 text-sm">
            {categories.data?.map((category) => <span key={category.id}>{category.name}</span>)}
          </div>
        </aside>
      </section>
    </div>
  );
}
