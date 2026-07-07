"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import type { ForumCategoryResponse, ThreadResponse, PageResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

export default function AdminForumPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [catSearch, setCatSearch] = useState("");
  const [threadSearch, setThreadSearch] = useState("");

  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [threadPage, setThreadPage] = useState(0);

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: qk.forum.categories(),
    queryFn: () => data<ForumCategoryResponse[]>(http.get("/forum/categories")),
  });

  useEffect(() => {
    if (categories.length > 0 && !activeCategorySlug) {
      setActiveCategorySlug(categories[0].slug);
    }
  }, [categories, activeCategorySlug]);

  const { data: threadPageData, isLoading: isThreadsLoading } = useQuery({
    queryKey: ["admin", "threads", activeCategorySlug, threadPage],
    queryFn: () =>
      data<PageResponse<ThreadResponse>>(
        http.get(`/forum/categories/${activeCategorySlug}/threads`, { params: { page: threadPage, size: 20 } })
      ),
    enabled: !!activeCategorySlug,
  });

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.slug === activeCategorySlug) || null;
  }, [categories, activeCategorySlug]);

  const rawThreads = threadPageData?.content || [];
  const totalPages = threadPageData?.totalPages || 0;

  const filteredThreads = useMemo(() => {
    if (!threadSearch.trim()) return rawThreads;
    const q = threadSearch.toLowerCase();
    return rawThreads.filter((t) => t.title.toLowerCase().includes(q) || t.authorUsername.toLowerCase().includes(q));
  }, [rawThreads, threadSearch]);

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories;
    const q = catSearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const createCategoryMutation = useMutation({
    mutationFn: (p: { name: string; slug: string; description: string }) =>
      data<ForumCategoryResponse>(http.post("/admin/forum/categories", p)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.categories() });
      toast({ body: "Category created!", type: "info" });
      setNewName(""); setNewSlug(""); setNewDescription(""); setShowAdd(false);
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to create category."), type: "error" }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<ThreadResponse>(http.patch(`/admin/forum/threads/${id}/pin`, null, { params: { value } })),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "threads", activeCategorySlug, threadPage] });
      toast({ body: `Thread ${updated.pinned ? "pinned" : "unpinned"}.`, type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update pin state."), type: "error" }),
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<ThreadResponse>(http.patch(`/admin/forum/threads/${id}/lock`, null, { params: { value } })),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "threads", activeCategorySlug, threadPage] });
      toast({ body: `Thread ${updated.locked ? "locked" : "unlocked"}.`, type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update lock state."), type: "error" }),
  });

  const hideMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<ThreadResponse>(http.patch(`/admin/forum/threads/${id}/hide`, null, { params: { value } })),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "threads", activeCategorySlug, threadPage] });
      toast({ body: `Thread ${updated.hidden ? "hidden" : "revealed"}.`, type: "info" });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update hide state."), type: "error" }),
  });

  const handleNameChange = (val: string) => {
    setNewName(val);
    setNewSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim() || !newDescription.trim())
      return toast({ body: "All fields required.", type: "error" });
    createCategoryMutation.mutate({ name: newName.trim(), slug: newSlug.trim(), description: newDescription.trim() });
  };

  if (isCategoriesLoading) return <LoadingBlock label="Fetching forum structure" />;

  const totalThreads = categories.reduce((acc, c) => acc + (c.threadCount ?? 0), 0);
  const totalPosts = categories.reduce((acc, c) => acc + (c.postCount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 w-full h-[calc(100vh-48px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Forum Management</h1>
          <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{categories.length} categories · {totalThreads} threads</span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary !rounded-full !px-4 !py-2 !text-xs whitespace-nowrap">
          {showAdd ? "Cancel" : "+ New Category"}
        </button>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {[
          { label: "Total Categories", value: categories.length },
          { label: "Total Threads", value: totalThreads },
          { label: "Total Posts", value: totalPosts },
        ].map((s) => (
          <div key={s.label} className="card p-3 flex flex-col gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>{s.label}</span>
            <span className="text-lg font-black font-serif-title" style={{ color: "var(--color-accent)" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Add Category Form */}
      {showAdd && (
        <div className="card p-4 shrink-0">
          <form onSubmit={handleCreateCategory}>
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--color-accent)" }}>New Category</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-secondary)" }}>Category Name</label>
                  <input type="text" placeholder="e.g. Champions League" value={newName} onChange={(e) => handleNameChange(e.target.value)} className="input !text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-secondary)" }}>Slug</label>
                  <input type="text" placeholder="e.g. champions-league" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} className="input !text-xs font-mono" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-secondary)" }}>Description</label>
                <input type="text" placeholder="Short description of this category…" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="input !text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary !px-4 !py-2 !text-xs">Cancel</button>
                <button type="submit" disabled={createCategoryMutation.isPending} className="btn btn-primary !px-4 !py-2 !text-xs">
                  {createCategoryMutation.isPending ? "Creating…" : "Create Category"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Double Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Left Panel: Categories Explorer */}
        <div className="flex flex-col gap-3 h-full min-h-0">
          <div className="relative shrink-0">
            <input
              placeholder="Search category..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)]/50 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300"
            />
            <svg className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-secondary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
            {filteredCategories.length === 0 ? (
              <div className="text-xs italic p-4 text-center" style={{ color: "var(--color-text-secondary)" }}>No categories found</div>
            ) : filteredCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCategorySlug(c.slug);
                  setThreadPage(0);
                  setThreadSearch("");
                }}
                className={`card p-4 text-left transition-all hover:shadow-sm shrink-0 flex flex-col gap-1.5 border-l-3 ${
                  activeCategorySlug === c.slug
                    ? "!border-l-[var(--color-accent)] bg-black/[0.01]"
                    : "!border-l-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs" style={{ color: "var(--color-text-primary)" }}>{c.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: "var(--color-text-secondary)" }}>/{c.slug}</span>
                </div>
                <p className="text-[10px] leading-relaxed line-clamp-1 m-0" style={{ color: "var(--color-text-secondary)" }}>{c.description}</p>
                <div className="flex items-center gap-3 text-[9px] mt-1 font-bold" style={{ color: "var(--color-text-secondary)" }}>
                  <span>{c.threadCount ?? 0} threads</span>
                  <span className="w-1 h-1 rounded-full bg-stone-300" />
                  <span>{c.postCount ?? 0} posts</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Category Thread manager */}
        <div className="lg:col-span-2 h-full min-h-0">
          {activeCategory ? (
            <div className="card p-5 flex flex-col h-full min-h-0">
              {/* Category Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <h3 className="font-serif-title font-black text-sm m-0" style={{ color: "var(--color-text-primary)" }}>
                    {activeCategory.name}
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {activeCategory.description}
                  </p>
                </div>

                {/* Thread Search Box */}
                <div className="relative w-full sm:w-48 shrink-0">
                  <input
                    placeholder="Search thread title..."
                    value={threadSearch}
                    onChange={(e) => setThreadSearch(e.target.value)}
                    className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)]/50 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300"
                  />
                  <svg className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-secondary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Threads Table Container */}
              <div className="flex-1 overflow-y-auto w-full py-2 min-h-0">
                {isThreadsLoading ? (
                  <div className="py-12 text-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>Loading threads...</div>
                ) : filteredThreads.length === 0 ? (
                  <div className="py-12 text-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                    {threadSearch.trim() ? "No threads match your search." : "No threads in this category yet."}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }} className="font-bold">
                        <th className="py-2.5 px-3">Thread Title</th>
                        <th className="py-2.5 px-3">Author</th>
                        <th className="py-2.5 px-3 text-center">Replies</th>
                        <th className="py-2.5 px-3 text-center">Pinned</th>
                        <th className="py-2.5 px-3 text-center">Locked</th>
                        <th className="py-2.5 px-3 text-center">Hidden</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {filteredThreads.map((t) => (
                        <tr key={t.id} className="hover:bg-black/[0.01]">
                          <td className="py-3 px-3 font-bold max-w-[180px] truncate" style={{ color: "var(--color-text-primary)" }}>
                            <Link href={`/forum/threads/${t.slug}`} target="_blank" className="hover:underline hover:text-[var(--color-accent)]">
                              {t.title}
                            </Link>
                          </td>
                          <td className="py-3 px-3" style={{ color: "var(--color-text-secondary)" }}>@{t.authorUsername}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>{t.replyCount}</td>
                          
                          {/* Pinned toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => pinMutation.mutate({ id: t.id, value: !t.pinned })}
                              className="focus:outline-none"
                              style={{ color: t.pinned ? "var(--color-accent)" : "#9ca3af" }}
                              title={t.pinned ? "Unpin thread" : "Pin thread"}
                            >
                              <svg className="w-4 h-4 mx-auto" fill={t.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </button>
                          </td>

                          {/* Locked toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => lockMutation.mutate({ id: t.id, value: !t.locked })}
                              className="focus:outline-none"
                              style={{ color: t.locked ? "#b91c1c" : "#9ca3af" }}
                              title={t.locked ? "Unlock thread" : "Lock thread"}
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                {t.locked ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                )}
                              </svg>
                            </button>
                          </td>

                          {/* Hidden toggle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => hideMutation.mutate({ id: t.id, value: !t.hidden })}
                              className="focus:outline-none"
                              style={{ color: t.hidden ? "#b91c1c" : "#4a7c59" }}
                              title={t.hidden ? "Unhide thread" : "Hide thread"}
                            >
                              <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                {t.hidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                ) : (
                                  <>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </>
                                )}
                              </svg>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <Link href={`/forum/threads/${t.slug}`} target="_blank"
                              className="font-bold hover:underline" style={{ color: "var(--color-accent)" }}>
                              Open →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Thread Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-3 shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <button onClick={() => setThreadPage((p) => Math.max(0, p - 1))} disabled={threadPage === 0}
                    className="btn btn-secondary !px-3 !py-1.5 !text-[10px]">← Prev</button>
                  <span className="text-[10px] font-semibold px-3 py-1.5 card" style={{ color: "var(--color-text-secondary)" }}>
                    {threadPage + 1} / {totalPages}
                  </span>
                  <button onClick={() => setThreadPage((p) => Math.min(totalPages - 1, p + 1))} disabled={threadPage >= totalPages - 1}
                    className="btn btn-secondary !px-3 !py-1.5 !text-[10px]">Next →</button>
                </div>
              )}
            </div>
          ) : (
            <div className="card h-full flex items-center justify-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
              Please select a category on the left to manage its threads.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
