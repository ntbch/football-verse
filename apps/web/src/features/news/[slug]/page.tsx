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
import type { SearchResponse } from "@/features/search/types";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";
import { getArticleImage, handleImageError } from "@/shared/lib/images";

import { buildCommentTree, preprocessArticleContent } from "./article-content";
import { StoryTrustPanel } from "./story-trust-panel";
import { formatDate } from "@/shared/lib/format";
import { CommentNode } from "./comment-node";
import { RelatedContent } from "./related-content";
import { YouTubeEmbed } from "../components/YouTubeEmbed";

function cleanSummaryText(text?: string): string {
  if (!text) return "";
  const cleaned = text.replace(/(?:\s+|-|\|)*(?:BBC|Sky Sports|Reuters|GNews|ESPN|Goal|The Guardian)$/i, "").trim();
  const lines = cleaned
    .split(/(?:►|\n)+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.match(/^(?:Subscribe|Watch|Follow|Click|http:\/\/|https:\/\/|MNF|FNF|SNF|Super Sunday|Saturday Social|Gary Neville)/i),
    );
  const result = lines.join("\n\n");
  return result || cleaned;
}

type NewsDetailPageProps = {
  initialArticle?: NewsArticleResponse;
  initialSlug?: string;
};

export default function NewsDetailPage({ initialArticle, initialSlug }: NewsDetailPageProps) {
  const params = useParams();
  const slug = initialSlug ?? (params.slug as string);
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
    initialData: initialArticle?.slug === slug ? initialArticle : undefined,
    initialDataUpdatedAt: 0,
  });

  // 2. Fetch Article Comments
  const { data: flatComments = [] } = useQuery({
    queryKey: qk.news.comments(slug),
    queryFn: () => data<any[]>(http.get(`/news/${slug}/comments`)),
  });

  // One bounded search supplies both related sections; do not fan out to separate News and Forum requests.
  const {
    data: relatedContent,
    isLoading: isRelatedContentLoading,
    isError: isRelatedContentError,
    refetch: refetchRelatedContent,
  } = useQuery({
    queryKey: ["news-related", article?.id, article?.title] as const,
    queryFn: () => data<SearchResponse>(http.get("/search", { params: { q: article?.title, page: 0, size: 4 } })),
    enabled: Boolean(article?.title),
    staleTime: 2 * 60_000,
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
      <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full animate-fade-in mt-4">
        {/* Article Breadcrumbs & Meta */}
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-3">
          <Link href="/news" className="hover:text-[var(--color-accent)] transition-colors">
            ← Back to Touchline News
          </Link>
          <span>{article.category || "Football Verse Editorial"}</span>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-4 text-center md:text-left md:max-w-4xl md:mx-auto w-full">
          <p className="editorial-kicker m-0">{article.category || "Football Verse Editorial"}</p>
          <h1 className="m-0 font-serif-title font-black text-3xl md:text-5xl leading-[1.08] text-[var(--color-text-primary)] tracking-tight">
            {article.title}
          </h1>
          <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-[var(--color-text-secondary)] font-semibold border-y border-[var(--color-border)] py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-[var(--color-accent)]">
                {article.sourceName || "Football Verse"}
              </span>
              <span>·</span>
              <span>
                {formatDate(article.publishedAt)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill={article.liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                {article.likes}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill={article.bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {article.bookmarks}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className="min-h-11 px-4 py-1.5 border rounded-full text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-sm"
                style={
                  article.liked
                    ? {
                        backgroundColor: "var(--color-accent-muted)",
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
                <span>{article.liked ? "Liked" : "Like"}</span>
              </button>

              <button
                onClick={handleBookmark}
                className="min-h-11 px-4 py-1.5 border rounded-full text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-sm"
                style={
                  article.bookmarked
                    ? {
                        backgroundColor: "var(--color-success-muted)",
                        borderColor: "var(--color-success)",
                        color: "var(--color-success)",
                      }
                    : {
                        backgroundColor: "var(--color-background-surface)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-text-primary)",
                      }
                }
              >
                <span>{article.bookmarked ? "Bookmarked" : "Bookmark"}</span>
              </button>
            </div>
          </div>
        </div>

        {article.contentKind === "AGGREGATED_STORY" && <StoryTrustPanel article={article} />}

        {/* Hero Media (Peek.vn Style) */}
        {article.contentKind === "AGGREGATED_STORY" ? (
          <div className="flex flex-col gap-6">
            {article.sourceUrl && (article.sourceUrl.includes("youtube.com") || article.sourceUrl.includes("youtu.be") || article.mediaType === "VIDEO") ? (
              <YouTubeEmbed
                videoUrl={article.sourceUrl || ""}
                sourceName={article.sourceName}
                title={article.title}
                summary={article.summary}
              />
            ) : (
              <div className="editorial-story overflow-hidden bg-[var(--color-background-surface)]">
                <img
                  src={getArticleImage(article.id, undefined, article.imageUrl, 1600)}
                  alt={article.title}
                  referrerPolicy="no-referrer"
                  decoding="async"
                  className="h-auto max-h-[380px] w-full object-cover"
                  onError={handleImageError}
                />
              </div>
            )}

            {/* Unified Article Summary & Key Takeaways Card */}
            <div className="editorial-panel p-6 md:p-8 flex flex-col gap-5" role="region" aria-label="Article Summary">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] shadow-xs" aria-hidden="true">
                    <svg className="w-4 h-4 fill-current text-[var(--color-text-inverse)]" viewBox="0 0 24 24">
                      <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
                    </svg>
                  </span>
                  <h2 className="font-serif-title font-black text-sm uppercase tracking-wider text-[var(--color-text-primary)] m-0 leading-none">
                    Summary
                  </h2>
                </div>
              </div>

              {/* Summary Paragraphs */}
              <div className="text-base leading-relaxed text-[var(--color-text-primary)] font-serif whitespace-pre-line flex flex-col gap-3">
                {cleanSummaryText(article.summary)}
              </div>

              {/* Key Highlights Sub-Section */}
              {article.keyPoints && article.keyPoints.length > 0 && (
                <div className="flex flex-col gap-3 pt-4 border-t border-[var(--color-border)]">
                  <h3 className="m-0 text-xs font-black uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[var(--color-accent)] fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
                    </svg>
                    <span>Key Takeaways & Highlights</span>
                  </h3>
                  <ul className="m-0 flex flex-col gap-3 pl-0 list-none">
                    {article.keyPoints.map((point, index) => (
                      <li key={`${point.text}-${index}`} className="flex items-start gap-3 text-sm leading-relaxed text-[var(--color-text-primary)] font-serif bg-[var(--color-surface-subtle)] p-3 rounded-xl border border-[var(--color-border)]">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] font-extrabold text-[10px] flex items-center justify-center mt-0.5 shadow-2xs">
                          {index + 1}
                        </span>
                        <span className="flex min-w-0 flex-col gap-2">
                          <span>{point.text}</span>
                          {point.evidence?.length ? (
                            <span className="flex flex-wrap gap-2">
                              {point.evidence.map((item, evidenceIndex) => (
                                <a key={`${item.originalUrl}-${evidenceIndex}`} href={item.originalUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-surface)] px-2 py-1 text-[10px] font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:underline">
                                  {item.relation === "CONTRADICTION" ? "Contradicts" : item.relation === "SUPPORT" ? "Supports" : "Context"}: {item.sourceName}{item.publishedAt ? ` · ${formatDate(item.publishedAt, { dateStyle: "medium", timeStyle: "short" })}` : " · Publication time unavailable"}
                                </a>
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {article.sourceUrl && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] text-xs">
                <span className="font-medium text-[var(--color-text-secondary)]">
                  Source: <strong className="text-[var(--color-text-primary)]">{article.sourceName || "External Publication"}</strong>
                </span>
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                >
                  <span>Read original publication</span>
                  <span>↗</span>
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Article Image */}
            <div className="editorial-story overflow-hidden bg-[var(--color-background-surface)]">
              <img
                src={getArticleImage(article.id, article.content, article.imageUrl, 1600)}
                alt={article.title}
                referrerPolicy="no-referrer"
                decoding="async"
                className="h-auto max-h-[520px] w-full object-cover"
                onError={handleImageError}
              />
            </div>

            {/* Article Content */}
            <article
              className="article-body prose prose-lg max-w-[720px] w-full mx-auto font-serif text-[var(--color-text-primary)] leading-relaxed flex flex-col gap-4"
              dangerouslySetInnerHTML={{
                __html: preprocessArticleContent(article.content || article.summary || ""),
              }}
            />
          </div>
        )}

        <RelatedContent
          articleId={article.id}
          error={isRelatedContentError}
          isLoading={isRelatedContentLoading}
          onRetry={() => void refetchRelatedContent()}
          results={relatedContent}
        />

        {/* Comment Section */}
        <section className="editorial-panel p-6 md:p-8 flex flex-col gap-6 mt-4">
          <h2 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)] flex items-center gap-2">
            <span>Comments</span>
            <span className="text-sm font-bold text-[var(--color-text-secondary)] tabular-nums">
              ({flatComments.length})
            </span>
          </h2>

          {/* New Comment Input */}
          <form onSubmit={handleCommentSubmit} className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={auth ? "Write a comment..." : "Please log in to join the discussion"}
              disabled={!auth || commentMutation.isPending}
              className="w-full p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none disabled:opacity-60"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!auth || !commentText.trim() || commentMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer"
              >
                {commentMutation.isPending ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--color-text-secondary)] italic">
              No comments yet. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="flex flex-col gap-4 divide-y divide-[var(--color-border)]">
              {comments.map((comment) => (
                <CommentNode
                  key={comment.id}
                  comment={comment}
                  onReplySubmit={handleReplySubmit}
                  onLikeComment={handleLikeComment}
                  replyTargetId={replyTargetId}
                  onReplyTargetChange={setReplyTargetId}
                  replyText={replyText}
                  onReplyTextChange={setReplyText}
                  isSubmittingReply={commentMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
