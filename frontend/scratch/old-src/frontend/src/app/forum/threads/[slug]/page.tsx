"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { ThreadDetailResponse, PostResponse } from "@/shared/lib/types";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";
import { MentionRenderer } from "@/shared/components/MentionRenderer";
import { useToast } from "@/shared/components/toast";

export default function ThreadDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();

  const [replyText, setReplyText] = useState("");
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);

  // 1. Fetch thread details (includes posts page)
  const { data: detail, isLoading, error } = useQuery({
    queryKey: qk.forum.thread(slug),
    queryFn: () => data<ThreadDetailResponse>(http.get(`/forum/threads/${slug}`)),
  });

  const thread = detail?.thread;
  const posts = detail?.posts?.content || [];

  // 2. Submit reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      data<PostResponse>(http.post(`/forum/threads/${id}/replies`, { content })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      setReplyText("");
      toast({ body: "Reply posted!", type: "info", autoHideDuration: 3000 });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to submit reply."), type: "error" });
    },
  });

  // 3. Like Post Mutation
  const likePostMutation = useMutation({
    mutationFn: (postId: number) =>
      data<{ liked: boolean }>(http.post(`/forum/posts/${postId}/like`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to like post."), type: "error" });
    },
  });

  // 4. Mark Best Answer Mutation
  const bestAnswerMutation = useMutation({
    mutationFn: ({ threadId, postId }: { threadId: number; postId: number }) =>
      data<any>(http.post(`/forum/threads/${threadId}/best-answer`, { postId })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      toast({ body: "Marked best answer!", type: "info" });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to mark best answer."), type: "error" });
    },
  });

  // 5. Clear Best Answer Mutation
  const clearBestAnswerMutation = useMutation({
    mutationFn: (threadId: number) =>
      data<any>(http.delete(`/forum/threads/${threadId}/best-answer`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      toast({ body: "Cleared best answer.", type: "info" });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to clear best answer."), type: "error" });
    },
  });

  // 6. Moderation mutations (Pin, Lock, Hide)
  const pinMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<any>(http.patch(`/moderator/forum/threads/${id}/pin`, null, { params: { value } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      toast({ body: "Thread pin status updated.", type: "info" });
    },
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<any>(http.patch(`/moderator/forum/threads/${id}/lock`, null, { params: { value } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      toast({ body: "Thread lock status updated.", type: "info" });
    },
  });

  const hidePostMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<any>(http.patch(`/moderator/forum/posts/${id}/hide`, null, { params: { value } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      toast({ body: "Post visibility updated.", type: "info" });
    },
  });

  // 7. Submit Report Mutation
  const reportMutation = useMutation({
    mutationFn: (payload: { threadId?: number; postId?: number; reason: string }) =>
      data<any>(http.post("/forum/reports", payload)),
    onSuccess: () => {
      toast({ body: "Content reported successfully. A moderator will review it.", type: "info" });
      setShowReportModal(false);
      setReportReason("");
      setReportPostId(null);
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to submit report."), type: "error" });
    },
  });

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({ body: "Please login to reply.", type: "info" });
      router.push("/login");
      return;
    }
    if (!replyText.trim() || !thread) return;
    replyMutation.mutate({ id: thread.id, content: replyText.trim() });
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({ body: "Please login to report content.", type: "info" });
      return;
    }
    if (!reportReason.trim() || !thread) return;

    if (reportPostId) {
      reportMutation.mutate({ postId: reportPostId, reason: reportReason.trim() });
    } else {
      reportMutation.mutate({ threadId: thread.id, reason: reportReason.trim() });
    }
  };

  const isModOrAdmin = () => {
    return auth?.roles?.some((r) => r === "ADMIN" || r === "MODERATOR") || false;
  };

  if (isLoading) {
    return (
      <PublicShell>
        <LoadingBlock label="Loading Discussion Thread" />
      </PublicShell>
    );
  }

  if (error || !thread) {
    return (
      <PublicShell>
        <ErrorBlock message="Thread not found or failed to load discussion detail." />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-fade-in">

        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 text-xs">
          <Link href={`/forum/categories/${thread.categorySlug}`} className="text-[var(--fv-clay)] font-bold hover:underline transition-colors">
            ← Category: {thread.categoryName}
          </Link>
          <div className="flex items-center gap-3 text-[var(--color-text-secondary)] font-semibold">
            <span>Views: {thread.viewCount}</span>
            <span>Replies: {thread.replyCount}</span>
          </div>
        </div>

        {/* Thread Title & Meta */}
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-serif font-black text-2xl md:text-3xl text-[var(--color-text-primary)] tracking-tight">
            {thread.title}
          </h1>

          {/* Tags */}
          {thread.tags && thread.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {thread.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-gray-100 text-[9px] font-bold uppercase text-[var(--color-text-secondary)] tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Moderation Controls (Visible to Mod/Admin) */}
          {isModOrAdmin() && (
            <div className="flex items-center gap-2 bg-white border border-[var(--color-border)] p-3 rounded-xl text-[10px] font-bold uppercase shadow-sm">
              <span className="text-[var(--color-text-secondary)] self-center px-2">Mod Ops:</span>
              <button
                onClick={() => pinMutation.mutate({ id: thread.id, value: !thread.pinned })}
                className={`px-3 py-1 rounded-full transition-colors duration-200 ${
                  thread.pinned ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200"
                }`}
              >
                {thread.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => lockMutation.mutate({ id: thread.id, value: !thread.locked })}
                className={`px-3 py-1 rounded-full transition-colors duration-200 ${
                  thread.locked ? "bg-red-50 text-red-600" : "bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200"
                }`}
              >
                {thread.locked ? "Unlock" : "Lock"}
              </button>
            </div>
          )}
        </div>

        {/* Thread Posts Feed */}
        <div className="flex flex-col gap-4 mt-2">
          {posts.map((post, index) => {
            const isThreadOwner = auth && auth.username === thread.authorUsername;
            const isBestAnswer = post.bestAnswer;

            return (
              <div
                key={post.id}
                className={`p-5 border bg-white rounded-2xl shadow-sm transition-all duration-200 ${
                  isBestAnswer ? "border-green-400 bg-green-50/30" : "border-[var(--color-border)]"
                }`}
              >
                <div className="flex flex-col gap-3">
                  {/* Post Author & Meta */}
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2 font-semibold">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--color-text-primary)]">@{post.authorUsername}</span>
                      <span>·</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {index === 0 && (
                        <span className="bg-gray-200 text-[var(--color-text-primary)] text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">OP</span>
                      )}
                      {isBestAnswer && (
                        <span className="bg-green-100 text-green-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">Best Answer</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setReportPostId(post.id);
                          setShowReportModal(true);
                        }}
                        className="text-[var(--color-text-secondary)] hover:text-red-500 font-bold transition-colors"
                      >
                        ⚠️ Report
                      </button>

                      {isModOrAdmin() && (
                        <button
                          onClick={() => hidePostMutation.mutate({ id: post.id, value: !post.hidden })}
                          className="text-[var(--color-text-secondary)] hover:text-orange-500 font-bold ml-2 transition-colors"
                        >
                          {post.hidden ? "Unhide" : "Hide"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.hidden ? (
                    <span className="italic py-2 text-xs text-[var(--color-text-secondary)] font-medium">
                      [This post was hidden by a moderator.]
                    </span>
                  ) : (
                    <div className="text-sm leading-relaxed text-[var(--color-text-primary)] whitespace-pre-wrap font-medium">
                      <MentionRenderer content={post.content} />
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-1">
                    <button
                      onClick={() => likePostMutation.mutate(post.id)}
                      className={`text-xs font-semibold hover:opacity-85 flex items-center gap-1.5 transition-colors ${
                        post.liked ? "text-[var(--fv-clay)]" : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      👍 {post.likes}
                    </button>

                    {/* Best Answer Marking */}
                    {index > 0 && isThreadOwner && !thread.locked && (
                      isBestAnswer ? (
                        <button
                          onClick={() => clearBestAnswerMutation.mutate(thread.id)}
                          className="text-xs font-bold text-red-500 hover:underline transition-colors"
                        >
                          Unmark Best Answer
                        </button>
                      ) : (
                        <button
                          onClick={() => bestAnswerMutation.mutate({ threadId: thread.id, postId: post.id })}
                          className="text-xs font-bold text-green-600 hover:underline transition-colors"
                        >
                          Mark as Best Answer
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply Submission Box */}
        <div className="flex flex-col gap-4 mt-4 border-t border-[var(--color-border)] pt-6">
          <h3 className="m-0 font-serif font-black text-xl text-[var(--color-text-primary)]">
            Post a Reply
          </h3>

          {thread.locked ? (
            <div className="bg-red-50 border border-red-200 text-center rounded-2xl p-4">
              <p className="text-red-600 font-bold text-sm">
                🔒 This discussion thread has been locked. New replies are disabled.
              </p>
            </div>
          ) : auth ? (
            <form onSubmit={handleReplySubmit} className="w-full">
              <div className="flex flex-col gap-3 bg-white border border-[var(--color-border)] p-5 rounded-2xl shadow-sm">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Share your views or reply to this post... (Use @username to mention others)"
                  rows={4}
                  className="w-full bg-gray-50 border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30 font-medium"
                />
                <div className="text-right">
                  <button
                    disabled={replyMutation.isPending}
                    className="px-5 py-2.5 rounded-full text-xs font-bold uppercase bg-[var(--fv-clay)] text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-sm"
                  >
                    {replyMutation.isPending ? "Posting..." : "Submit Reply"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-6 bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] font-medium">
                Please{" "}
                <Link href="/login" className="font-bold text-[var(--fv-clay)] hover:underline">
                  Login
                </Link>{" "}
                to reply to discussions.
              </p>
            </div>
          )}
        </div>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white border border-[var(--color-border)] rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="m-0 font-serif font-black text-base text-[var(--color-text-primary)]">
                  Report Inappropriate Content
                </h3>
              </div>

              <form onSubmit={handleReportSubmit} className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Reason for reporting</label>
                    <input
                      type="text"
                      placeholder="e.g. Hate speech, toxicity, advertising, off-topic"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReportModal(false);
                        setReportReason("");
                        setReportPostId(null);
                      }}
                      className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportMutation.isPending}
                      className="px-5 py-2 rounded-full text-xs font-bold uppercase bg-[var(--fv-clay)] text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-sm"
                    >
                      {reportMutation.isPending ? "Reporting..." : "Submit Report"}
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
