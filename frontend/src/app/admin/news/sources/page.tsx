"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

type RssSource = {
  id: number;
  name: string;
  url: string;
  type: string;
  active: boolean;
};

type CrawlResult = {
  saved: number;
  repaired: number;
  skipped: number;
  failed: number;
};

export default function RssCrawlerPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("RSS");
  const [showAddForm, setShowAddForm] = useState(false);

  // 1. Fetch RSS Sources
  const { data: sources = [], isLoading } = useQuery({
    queryKey: qk.admin.newsSources(),
    queryFn: () => data<RssSource[]>(http.get("/admin/news/sources")),
  });

  // 2. Create Source Mutation
  const createSourceMutation = useMutation({
    mutationFn: (payload: { name: string; url: string; type: string }) =>
      data<RssSource>(http.post("/admin/news/sources", payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: "New crawler source added successfully!", type: "info" });
      setNewName("");
      setNewUrl("");
      setShowAddForm(false);
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to create source."), type: "error" });
    },
  });

  // 3. Delete Source Mutation
  const deleteSourceMutation = useMutation({
    mutationFn: (id: number) => data<any>(http.delete(`/admin/news/sources/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: "Crawler source deleted.", type: "info" });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to delete source."), type: "error" });
    },
  });

  // 4. Toggle Source Mutation
  const toggleSourceMutation = useMutation({
    mutationFn: (id: number) => data<RssSource>(http.patch(`/admin/news/sources/${id}/toggle`)),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.newsSources() });
      toast({ body: `${updated.name} crawler is now ${updated.active ? "enabled" : "disabled"}.`, type: "info" });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to toggle source."), type: "error" });
    },
  });

  // 5. Run Crawler Mutation
  const crawlMutation = useMutation({
    mutationFn: () => data<CrawlResult>(http.post("/admin/news/crawl")),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.news() });
      queryClient.invalidateQueries({ queryKey: qk.admin.dashboardStats() });
      toast({
        body: `Crawler Completed! Saved: ${res.saved} | Skipped: ${res.skipped} | Failed: ${res.failed}`,
        type: "info",
        autoHideDuration: 6000,
      });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Crawler run failed."), type: "error" });
    },
  });

  const handleCreateSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) {
      toast({ body: "Name and URL are required.", type: "error" });
      return;
    }
    createSourceMutation.mutate({ name: newName.trim(), url: newUrl.trim(), type: newType });
  };

  if (isLoading) {
    return <LoadingBlock label="Fetching RSS directories" />;
  }

  return (
    <div className="flex flex-col gap-4 w-full text-white">
      <div className="flex items-center justify-between w-full border-b border-[var(--color-border)] pb-2">
        <h3 className="font-serif text-xl md:text-2xl font-black tracking-tight text-white m-0 font-serif font-bold text-xl text-white">
          RSS Crawler Feeds
        </h3>
        
        <div className="flex items-center gap-2 ">
          <button
  type="button"
  onClick={() => crawlMutation.mutate()}
  disabled={false || crawlMutation.isPending}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-black hover:opacity-90 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {crawlMutation.isPending ? "Loading..." : crawlMutation.isPending ? "Crawling Feeds..." : "Run Crawler Now"}
</button>
          <button
  type="button"
  onClick={() => setShowAddForm(!showAddForm)}
  disabled={false || false}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-white hover:bg-white/5 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {false ? "Loading..." : "Add Crawler Source"}
</button>
        </div>
      </div>

      {/* Add Form Card */}
      {showAddForm && (
        <div className="p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium bg-[var(--color-background-surface)] border border-[var(--color-border)] w-full">
          <form onSubmit={handleCreateSource} className="w-full">
            <div className="flex flex-col gap-3 ">
              <span className="text-xs font-bold uppercase text-[var(--color-accent)]">Register RSS feed</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Source Name</label>
  <input
    type="text"
    placeholder="e.g. BBC Sport"
    value={newName}
    onChange={(e) => setNewName(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>
                <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">RSS Feed URL</label>
  <input
    type="text"
    placeholder="e.g. http://feeds.bbci.co.uk/sport/football/rss.xml"
    value={newUrl}
    onChange={(e) => setNewUrl(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
  type="button"
  onClick={() => setShowAddForm(false)}
  disabled={false || false}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-white hover:bg-white/5 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {false ? "Loading..." : "Cancel"}
</button>
                <button
  type="button"
  disabled={false || createSourceMutation.isPending}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-black hover:opacity-90 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {createSourceMutation.isPending ? "Loading..." : createSourceMutation.isPending ? "Adding..." : "Add feed"}
</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* List of Sources */}
      <div className="bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-secondary)] font-bold">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">URL</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Crawler State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-[var(--color-text-secondary)] italic">
                    No crawler sources configured.
                  </td>
                </tr>
              ) : (
                sources.map((source) => (
                  <tr key={source.id} className="hover:bg-[var(--color-background-body)] text-white">
                    <td className="py-3 px-4 font-bold">{source.name}</td>
                    <td className="py-3 px-4 font-mono select-all truncate max-w-xs">{source.url}</td>
                    <td className="py-3 px-4 font-bold text-gray-300">{source.type}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[9px] ${
                          source.active
                            ? "bg-green-950 text-green-300 border border-green-800"
                            : "bg-gray-900 text-gray-400 border border-gray-800"
                        }`}
                      >
                        {source.active ? "ENABLED" : "DISABLED"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1.5 inline-flex">
                        <button
                          onClick={() => toggleSourceMutation.mutate(source.id)}
                          className={`text-[9px] font-bold uppercase rounded px-2.5 py-1 transition-colors ${
                            source.active ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-green-800 hover:bg-green-700 text-white"
                          }`}
                        >
                          {source.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${source.name}?`)) {
                              deleteSourceMutation.mutate(source.id);
                            }
                          }}
                          className="bg-red-800 hover:bg-red-700 text-white text-[9px] font-bold uppercase rounded px-2.5 py-1 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
