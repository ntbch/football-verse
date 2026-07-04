"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import {
  useNewsArticle,
  useNewsComments,
  useLikeNews,
  useBookmarkNews,
  useCreateNewsComment
} from "../_api";

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState("");

  const article = useNewsArticle(slug);
  const comments = useNewsComments(slug);

  const like = useLikeNews(slug);
  const bookmark = useBookmarkNews(slug);
  const comment = useCreateNewsComment(slug);

  return (
    <PublicShell>
      {article.isLoading ? <LoadingBlock /> : null}
      {article.error ? <ErrorBlock message="Article not found." /> : null}
      {article.data ? (
        <article className="panel touchline mx-auto max-w-6xl p-5 md:p-8 lg:p-10">
          <header className="border-b border-[var(--fv-line)] pb-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--fv-clay)]">{article.data.category ?? "News"}</p>
            <h1 className="display-face mt-3 max-w-5xl text-4xl font-black leading-[0.96] tracking-tight md:text-5xl lg:text-6xl">
              {article.data.title}
            </h1>
            {article.data.summary ? (
              <p className="mt-5 max-w-4xl border-l-4 border-[var(--fv-clay)] pl-4 text-xl leading-8 text-[var(--fv-muted)]">
                {article.data.summary}
              </p>
            ) : null}
          </header>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold uppercase">
            {article.data.tags.map((tag) => (
              <span className="border border-[var(--fv-line)] px-2 py-1" key={tag}>{tag}</span>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-secondary" disabled={like.isPending} onClick={() => { if (article.data?.id) like.mutate(article.data.id); }}>Like {article.data.likes}</button>
            <button className="btn btn-secondary" disabled={bookmark.isPending} onClick={() => { if (article.data?.id) bookmark.mutate(article.data.id); }}>Bookmark {article.data.bookmarks}</button>
          </div>
          <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: article.data.content }} />
        </article>
      ) : null}

      <section className="panel mx-auto mt-5 max-w-6xl p-5">
        <h2 className="display-face text-3xl font-black">Comments</h2>
        {comments.isLoading ? <LoadingBlock label="Loading comments" /> : null}
        {comments.error ? <ErrorBlock message="Could not load comments." /> : null}
        {comment.error ? <ErrorBlock message="Could not post comment." /> : null}
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (content.trim() && article.data?.id) comment.mutate(
              { articleId: article.data.id, content },
              { onSuccess: () => setContent("") }
            );
          }}
        >
          <textarea className="input min-h-28" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Add a comment" />
          <button className="btn w-fit" disabled={comment.isPending || !content.trim() || !article.data?.id}>
            {comment.isPending ? "Posting..." : "Post comment"}
          </button>
        </form>
        <div className="mt-5 grid gap-3">
          {comments.data?.length === 0 ? <p>No comments yet.</p> : null}
          {comments.data?.map((item) => (
            <div className="border-t border-[var(--fv-line)] pt-3" key={item.id}>
              <p className="font-bold">{item.author}</p>
              <p className="mt-1">{item.content}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
