"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data, http } from "@/shared/lib/api-client";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { ForumPost, ThreadDetail } from "@/shared/lib/types";

export default function ThreadPage() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");

  const thread = useQuery({
    queryKey: ["thread", slug],
    queryFn: () => data<ThreadDetail>(http.get(`/forum/threads/${slug}`))
  });

  const reply = useMutation({
    mutationFn: () => data<ForumPost>(http.post(`/forum/threads/${thread.data?.thread.id}/replies`, { content })),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["thread", slug] });
    }
  });

  const report = useMutation({
    mutationFn: () => data(http.post("/forum/reports", { targetType: "THREAD", targetId: thread.data?.thread.id, reason })),
    onSuccess: () => setReason("")
  });

  return (
    <PublicShell>
      {thread.isLoading ? <LoadingBlock /> : null}
      {thread.error ? <ErrorBlock message="Thread not found." /> : null}
      {thread.data ? (
        <section className="grid gap-5 md:grid-cols-[1fr_320px]">
          <div>
            <div className="panel touchline p-5">
              <p className="font-bold uppercase text-[var(--fv-muted)]">{thread.data.thread.category}</p>
              <h1 className="display-face text-4xl font-black">{thread.data.thread.title}</h1>
            </div>
            <div className="mt-4 grid gap-3">
              {thread.data.posts.map((post) => (
                <article className="panel p-4" key={post.id}>
                  <p className="font-bold">{post.author}</p>
                  <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
                </article>
              ))}
            </div>
            <form
              className="panel mt-4 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (content.trim()) reply.mutate();
              }}
            >
              <h2 className="font-black">Reply</h2>
              <textarea className="input mt-3 min-h-28" value={content} onChange={(event) => setContent(event.target.value)} disabled={thread.data.thread.locked} />
              <button className="btn mt-3" disabled={reply.isPending || thread.data.thread.locked}>
                {thread.data.thread.locked ? "Thread locked" : "Reply"}
              </button>
            </form>
          </div>
          <aside className="panel h-fit p-4">
            <h2 className="display-face text-2xl font-black">Report thread</h2>
            <textarea className="input mt-3 min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} />
            <button className="btn btn-secondary mt-3" onClick={() => reason.trim() && report.mutate()}>
              Report
            </button>
          </aside>
        </section>
      ) : null}
    </PublicShell>
  );
}
