"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CommunityShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import { ThreadResponse, PageResponse, ForumCategoryResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import Link from "next/link";

export default function ForumCategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  // Fetch threads in the category
  const { data: threadsPage, isLoading: isThreadsLoading } = useQuery({
    queryKey: qk.forum.threads(slug),
    queryFn: () => data<PageResponse<ThreadResponse>>(http.get(`/forum/categories/${slug}/threads`)),
  });

  // Fetch categories to show a header title
  const { data: categories = [] } = useQuery({
    queryKey: qk.forum.categories(),
    queryFn: () => data<ForumCategoryResponse[]>(http.get("/forum/categories")),
  });

  const categoryName = categories.find((c) => c.slug === slug)?.name || slug.replace("-", " ").toUpperCase();
  const threads = threadsPage?.content || [];

  if (isThreadsLoading) {
    return (
      <CommunityShell>
        <LoadingBlock label={`Loading threads for ${categoryName}`} />
      </CommunityShell>
    );
  }

  return (
    <CommunityShell>
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <Link href="/forum" className="text-xs uppercase font-bold text-[var(--color-accent)] hover:opacity-85 transition-all-300">
            ← Back to Community Arena
          </Link>
          <span className="text-xs text-[var(--color-text-secondary)] font-bold">Category: {categoryName}</span>
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="m-0 font-serif font-black text-2xl md:text-3xl text-white">
            Category discussions: {categoryName}
          </h1>

          {threads.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-premium">
              <p className="text-sm text-[var(--color-text-secondary)] font-medium">No threads found in this category yet. Click 'Back to Community Arena' to create one!</p>
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
    </CommunityShell>
  );
}
