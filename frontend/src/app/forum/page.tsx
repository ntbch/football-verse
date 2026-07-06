"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CommunityShell } from "@/shared/components/page-shell";
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

  return (
    <CommunityShell>
      <div className="flex flex-col gap-6 w-full animate-fade-in">
        {/* Banner */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--color-border)] pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 font-black text-2xl md:text-3xl text-[var(--color-accent)] tracking-tight">
              FAN COMMUNITY ARENA
            </h2>
            <p className="text-[10px] text-[var(--color-text-secondary)] font-semibold">Connect with football fans worldwide. Discuss tactics, transfers, matchdays, and share your predictions.</p>
          </div>

          <button
            onClick={() => {
              if (!auth) {
                toast({ body: "Please login to create threads.", type: "info" });
                return;
              }
              setShowCreateModal(true);
            }}
            className="px-5 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-white hover:opacity-90 transition-all-300 shadow-sm"
          >
            Create New Thread
          </button>
        </div>

        {isCategoriesLoading ? (
          <LoadingBlock label="Arena Loading" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start w-full">
            
            {/* Left Column: Categories sidebar */}
            <div className="w-full lg:col-span-1 flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
                Forum Categories
              </span>

              <div className="flex flex-col gap-2">
                {categories.map((cat) => {
                  const isActive = activeCategorySlug === cat.slug;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setActiveCategorySlug(cat.slug)}
                      className={`cursor-pointer p-4 border rounded-2xl transition-all duration-300 ${
                        isActive
                          ? "bg-[var(--color-background-surface)] border-[var(--color-accent)] shadow-premium"
                          : "bg-[var(--color-background-body)] border-[var(--color-border)] hover:bg-[var(--color-background-surface)]"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{cat.name}</span>
                          <span className="text-[10px] bg-[var(--color-border)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full font-mono font-bold">
                            {cat.threadCount}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                          {cat.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Category Threads Feed */}
            <div className="lg:col-span-3 flex flex-col gap-4 w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
                Category Feed: {categories.find((c) => c.slug === activeCategorySlug)?.name || ""}
              </span>

              {isThreadsLoading ? (
                <LoadingBlock label="Fetching category threads" />
              ) : threads.length === 0 ? (
                <div className="text-center py-12 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8">
                  <p className="text-sm text-[var(--color-text-secondary)] font-medium">No discussion threads found in this category yet. Be the first to start one!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      className="p-5 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-premium shadow-premium-hover hover:border-[var(--color-accent)] transition-all-300"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
                            <span className="text-white">@{thread.authorUsername}</span>
                            <span>•</span>
                            <span>
                              {new Date(thread.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {thread.pinned && (
                              <span className="bg-yellow-600 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold">
                                PINNED
                              </span>
                            )}
                            {thread.locked && (
                              <span className="bg-red-800 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold">
                                LOCKED
                              </span>
                            )}
                          </div>
                          <Link href={`/forum/threads/${thread.slug}`}>
                            <h4 className="m-0 font-serif font-bold text-base hover:text-[var(--color-accent)] cursor-pointer text-white transition-all-300">
                              {thread.title}
                            </h4>
                          </Link>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] shrink-0 font-bold">
                          <span>💬 {thread.replyCount} replies</span>
                          <span>👍 {thread.likes} likes</span>
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-premium">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                  <h3 className="m-0 font-black text-lg text-white">Create New Discussion Thread</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-white hover:text-[var(--color-accent)] font-bold text-xs uppercase transition-all-300"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleCreateThread} className="w-full">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Forum Category</label>
                      <select
                        value={targetCategorySlug}
                        onChange={(e) => setTargetCategorySlug(e.target.value)}
                        className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded-lg p-2 focus:outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Title</label>
                      <input
                        type="text"
                        placeholder="Enter a descriptive title for your thread"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Content</label>
                      <textarea
                        placeholder="What do you want to talk about?"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        rows={6}
                        className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Tags (Comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. transfers, arsenal, gossip"
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createThreadMutation.isPending}
                        className="px-5 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-all-300"
                      >
                        {createThreadMutation.isPending ? "Creating..." : "Publish Thread"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </CommunityShell>
  );
}
