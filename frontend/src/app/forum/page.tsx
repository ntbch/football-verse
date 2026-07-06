"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { ForumCategoryResponse, ThreadResponse, PageResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

export default function ForumPage() {
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);

  // Create thread form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [targetCategorySlug, setTargetCategorySlug] = useState("");

  // 1. Fetch categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: qk.forum.categories(),
    queryFn: () => data<ForumCategoryResponse[]>(http.get("/forum/categories")),
  });

  // Set first category slug as default when loaded
  React.useEffect(() => {
    if (categories.length > 0 && !activeCategorySlug) {
      setActiveCategorySlug(categories[0].slug);
      setTargetCategorySlug(categories[0].slug);
    }
  }, [categories, activeCategorySlug]);

  // 2. Fetch threads in the active category
  const { data: threadsPage, isLoading: isThreadsLoading } = useQuery({
    queryKey: qk.forum.threads(activeCategorySlug || ""),
    queryFn: () => {
      if (!activeCategorySlug) return null;
      return data<PageResponse<ThreadResponse>>(http.get(`/forum/categories/${activeCategorySlug}/threads`));
    },
    enabled: !!activeCategorySlug,
  });

  const threads = threadsPage?.content || [];

  // 3. Create Thread Mutation
  const createThreadMutation = useMutation({
    mutationFn: ({ catSlug, title, content, tags }: { catSlug: string; title: string; content: string; tags: string[] }) =>
      data<ThreadResponse>(http.post(`/forum/categories/${catSlug}/threads`, { title, content, tags })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.threads(activeCategorySlug || "") });
      toast({
        body: "Thread created successfully!",
        type: "info",
        autoHideDuration: 4000,
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewContent("");
      setNewTags("");
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to create thread."),
        type: "error",
      });
    },
  });

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({ body: "Please login to create a thread.", type: "info" });
      return;
    }
    if (!newTitle.trim() || !newContent.trim() || !targetCategorySlug) {
      toast({ body: "Title and content are required.", type: "error" });
      return;
    }
    const parsedTags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    createThreadMutation.mutate({
      catSlug: targetCategorySlug,
      title: newTitle.trim(),
      content: newContent.trim(),
      tags: parsedTags,
    });
  };

  const activeCategory = categories.find((c) => c.slug === activeCategorySlug);

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        {/* Editorial Title Banner — matches News page */}
        <div className="text-center py-6 border-b border-[var(--color-border)]">
          <h1 className="m-0 font-serif font-black text-4xl md:text-5xl uppercase tracking-tight text-[var(--color-text-primary)]">
            Fan Community Arena
          </h1>
          <p className="mt-2 font-serif italic text-sm md:text-base text-[var(--color-text-secondary)]">
            connect with football fans worldwide · discuss tactics, transfers, and matchdays
          </p>
        </div>

        {isCategoriesLoading ? (
          <LoadingBlock label="Loading Forum" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Left Sidebar — sticky, matches News */}
            <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24">
              {/* Categories Box */}
              <div className="rounded-2xl bg-white border border-[var(--color-border)] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                  <h3 className="font-serif font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                    💬 Categories
                  </h3>
                </div>
                <div className="p-3 flex flex-col gap-1">
                  {categories.map((cat) => {
                    const isActive = activeCategorySlug === cat.slug;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategorySlug(cat.slug)}
                        className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-between ${
                          isActive
                            ? "bg-[var(--fv-clay)] text-white shadow-sm"
                            : "text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)]"
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <span className={`text-[9px] font-mono font-black tabular-nums ml-2 shrink-0 ${isActive ? "text-white/70" : "text-[var(--color-text-secondary)]/50"}`}>
                          {cat.threadCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forum Overview Widget */}
              <div className="rounded-2xl bg-white border border-[var(--color-border)] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                  <h3 className="font-serif font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                    📊 Overview
                  </h3>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)] font-medium">Total Categories</span>
                    <span className="font-black tabular-nums">{categories.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-secondary)] font-medium">Total Threads</span>
                    <span className="font-black text-[var(--fv-clay)] tabular-nums">
                      {categories.reduce((sum, c) => sum + (c.threadCount ?? 0), 0)}
                    </span>
                  </div>
                  {activeCategory && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-secondary)] font-medium">Active Category</span>
                      <span className="font-black tabular-nums">{activeCategory.threadCount} threads</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Create Thread Button */}
              <button
                onClick={() => {
                  if (!auth) {
                    toast({ body: "Please login to create threads.", type: "info" });
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="w-full px-5 py-3 rounded-2xl text-xs font-serif font-black uppercase bg-[var(--fv-clay)] text-white hover:opacity-90 transition-all duration-200 shadow-sm tracking-wider"
              >
                ✍️ Create New Thread
              </button>
            </aside>

            {/* Right Column: Category Threads Feed */}
            <div className="lg:col-span-3 flex flex-col gap-4 w-full">
              {/* Category Header */}
              {activeCategory && (
                <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="m-0 font-serif font-black text-xl text-[var(--color-text-primary)]">
                        {activeCategory.name}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                        {activeCategory.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] bg-gray-100 px-3 py-1.5 rounded-full">
                      {activeCategory.threadCount} threads
                    </span>
                  </div>
                </div>
              )}

              {isThreadsLoading ? (
                <LoadingBlock label="Fetching threads" />
              ) : threads.length === 0 ? (
                <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
                  <h3 className="m-0 font-serif font-black text-xl text-[var(--color-text-primary)]">No Threads Yet</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">Be the first to start a discussion in this category!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--fv-clay)]/30 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          {/* Author & Meta */}
                          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold flex-wrap">
                            <span className="text-[var(--color-text-primary)]">@{thread.authorUsername}</span>
                            <span>·</span>
                            <span>
                              {new Date(thread.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {thread.pinned && (
                              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase">
                                Pinned
                              </span>
                            )}
                            {thread.locked && (
                              <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase">
                                Locked
                              </span>
                            )}
                          </div>

                          {/* Thread Title */}
                          <Link href={`/forum/threads/${thread.slug}`}>
                            <h4 className="m-0 font-serif font-black text-base text-[var(--color-text-primary)] hover:text-[var(--fv-clay)] cursor-pointer transition-colors duration-200 leading-snug">
                              {thread.title}
                            </h4>
                          </Link>

                          {/* Tags */}
                          {thread.tags && thread.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {thread.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full bg-gray-100 text-[9px] font-bold uppercase text-[var(--color-text-secondary)] tracking-wide"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] shrink-0 font-bold">
                          <span className="flex items-center gap-1">💬 {thread.replyCount}</span>
                          <span className="flex items-center gap-1">👍 {thread.likes}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Thread Modal Overlay */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-white border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="m-0 font-serif font-black text-lg text-[var(--color-text-primary)]">Create New Thread</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--fv-clay)] font-bold text-xs uppercase transition-colors"
                >
                  ✕ Close
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateThread} className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Forum Category</label>
                    <select
                      value={targetCategorySlug}
                      onChange={(e) => setTargetCategorySlug(e.target.value)}
                      className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Title</label>
                    <input
                      type="text"
                      placeholder="Enter a descriptive title for your thread"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Content</label>
                    <textarea
                      placeholder="What do you want to talk about?"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={6}
                      className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Tags (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. transfers, arsenal, gossip"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createThreadMutation.isPending}
                      className="px-5 py-2 rounded-full text-xs font-bold uppercase bg-[var(--fv-clay)] text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-sm"
                    >
                      {createThreadMutation.isPending ? "Creating..." : "Publish Thread"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
