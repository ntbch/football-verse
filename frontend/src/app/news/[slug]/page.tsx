"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useToast } from "@/shared/components/toast";
import type { NewsArticleResponse, CommentResponse } from "@/shared/lib/types";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";

// Main component
export default function NewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();

  // Root level comment text state
  const [commentText, setCommentText] = useState("");
  // Reply comment states
  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  // 1. Fetch Article Detail
  const {
    data: article,
    isLoading: isArticleLoading,
    error: articleError,
  } = useQuery({
    queryKey: qk.news.detail(slug),
    queryFn: () => data<NewsArticleResponse>(http.get(`/news/${slug}`)),
  });

  // 2. Fetch Article Comments
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: qk.news.comments(slug),
    queryFn: () => data<CommentResponse[]>(http.get(`/news/${slug}/comments`)),
  });

  // 3. Like Mutation
  const likeMutation = useMutation({
    mutationFn: (articleId: number) => http.post(`/news/${articleId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.news.detail(slug) });
      toast({
        body: "Like status toggled!",
        type: "info",
        autoHideDuration: 3000,
      });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to toggle like."),
        type: "error",
      });
    },
  });

  // 4. Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: (articleId: number) => http.post(`/news/${articleId}/bookmark`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.news.detail(slug) });
      toast({
        body: "Bookmark status toggled!",
        type: "info",
        autoHideDuration: 3000,
      });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to toggle bookmark."),
        type: "error",
      });
    },
  });

  // 5. Submit Comment Mutation
  const commentMutation = useMutation({
    mutationFn: ({
      articleId,
      content,
      parentId,
    }: {
      articleId: number;
      content: string;
      parentId?: number;
    }) => data<CommentResponse>(http.post(`/news/${articleId}/comments`, { content, parentId })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.news.comments(slug) });
      setCommentText("");
      setReplyTargetId(null);
      setReplyText("");
      toast({
        body: "Comment posted!",
        type: "info",
        autoHideDuration: 3000,
      });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to post comment."),
        type: "error",
      });
    },
  });

  // 6. Like Comment Mutation
  const likeCommentMutation = useMutation({
    mutationFn: (commentId: number) => http.post(`/news/comments/${commentId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.news.comments(slug) });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to like comment."),
        type: "error",
      });
    },
  });

  const handleLike = () => {
    if (!auth) {
      toast({ body: "Please login to like this article.", type: "info" });
      router.push("/login");
      return;
    }
    if (article) {
      likeMutation.mutate(article.id);
    }
  };

  const handleBookmark = () => {
    if (!auth) {
      toast({ body: "Please login to bookmark this article.", type: "info" });
      router.push("/login");
      return;
    }
    if (article) {
      bookmarkMutation.mutate(article.id);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({ body: "Please login to leave a comment.", type: "info" });
      router.push("/login");
      return;
    }
    if (!commentText.trim() || !article) return;
    commentMutation.mutate({ articleId: article.id, content: commentText.trim() });
  };

  const handleReplySubmit = (parentId: number) => {
    if (!auth) {
      toast({ body: "Please login to reply.", type: "info" });
      router.push("/login");
      return;
    }
    if (!replyText.trim() || !article) return;
    commentMutation.mutate({ articleId: article.id, content: replyText.trim(), parentId });
  };

  const handleLikeComment = (commentId: number) => {
    if (!auth) {
      toast({ body: "Please login to like comments.", type: "info" });
      router.push("/login");
      return;
    }
    likeCommentMutation.mutate(commentId);
  };

  if (isArticleLoading) {
    return (
      <PublicShell>
        <LoadingBlock label="Loading Article Detail" />
      </PublicShell>
    );
  }

  if (articleError || !article) {
    return (
      <PublicShell>
        <ErrorBlock message="Article not found or failed to load article details." />
      </PublicShell>
    );
  }

  // Recursive Comment Node Component
  const CommentNode = ({ comment, depth = 0 }: { comment: CommentResponse; depth?: number }) => {
    const isReplying = replyTargetId === comment.id;

    return (
      <div className="w-full flex flex-col pt-4 border-l border-[var(--color-border)] pl-4 ml-1 md:ml-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--color-text-primary)]">{comment.username}</span>
            <span className="text-[var(--color-text-secondary)] font-semibold">
              {new Date(comment.publishedAt).toLocaleDateString()}
            </span>
          </div>

          <p className="text-xs md:text-sm text-[var(--color-text-primary)] leading-relaxed font-medium">
            {comment.content}
          </p>

          <div className="flex items-center gap-3 text-xs font-semibold pt-1">
            <button
              onClick={() => handleLikeComment(comment.id)}
              className={`hover:opacity-85 flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                comment.liked ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
              </svg>
              <span>{comment.likes}</span>
            </button>
            <button
              onClick={() => {
                if (isReplying) {
                  setReplyTargetId(null);
                  setReplyText("");
                } else {
                  setReplyTargetId(comment.id);
                  setReplyText("");
                }
              }}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all active:scale-[0.98]"
            >
              {isReplying ? "Cancel" : "Reply"}
            </button>
          </div>

          {/* Inline Reply Form */}
          {isReplying && (
            <div className="flex flex-col gap-2 mt-2 pl-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.username}...`}
                className="w-full px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReplySubmit(comment.id)}
                  disabled={commentMutation.isPending && replyTargetId === comment.id}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {commentMutation.isPending && replyTargetId === comment.id
                    ? "Submitting..."
                    : "Submit Reply"}
                </button>
                <button
                  onClick={() => {
                    setReplyTargetId(null);
                    setReplyText("");
                  }}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 w-full">
              {comment.replies.map((reply) => (
                <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in mt-4">
        {/* Article Breadcrumbs & Meta */}
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-3">
          <Link href="/news" className="hover:text-[var(--color-accent)] transition-colors">
            ← Back to Touchline News
          </Link>
          <span>{article.category || "Football Verse Editorial"}</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-3 text-center md:text-left">
          <h1 className="m-0 font-serif-title font-black text-3xl md:text-5xl leading-tight text-[var(--color-text-primary)] tracking-tight">
            {article.title}
          </h1>
          <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-[var(--color-text-secondary)] font-semibold border-y border-[var(--color-border)] py-3">
            <div className="flex items-center gap-4">
              <span>
                Published:{" "}
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span>Likes: {article.likes}</span>
              <span>Bookmarks: {article.bookmarks}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className="px-4 py-1.5 bg-[var(--color-background-surface)] hover:bg-black/5 border border-[var(--color-border)] rounded-full text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                <span>Like</span>
              </button>
              <button
                onClick={handleBookmark}
                className="px-4 py-1.5 bg-[var(--color-background-surface)] hover:bg-black/5 border border-[var(--color-border)] rounded-full text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Bookmark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Article Summary */}
        <div className="bg-[var(--color-background-body)] border-l-4 border-[var(--color-accent)] p-4 rounded-xl text-xs md:text-sm italic text-[var(--color-text-secondary)] leading-relaxed font-serif">
          {article.summary}
        </div>

        {/* Article content body */}
        <article className="article-body text-base md:text-lg text-[var(--color-text-primary)] leading-relaxed font-serif">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>

        {/* Comments Section */}
        <div className="flex flex-col gap-6 mt-8 border-t border-[var(--color-border)] pt-8">
          <h3 className="m-0 font-serif-title font-black text-2xl border-b border-[var(--color-border)] pb-2 text-[var(--color-text-primary)]">
            Discussions ({comments.length})
          </h3>

          {/* Root Comment Submission Form */}
          {auth ? (
            <form onSubmit={handleCommentSubmit} className="w-full">
              <div className="flex flex-col gap-3 bg-[var(--color-background-surface)] border border-[var(--color-border)] p-5 rounded-2xl shadow-premium">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                  Add to the discussion as {auth.username}
                </span>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts on this story..."
                  className="w-full px-4 py-2.5 rounded-xl text-xs border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                />
                <div className="text-right">
                  <button
                    disabled={commentMutation.isPending && replyTargetId === null}
                    className="btn btn-primary !rounded-full !px-5 !py-2 !text-xs active:scale-[0.98] transition-all"
                  >
                    {commentMutation.isPending && replyTargetId === null
                      ? "Submitting..."
                      : "Submit Comment"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-6 bg-[var(--color-background-body)] border border-[var(--color-border)] rounded-2xl p-6">
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] font-medium">
                Please{" "}
                <Link
                  href="/login"
                  className="font-bold text-[var(--color-accent)] hover:underline"
                >
                  Login
                </Link>{" "}
                to join the discussion and post comments.
              </p>
            </div>
          )}

          {/* Comments List */}
          {isCommentsLoading ? (
            <LoadingBlock label="Loading comments" />
          ) : comments.length === 0 ? (
            <p className="italic py-8 text-center text-xs text-[var(--color-text-secondary)] font-semibold">
              No comments yet. Be the first to start the conversation!
            </p>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              {/* Only render root level comments here */}
              {comments
                .filter((c) => !c.parentId)
                .map((c) => (
                  <CommentNode key={c.id} comment={c} />
                ))}
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
