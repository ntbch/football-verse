"use client";

import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAdminNewsSources, useCreateNewsSource, useCrawlNow } from "../../_api";
import type { NewsSource } from "../../_types";

const SOURCE_TYPES = ["RSS", "SITEMAP", "HOMEPAGE"] as const;

const PLACEHOLDER: Record<string, string> = {
  RSS: "https://example.com/feed.xml",
  SITEMAP: "https://example.com/sitemap.xml",
  HOMEPAGE: "https://example.com",
};

export default function AdminRssSourcesPage() {
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [sourceType, setSourceType] = useState<string>("RSS");
  const [cssSelector, setCssSelector] = useState("");
  const sources = useAdminNewsSources();
  const create = useCreateNewsSource();
  const crawl = useCrawlNow();

  return (
    <div>
      <h1 className="display-face text-4xl font-black">Sources</h1>
      <form className="mt-5 grid gap-3 border border-white/15 p-4 md:grid-cols-[140px_140px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); create.mutate({ name, feedUrl, sourceType, cssSelector: cssSelector || undefined }, { onSuccess: () => { setName(""); setFeedUrl(""); setSourceType("RSS"); setCssSelector(""); } }); }}>
        <input className="input text-[var(--fv-ink)]" placeholder="Source name" value={name} onChange={(event) => setName(event.target.value)} />
        <select className="input text-[var(--fv-ink)]" value={sourceType} onChange={(event) => { setSourceType(event.target.value); if (event.target.value !== "RSS") setFeedUrl(""); }}>
          {SOURCE_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <input className="input text-[var(--fv-ink)]" placeholder={PLACEHOLDER[sourceType] ?? "URL"} value={feedUrl} onChange={(event) => setFeedUrl(event.target.value)} />
        <button className="btn" disabled={create.isPending || !name.trim() || !feedUrl.trim()}>{create.isPending ? "Adding..." : "Add"}</button>
      </form>
      {sourceType === "HOMEPAGE" ? (
        <input className="input mt-2 text-[var(--fv-ink)]" placeholder="Optional CSS link selector (e.g. .headline a, .story a)" value={cssSelector} onChange={(event) => setCssSelector(event.target.value)} />
      ) : null}
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
            <p className="font-bold">
              {source.name}
              <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs">{source.sourceType}</span>
            </p>
            <p className="break-all text-sm opacity-70">{source.feedUrl}</p>
            {source.cssSelector ? <p className="text-xs opacity-50">Selector: {source.cssSelector}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
