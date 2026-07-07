"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

type RssSource = { id: number; name: string; feedUrl: string; sourceType: "RSS" | "SITEMAP" | "HOMEPAGE"; active: boolean };
type CrawlResult = { saved: number; repaired: number; skipped: number; failed: number };

export default function RssCrawlerPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("RSS");
  const [cssSelector, setCssSelector] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: qk.admin.newsSources(),
    queryFn: () => data<RssSource[]>(http.get("/admin/news/sources")),
  });

  const createMutation = useMutation({
    mutationFn: (p: { name: string; feedUrl: string; sourceType: string; cssSelector?: string }) => data<RssSource>(http.post("/admin/news/sources", p)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: "Source added successfully!", type: "info" });
      setNewName(""); setNewUrl(""); setCssSelector(""); setShowAdd(false);
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to add source. Make sure it is a valid URL."), type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => data<any>(http.delete(`/admin/news/sources/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: "Source deleted.", type: "info" });
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

  const crawlMutation = useMutation({
    mutationFn: () => data<CrawlResult>(http.post("/admin/news/crawl")),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.news() });
      queryClient.invalidateQueries({ queryKey: qk.admin.dashboardStats() });
      setCrawlResult(res);
      toast({ body: `Done! Saved: ${res.saved} · Skipped: ${res.skipped} · Failed: ${res.failed}`, type: "info", autoHideDuration: 6000 });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Crawler failed."), type: "error" }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return toast({ body: "Name and URL required.", type: "error" });
    createMutation.mutate({
      name: newName.trim(),
      feedUrl: newUrl.trim(),
      sourceType: newType,
      cssSelector: newType === "HOMEPAGE" && cssSelector.trim() ? cssSelector.trim() : undefined
    });
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter((s) => s.name.toLowerCase().includes(q) || s.feedUrl.toLowerCase().includes(q));
  }, [sources, search]);

  if (isLoading) return <LoadingBlock label="Fetching RSS directories" />;

  const activeSources = sources.filter((s) => s.active).length;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>News Sources</h1>
          <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{sources.length} sources · {activeSources} active</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative w-48 hidden sm:block">
            <input
              placeholder="Search source..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)]/50 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300"
            />
            <svg className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-secondary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="btn btn-secondary !rounded-full !px-4 !py-2 !text-xs whitespace-nowrap">
            {showAdd ? "Cancel" : "+ Add Source"}
          </button>
          <button
            onClick={() => crawlMutation.mutate()}
            disabled={crawlMutation.isPending}
            className="btn btn-primary !rounded-full !px-4 !py-2 !text-xs whitespace-nowrap"
          >
            {crawlMutation.isPending ? "Syncing…" : "Sync Feeds"}
          </button>
        </div>
      </div>

      {/* Last crawl result */}
      {crawlResult && (
        <div className="card p-4 flex items-center gap-6 text-xs" style={{ borderLeft: "3px solid var(--color-accent)" }}>
          <span className="font-black uppercase text-[10px]" style={{ color: "var(--color-accent)" }}>Last Run Result</span>
          {[
            { label: "Saved", value: crawlResult.saved, color: "#4a7c59" },
            { label: "Skipped", value: crawlResult.skipped, color: "var(--color-text-secondary)" },
            { label: "Failed", value: crawlResult.failed, color: "#b91c1c" },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span className="font-black tabular-nums text-base" style={{ color: m.color }}>{m.value}</span>
              <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Source Form */}
      {showAdd && (
        <div className="card p-5">
          <form onSubmit={handleCreate}>
            <div className="flex flex-col gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>Add New Source</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-secondary)" }}>Source Name</label>
                  <input type="text" placeholder="e.g. BBC Sport" value={newName} onChange={(e) => setNewName(e.target.value)} className="input !text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-secondary)" }}>Feed / Page URL</label>
                  <input type="text" placeholder="https://feeds.bbc.co.uk/.../rss.xml" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="input !text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-secondary)" }}>Source Type</label>
                  <select value={newType} onChange={(e) => { setNewType(e.target.value); setCssSelector(""); }}
                    className="input !text-xs cursor-pointer">
                    <option value="RSS">RSS Feed</option>
                    <option value="SITEMAP">Sitemap Index / XML</option>
                    <option value="HOMEPAGE">Homepage Scraper</option>
                  </select>
                </div>
              </div>
              
              {newType === "HOMEPAGE" && (
                <div className="flex flex-col gap-1 w-full md:w-1/2">
                  <label className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-secondary)" }}>CSS Selector (Optional)</label>
                  <input type="text" placeholder="e.g. .news-list__item a (defaults to all links)" value={cssSelector} onChange={(e) => setCssSelector(e.target.value)} className="input !text-xs" />
                </div>
              )}

              <div className="text-[10px] italic" style={{ color: "var(--color-text-secondary)" }}>
                RSS: standard XML feed. Sitemap: crawls listed article URLs. Homepage: parses article links directly from homepage HTML (optionally restricted by CSS selector).
              </div>
              <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary !px-4 !py-2 !text-xs">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn btn-primary !px-4 !py-2 !text-xs">
                  {createMutation.isPending ? "Adding…" : "Add Source"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Sources Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Configured Sources</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-background-body)" }}>
              {["Name", "URL / Endpoint", "Type", "State", "Actions"].map((h, i) => (
                <th key={h} className={`py-3 px-4 text-[10px] font-black uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`} style={{ color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>No crawler sources configured yet.</td></tr>
            ) : filtered.map((src, i) => (
              <tr key={src.id} className="hover:bg-black/[0.02] transition-colors" style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--color-border)" : undefined }}>
                <td className="py-3 px-4 font-bold" style={{ color: "var(--color-text-primary)" }}>{src.name}</td>
                <td className="py-3 px-4 max-w-xs">
                  <a href={src.feedUrl} target="_blank" rel="noreferrer" className="font-mono text-[10px] truncate block hover:underline" style={{ color: "var(--color-text-secondary)" }}>{src.feedUrl}</a>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase" style={{ background: "rgba(180,95,53,0.08)", color: "var(--color-accent)" }}>
                    {src.sourceType || "RSS"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black" style={{ color: src.active ? "#4a7c59" : "var(--color-text-secondary)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: src.active ? "#4a7c59" : "#9ca3af" }} />
                    {src.active ? "ENABLED" : "DISABLED"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button onClick={() => toggleMutation.mutate(src.id)}
                      className="px-2.5 py-1 rounded text-[9px] font-black uppercase hover:opacity-80 transition-opacity"
                      style={src.active ? { background: "rgba(109,113,95,0.12)", color: "var(--color-text-secondary)" } : { background: "rgba(74,124,89,0.12)", color: "#4a7c59" }}>
                      {src.active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => { if (window.confirm(`Delete ${src.name}?`)) deleteMutation.mutate(src.id); }}
                      className="px-2.5 py-1 rounded text-[9px] font-black uppercase hover:opacity-80 transition-opacity"
                      style={{ background: "rgba(185,28,28,0.12)", color: "#b91c1c" }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
