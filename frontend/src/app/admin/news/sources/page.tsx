"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data, http } from "@/shared/lib/api-client";
import type { NewsSource } from "@/shared/lib/types";

export default function AdminRssSourcesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const sources = useQuery({ queryKey: ["news-sources"], queryFn: () => data<NewsSource[]>(http.get("/admin/news/sources")) });
  const create = useMutation({
    mutationFn: () => data<NewsSource>(http.post("/admin/news/sources", { name, feedUrl })),
    onSuccess: () => {
      setName("");
      setFeedUrl("");
      queryClient.invalidateQueries({ queryKey: ["news-sources"] });
    }
  });
  const crawl = useMutation({ mutationFn: () => data<{ saved: number }>(http.post("/admin/news/crawl")) });

  return (
    <div>
      <h1 className="display-face text-4xl font-black">RSS Sources</h1>
      <form className="mt-5 grid gap-3 border border-white/15 p-4 md:grid-cols-[220px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <input className="input text-[var(--fv-ink)]" placeholder="Source name" value={name} onChange={(event) => setName(event.target.value)} />
        <input className="input text-[var(--fv-ink)]" placeholder="https://example.com/feed.xml" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} />
        <button className="btn">Add</button>
      </form>
      <button className="btn btn-secondary mt-4 border-white text-white" onClick={() => crawl.mutate()}>
        Crawl now {crawl.data ? `(${crawl.data.saved} saved)` : ""}
      </button>
      <div className="mt-5 grid gap-3">
        {sources.data?.map((source) => (
          <div className="border border-white/15 p-4" key={source.id}>
            <p className="font-bold">{source.name}</p>
            <p className="break-all text-sm opacity-70">{source.feedUrl}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
