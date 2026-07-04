"use client";

import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAdminNewsSources, useCreateNewsSource, useCrawlNow } from "../../_api";
import type { NewsSource } from "../../_types";

export default function AdminRssSourcesPage() {
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const sources = useAdminNewsSources();
  const create = useCreateNewsSource();
  const crawl = useCrawlNow();

  return (
    <div>
      <h1 className="display-face text-4xl font-black">RSS Sources</h1>
      <form className="mt-5 grid gap-3 border border-white/15 p-4 md:grid-cols-[220px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); create.mutate({ name, feedUrl }, { onSuccess: () => { setName(""); setFeedUrl(""); } }); }}>
        <input className="input text-[var(--fv-ink)]" placeholder="Source name" value={name} onChange={(event) => setName(event.target.value)} />
        <input className="input text-[var(--fv-ink)]" placeholder="https://example.com/feed.xml" value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} />
        <button className="btn" disabled={create.isPending || !name.trim() || !feedUrl.trim()}>{create.isPending ? "Adding..." : "Add"}</button>
      </form>
      {create.error ? <ErrorBlock message="Could not create source." /> : null}
      {crawl.error ? <ErrorBlock message="Could not crawl sources." /> : null}
      <button className="btn btn-secondary mt-4 border-white text-white" disabled={crawl.isPending} onClick={() => crawl.mutate()}>
        {crawl.isPending ? "Crawling..." : `Crawl now ${crawl.data ? `(${crawl.data.saved} saved)` : ""}`}
      </button>
      <div className="mt-5 grid gap-3">
        {sources.isLoading ? <LoadingBlock /> : null}
        {sources.error ? <ErrorBlock message="Could not load sources." /> : null}
        {sources.data?.length === 0 ? <p>No sources yet.</p> : null}
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
