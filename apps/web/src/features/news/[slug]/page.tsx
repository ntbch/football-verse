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
import type { NewsArticleResponse, CommentResponse } from "../types";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";
import { getArticleImage } from "@/shared/lib/images";

import { buildCommentTree, preprocessArticleContent } from "./article-content";
import { CommentNode } from "./comment-node";
import { XEmbed } from "../components/XEmbed";
import { RedditEmbed } from "../components/RedditEmbed";
import { YouTubeEmbed } from "../components/YouTubeEmbed";

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
  const { data: flatComments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: qk.news.comments(slug),
    queryFn: () => data<any[]>(http.get(`/news/${slug}/comments`)),
  });

  const comments = React.useMemo(() => buildCommentTree(flatComments), [flatComments]);

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
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Published:{" "}
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill={article.liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={article.liked ? { color: "var(--color-accent)" } : {}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                {article.likes} {article.likes === 1 ? "like" : "likes"}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill={article.bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={article.bookmarked ? { color: "#4a7c59" } : {}}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {article.bookmarks} {article.bookmarks === 1 ? "bookmark" : "bookmarks"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className="px-4 py-1.5 border rounded-full text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-sm"
                style={
                  article.liked
                    ? {
                        backgroundColor: "rgba(180, 95, 53, 0.12)",
                        borderColor: "var(--color-accent)",
                        color: "var(--color-accent)",
                      }
                    : {
                        backgroundColor: "var(--color-background-surface)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-primary)",
                      }
                }
              >
                <svg
                  className="w-3.5 h-3.5 transition-transform"
                  fill={article.liked ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
                  />
                </svg>
                <span>{article.liked ? "Liked" : "Like"}</span>
              </button>

              <button
                onClick={handleBookmark}
                className="px-4 py-1.5 border rounded-full text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-sm"
                style={
                  article.bookmarked
                    ? {
                        backgroundColor: "rgba(74, 124, 89, 0.12)",
                        borderColor: "#4a7c59",
                        color: "#4a7c59",
                      }
                    : {
                        backgroundColor: "var(--color-background-surface)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-primary)",
                      }
                }
              >
                <svg
                  className="w-3.5 h-3.5 transition-transform"
                  fill={article.bookmarked ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <span>{article.bookmarked ? "Bookmarked" : "Bookmark"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Article Summary */}
        <div className="bg-[var(--color-background-surface)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-accent)] p-5 rounded-r-2xl text-sm leading-relaxed text-[var(--color-text-primary)] font-serif shadow-sm">
          {article.summary}
        </div>

        {article.contentKind === "AGGREGATED_STORY" ? (
          <div className="flex flex-col gap-5">
            {article.sourceUrl && (article.sourceUrl.includes("youtube.com") || article.sourceUrl.includes("youtu.be") || article.mediaType === "VIDEO") ? (
              <YouTubeEmbed
                videoUrl={article.sourceUrl || ""}
                sourceName={article.sourceName}
                title={article.title}
                summary={article.summary}
              />
            ) : article.sourceUrl && (article.sourceUrl.includes("reddit.com") || (article.sourceName && article.sourceName.includes("Reddit"))) ? (
              <RedditEmbed
                postUrl={article.sourceUrl}
                sourceName={article.sourceName}
                title={article.title}
                summary={article.summary}
              />
            ) : (article.mediaType === "EMBED" || (article.sourceUrl && (article.sourceUrl.includes("x.com") || article.sourceUrl.includes("twitter.com")))) ? (
              <XEmbed
                tweetUrl={article.sourceUrl || ""}
                authorName={article.sourceName}
                title={article.title}
                summary={article.summary}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)]">
                <img
                  src={getArticleImage(article.id, undefined, article.imageUrl)}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  className="h-auto max-h-[520px] w-full object-cover"
                />
              </div>
            )}

            {article.keyPoints && article.keyPoints.length > 0 && (
              <section className="card p-5 flex flex-col gap-3" aria-labelledby="story-key-points">
                <h2 id="story-key-points" className="m-0 text-sm font-black text-[var(--color-text-primary)]">Key points</h2>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {article.keyPoints.map((point, index) => (
                    <li key={`${point.text}-${index}`} className="text-sm leading-relaxed text-[var(--color-text-primary)]">
                      <p className="m-0">{point.text}</p>
                      {point.evidence.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {point.evidence.map((evidence, evidenceIndex) => (
                            <a
                              key={`${evidence.originalUrl}-${evidenceIndex}`}
                              href={evidence.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)] hover:underline"
                            >
                              {evidence.sourceName}
                            </a>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="m-0 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
                    Original source
                  </p>
                  <p className="m-0 mt-1 text-sm font-bold text-[var(--color-text-primary)]">
                    {article.sourceName || "External publisher"}
                  </p>
                  <p className="m-0 mt-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                    {article.sourceCount && article.sourceCount > 1
                      ? `${article.sourceCount} independent sources`
                      : "1 source"}
                  </p>
                </div>
                {article.verificationStatus && (
                  <span className="rounded-full bg-black/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {article.verificationStatus.replaceAll("_", " ")}
                  </span>
                )}
              </div>
              <p className="m-0 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                Football Verse summarizes metadata supplied by the publisher. Open the source for full context.
              </p>
              <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
                {(article.sources?.length
                  ? article.sources
                  : article.sourceUrl
                    ? [{
                        name: article.sourceName || "Original source",
                        url: article.sourceUrl,
                        publishedAt: article.publishedAt,
                        primary: true,
                      }]
                    : []
                ).map((source, index) => (
                  <a
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3 text-xs font-bold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    <span>
                      {source.name}
                      {source.primary ? " · Primary" : ""}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <article className="article-body text-base md:text-lg text-[var(--color-text-primary)] leading-relaxed font-serif">
            <div
              dangerouslySetInnerHTML={{
                __html: preprocessArticleContent(
                  article.content,
                  getArticleImage(article.id, article.content, article.imageUrl),
                ),
              }}
            />
          </article>
        )}

        {/* Article tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-4 border-t border-[var(--color-border)] max-w-[720px] mx-auto w-full">
            {article.tags.map((t) => (
              <span key={t} className="px-2.5 py-1 bg-black/[0.04] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}

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
                  <CommentNode
                    key={c.id}
                    comment={c}
                    replyTargetId={replyTargetId}
                    replyText={replyText}
                    isSubmittingReply={commentMutation.isPending && replyTargetId === c.id}
                    onLikeComment={handleLikeComment}
                    onReplyTargetChange={setReplyTargetId}
                    onReplyTextChange={setReplyText}
                    onReplySubmit={handleReplySubmit}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
