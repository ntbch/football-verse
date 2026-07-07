"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { ForumCategoryResponse, ThreadResponse, PageResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import {
  ForumHeroBanner,
  CategoryList,
  ForumSidebarWidget,
  CategoryBanner,
  ThreadCard,
  CreateThreadModal,
} from "./_components";

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
      return data<PageResponse<ThreadResponse>>(
        http.get(`/forum/categories/${activeCategorySlug}/threads`)
      );
    },
    enabled: !!activeCategorySlug,
  });

  const threads = threadsPage?.content || [];

  // Sort threads: pinned first, then by recency
  const sortedThreads = [...threads].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // "Trending" = highest replies + likes
  const trendingThreads = [...threads]
    .sort((a, b) => (b.replyCount + b.likes) - (a.replyCount + a.likes))
    .slice(0, 4);

  // 3. Create Thread Mutation
  const createThreadMutation = useMutation({
    mutationFn: ({
      catSlug,
      title,
      content,
      tags,
    }: {
      catSlug: string;
      title: string;
      content: string;
      tags: string[];
    }) =>
      data<ThreadResponse>(
        http.post(`/forum/categories/${catSlug}/threads`, { title, content, tags })
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.threads(activeCategorySlug || "") });
      toast({ body: "Thread created successfully!", type: "info", autoHideDuration: 4000 });
      setShowCreateModal(false);
      setNewTitle("");
      setNewContent("");
      setNewTags("");
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to create thread."), type: "error" });
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
  const totalThreads = categories.reduce((sum, c) => sum + (c.threadCount ?? 0), 0);

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full animate-fade-in">

        {/* Hero Banner */}
        <ForumHeroBanner totalThreads={totalThreads} totalCategories={categories.length} />

        {isCategoriesLoading ? (
          <LoadingBlock label="Loading Forum" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* ── Left Sidebar ── */}
            <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24">
              <CategoryList
                categories={categories}
                activeCategorySlug={activeCategorySlug}
                onSelect={setActiveCategorySlug}
              />

              {/* Create Thread CTA */}
              <button
                onClick={() => {
                  if (!auth) {
                    toast({ body: "Please login to create threads.", type: "info" });
                    return;
                  }
                  setShowCreateModal(true);
                }}
                className="w-full btn btn-primary !rounded-2xl !py-3 !text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Start New Thread</span>
              </button>

              <ForumSidebarWidget
                categories={categories}
                activeCategory={activeCategory}
                trendingThreads={trendingThreads}
              />
            </aside>

            {/* ── Main Thread Feed ── */}
            <div className="lg:col-span-3 flex flex-col gap-4 w-full">
              {/* Category banner header */}
              {activeCategory && <CategoryBanner category={activeCategory} />}

              {/* Thread list */}
              {isThreadsLoading ? (
                <LoadingBlock label="Fetching threads" />
              ) : sortedThreads.length === 0 ? (
                <div className="text-center py-20 bg-white border border-[var(--color-border)] rounded-2xl flex flex-col items-center gap-4 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-[var(--color-border)]">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
                      No Threads Yet
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                      Be the first to spark a conversation!
                    </p>
                  </div>
                  {auth && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn btn-primary !px-6 !py-2.5 !text-xs active:scale-[0.98]"
                    >
                      Create the First Thread
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sortedThreads.map((thread, i) => (
                    <ThreadCard key={thread.id} thread={thread} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Thread Modal */}
        {showCreateModal && (
          <CreateThreadModal
            categories={categories}
            targetCategorySlug={targetCategorySlug}
            newTitle={newTitle}
            newContent={newContent}
            newTags={newTags}
            isPending={createThreadMutation.isPending}
            onCategoryChange={setTargetCategorySlug}
            onTitleChange={setNewTitle}
            onContentChange={setNewContent}
            onTagsChange={setNewTags}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateThread}
          />
        )}
      </div>
    </PublicShell>
  );
}
