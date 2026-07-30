"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import { CrawlerTerminal } from "./components/crawler-terminal";

type ProviderCategory = "ALL" | "RSS" | "GNEWS" | "REDDIT" | "TWITTER" | "YOUTUBE";

type RssSource = {
  id: number;
  name: string;
  feedUrl: string;
  sourceType: "RSS" | "GNEWS" | "REDDIT" | "TWITTER" | "YOUTUBE";
  provider?: string;
  publisherName?: string;
  active: boolean;
  autoPublish: boolean;
};

type CrawlResult = { accepted?: boolean; saved: number; repaired: number; skipped: number; failed: number };

function getEffectiveProvider(src: RssSource): ProviderCategory {
  const p = (src.provider || "").toLowerCase();
  const st = (src.sourceType || "").toUpperCase();
  const url = (src.feedUrl || "").toLowerCase();
  const name = (src.name || "").toLowerCase();

  if (p === "reddit" || st === "REDDIT" || url.includes("reddit.com") || name.includes("(reddit)") || url.includes("/r/")) return "REDDIT";
  if (p === "x" || p === "twitter" || st === "TWITTER" || url.includes("x.com") || url.includes("twitter.com") || name.includes("(x)")) return "TWITTER";
  if (p === "youtube" || st === "YOUTUBE" || url.includes("youtube.com") || name.includes("youtube")) return "YOUTUBE";
  if (p === "gnews" || st === "GNEWS" || url.includes("gnews")) return "GNEWS";
  return "RSS";
}

export default function RssCrawlerPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [providerTab, setProviderTab] = useState<ProviderCategory>("ALL");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<RssSource["sourceType"]>("RSS");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const { data: sources = [], isLoading, error, refetch } = useQuery({
    queryKey: qk.admin.newsSources(),
    queryFn: () => data<RssSource[]>(http.get("/admin/news/sources")),
  });

  const createMutation = useMutation({
    mutationFn: (p: { name: string; feedUrl: string; sourceType: string; provider: string }) =>
      data<RssSource>(http.post("/admin/news/sources", p)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: "New ingestion source added successfully!", type: "info" });
      setNewName(""); setNewUrl(""); setShowAdd(false);
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to add source. Ensure URL is valid."), type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => data<any>(http.delete(`/admin/news/sources/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: "Source removed from active crawlers.", type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to delete."), type: "error" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => data<RssSource>(http.patch(`/admin/news/sources/${id}/toggle`)),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: `${s.name} ${s.active ? "enabled" : "disabled"}.`, type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to toggle."), type: "error" }),
  });

  const toggleAutoPublishMutation = useMutation({
    mutationFn: (id: number) => data<RssSource>(http.patch(`/admin/news/sources/${id}/auto-publish`)),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: `${s.name} is now ${s.autoPublish ? "approved for automatic stories" : "review-only"}.`, type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update publication approval."), type: "error" }),
  });

  const crawlMutation = useMutation({
    mutationFn: () => data<CrawlResult>(http.post("/admin/news/crawl")),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.news() });
      queryClient.invalidateQueries({ queryKey: qk.admin.dashboardStats() });
      setCrawlResult(res);
      toast({
        body: res.accepted
          ? "Ingestion pipeline accepted. New stories will populate automatically."
          : "Synchronization could not start.",
        type: res.accepted ? "info" : "error",
        autoHideDuration: 6000,
      });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Crawler failed."), type: "error" }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return toast({ body: "Name and Feed URL required.", type: "error" });
    
    let resolvedProvider = newType.toLowerCase();
    if (newType === "TWITTER") resolvedProvider = "x";

    createMutation.mutate({
      name: newName.trim(),
      feedUrl: newUrl.trim(),
      sourceType: newType,
      provider: resolvedProvider,
    });
  };

  // Provider counts
  const categoryCounts = useMemo(() => {
    const counts: Record<ProviderCategory, number> = {
      ALL: sources.length,
      RSS: 0,
      GNEWS: 0,
      REDDIT: 0,
      TWITTER: 0,
      YOUTUBE: 0,
    };
    sources.forEach((s) => {
      const cat = getEffectiveProvider(s);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [sources]);

  const filtered = useMemo(() => {
    return sources.filter((s) => {
      const effectiveCat = getEffectiveProvider(s);
      if (providerTab !== "ALL" && effectiveCat !== providerTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.feedUrl.toLowerCase().includes(q);
      }
      return true;
    });
  }, [sources, providerTab, search]);

  if (isLoading) return <LoadingBlock label="Fetching ingestion crawler directory" />;
  if (error && sources.length === 0) return <ErrorBlock message="News sources could not be loaded." onRetry={() => refetch()} />;

  const activeSources = sources.filter((s) => s.active).length;

  const PROVIDER_TABS: { key: ProviderCategory; label: string }[] = [
    { key: "ALL", label: `All Crawlers (${categoryCounts.ALL})` },
    { key: "RSS", label: `RSS Feeds (${categoryCounts.RSS})` },
    { key: "GNEWS", label: `GNews / REST API (${categoryCounts.GNEWS})` },
    { key: "REDDIT", label: `Reddit Subreddits (${categoryCounts.REDDIT})` },
    { key: "TWITTER", label: `X / Twitter Feeds (${categoryCounts.TWITTER})` },
    { key: "YOUTUBE", label: `YouTube Channels (${categoryCounts.YOUTUBE})` },
  ];

  return (
    <div className="flex flex-col gap-5 w-full">
      {error ? <ErrorBlock message="News sources could not be refreshed. Showing the last available results." onRetry={() => refetch()} /> : null}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-xl font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            Ingestion Crawlers & Sources
          </h1>
          <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mt-0.5">
            Monitor RSS, GNews API, Reddit, X and YouTube automated football story collectors
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-48 hidden sm:block">
            <input
              placeholder="Search source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-black/10 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:border-[var(--color-accent)] transition-all"
            />
            <svg className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="py-2 px-4 rounded-full text-xs font-bold transition-all border border-[var(--color-border)] bg-white/5 hover:bg-white/10 active:scale-[0.98] cursor-pointer"
          >
            {showAdd ? "Cancel" : "+ Add Crawler Source"}
          </button>
          <button
            onClick={() => crawlMutation.mutate()}
            disabled={crawlMutation.isPending}
            className="py-2 px-4 rounded-full text-xs font-black uppercase tracking-wider transition-all bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md"
          >
            {crawlMutation.isPending ? "Syncing Pipeline..." : "Sync All Feeds"}
          </button>
        </div>
      </div>

      {/* Provider Categorization Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-border)] pb-1">
        {PROVIDER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setProviderTab(t.key)}
            className={`px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              providerTab === t.key
                ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live Terminal Log */}
      <CrawlerTerminal isSyncing={crawlMutation.isPending} />

      {/* Last crawl result card */}
      {crawlResult && (
        <div className="card p-4 flex items-center justify-between gap-6 text-xs border-l-4 border-l-[var(--color-accent)] bg-black/10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-black uppercase text-[var(--color-accent)]">
              Last Sync Summary:
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {crawlResult.accepted ? "Pipeline executed successfully." : "Execution pending."}
            </span>
          </div>
          <div className="flex items-center gap-6 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-emerald-400">{crawlResult.saved}</span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">Saved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-gray-400">{crawlResult.skipped}</span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">Skipped</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-red-400">{crawlResult.failed}</span>
              <span className="text-[10px] text-[var(--color-text-secondary)]">Failed</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Source Form */}
      {showAdd && (
        <div className="card p-5 animate-fade-in">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
              Register New Crawler Source
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)]">Source Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Sky Sports Football"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)]">Feed / Channel URL:</label>
                <input
                  type="text"
                  placeholder="https://feeds.skysports.com/rss/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[var(--color-text-secondary)]">Crawler Adapter Type:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
                >
                  <option value="RSS">RSS Feed</option>
                  <option value="GNEWS">GNews REST API</option>
                  <option value="REDDIT">Reddit Subreddit Adapter</option>
                  <option value="TWITTER">X / Twitter Account Adapter</option>
                  <option value="YOUTUBE">YouTube Channel Feed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
              <button type="button" onClick={() => setShowAdd(false)} className="py-1.5 px-4 rounded text-xs font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="py-1.5 px-4 rounded text-xs font-black uppercase tracking-wider bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-[0.98] cursor-pointer"
              >
                {createMutation.isPending ? "Registering..." : "Add Ingestion Source"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sources Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
            Configured Ingestion Channels ({filtered.length})
          </span>
          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
            {activeSources} active channels
          </span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-black/10">
                {["Source Name", "Feed Endpoint", "Provider Type", "Status & Approval", "Actions"].map((h, i) => (
                  <th key={h} className={`py-3 px-4 text-[10px] font-black uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`} style={{ color: "var(--color-text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-xs italic text-[var(--color-text-secondary)]">No crawler sources matching category filter.</td></tr>
              ) : filtered.map((src, i) => {
                const effType = getEffectiveProvider(src);
                return (
                  <tr key={src.id} className="hover:bg-white/[0.03] transition-colors border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 px-4 font-bold text-[var(--color-text-primary)]">{src.name}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <a href={src.feedUrl} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-[var(--color-text-secondary)] truncate block hover:underline">
                        {src.feedUrl}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                        {effType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-black" style={{ color: src.active ? "#4a7c59" : "var(--color-text-secondary)" }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: src.active ? "#4a7c59" : "gray" }} />
                          {src.active ? "ENABLED" : "DISABLED"}
                        </span>
                        <span className="text-[9px] font-black uppercase" style={{ color: src.autoPublish ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
                          {src.autoPublish ? "AUTO-PUBLISH" : "REVIEW ONLY"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => toggleMutation.mutate(src.id)}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase hover:opacity-80 transition-opacity cursor-pointer border border-[var(--color-border)]"
                          style={src.active ? { background: "rgba(255,255,255,0.05)", color: "var(--color-text-secondary)" } : { background: "rgba(74,124,89,0.15)", color: "#4a7c59" }}
                        >
                          {src.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => toggleAutoPublishMutation.mutate(src.id)}
                          disabled={!src.active || toggleAutoPublishMutation.isPending}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer border border-[var(--color-border)]"
                          style={src.autoPublish ? { background: "rgba(180,95,53,0.15)", color: "var(--color-accent)" } : { background: "rgba(74,124,89,0.15)", color: "#4a7c59" }}
                        >
                          {src.autoPublish ? "Review Mode" : "Auto Approve"}
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Delete ${src.name}?`)) deleteMutation.mutate(src.id); }}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
