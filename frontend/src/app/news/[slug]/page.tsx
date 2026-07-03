"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data, http } from "@/shared/lib/api-client";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { Comment, NewsArticle } from "@/shared/lib/types";

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const article = useQuery({
    queryKey: ["news", slug],
    queryFn: () => data<NewsArticle>(http.get(`/news/${slug}`))
  });
  const comments = useQuery({
    queryKey: ["news-comments", slug],
    queryFn: () => data<Comment[]>(http.get(`/news/${slug}/comments`))
  });

  const like = useMutation({
    mutationFn: () => data<{ liked: boolean }>(http.post(`/news/${article.data?.id}/like`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news", slug] })
  });
  const bookmark = useMutation({
    mutationFn: () => data<{ bookmarked: boolean }>(http.post(`/news/${article.data?.id}/bookmark`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news", slug] })
  });
  const comment = useMutation({
    mutationFn: () => data<Comment>(http.post(`/news/${article.data?.id}/comments`, { content })),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["news-comments", slug] });
    }
  });

  return (
    <PublicShell>
      {article.isLoading ? <LoadingBlock /> : null}
      {article.error ? <ErrorBlock message="Article not found." /> : null}
      {article.data ? (
        <article className="panel touchline p-6 md:p-8">
          <p className="font-bold uppercase text-[var(--fv-clay)]">{article.data.category ?? "News"}</p>
          <h1 className="display-face mt-2 text-5xl font-black leading-none">{article.data.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-[var(--fv-muted)]">{article.data.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold uppercase">
            {article.data.tags.map((tag) => (
              <span className="border border-[var(--fv-line)] px-2 py-1" key={tag}>{tag}</span>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-secondary" onClick={() => like.mutate()}>Like {article.data.likes}</button>
            <button className="btn btn-secondary" onClick={() => bookmark.mutate()}>Bookmark {article.data.bookmarks}</button>
          </div>
          <div className="mt-8 max-w-none whitespace-pre-wrap text-lg leading-8" dangerouslySetInnerHTML={{ __html: article.data.content }} />
        </article>
      ) : null}

      <section className="panel mt-5 p-5">
        <h2 className="display-face text-3xl font-black">Comments</h2>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (content.trim()) comment.mutate();
          }}
        >
          <textarea className="input min-h-28" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Add a comment" />
          <button className="btn w-fit" disabled={comment.isPending}>Post comment</button>
        </form>
        <div className="mt-5 grid gap-3">
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
