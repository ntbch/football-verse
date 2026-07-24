"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data } from "@/shared/lib/api-client";
import type { ThreadResponse, ForumCategoryResponse } from "../../types";
import type { PageResponse } from "@/shared/lib/api-types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import Link from "next/link";

export default function ForumCategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

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

  const category = categories.find((c) => c.slug === slug);
  const categoryName = category?.name || slug.replace("-", " ").toUpperCase();
  const threads = threadsPage?.content || [];

  if (isThreadsLoading) {
    return (
      <PublicShell>
        <LoadingBlock label={`Loading threads for ${categoryName}`} />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-fade-in mt-4">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <Link
            href="/forum"
            className="text-xs uppercase font-bold text-[var(--color-accent)] hover:opacity-85 transition-colors"
          >
            ← Back to Community Arena
          </Link>
          <span className="text-xs text-[var(--color-text-secondary)] font-bold">
            Category: {categoryName}
          </span>
        </div>

        {/* Category Header */}
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-serif-title font-black text-2xl md:text-3xl text-[var(--color-text-primary)]">
            {categoryName}
          </h1>
          {category?.description && (
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {category.description}
            </p>
          )}
        </div>

        {/* Thread List */}
        {threads.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
            <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
              No Threads Yet
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              No threads found in this category yet. Go back to create one!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
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
                    <Link href={`/forum/threads/${thread.slug}`}>
                      <h4 className="m-0 font-serif-title font-black text-base text-[var(--color-text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors leading-snug">
                        {thread.title}
                      </h4>
                    </Link>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] shrink-0 font-bold">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{thread.replyCount}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                      </svg>
                      <span>{thread.likes}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
