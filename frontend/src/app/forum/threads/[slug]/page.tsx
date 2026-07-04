"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useThreadDetail, useReply, useReportThread } from "../../_api";

export default function ThreadPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");

  const thread = useThreadDetail(slug);
  const reply = useReply(slug);
  const report = useReportThread();

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
              {thread.data.posts.length === 0 ? <div className="panel p-4">No posts yet.</div> : null}
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
                if (content.trim() && thread.data?.thread.id) reply.mutate(
                  { threadId: thread.data.thread.id, content },
                  { onSuccess: () => setContent("") }
                );
              }}
            >
              <h2 className="font-black">Reply</h2>
              {reply.error ? <ErrorBlock message="Could not post reply." /> : null}
              <textarea className="input mt-3 min-h-28" value={content} onChange={(event) => setContent(event.target.value)} disabled={thread.data.thread.locked} />
              <button className="btn mt-3" disabled={reply.isPending || thread.data.thread.locked || !content.trim()}>
                {reply.isPending ? "Posting..." : thread.data.thread.locked ? "Thread locked" : "Reply"}
              </button>
            </form>
          </div>
          <aside className="panel h-fit p-4">
            <h2 className="display-face text-2xl font-black">Report thread</h2>
            {report.error ? <ErrorBlock message="Could not send report." /> : null}
            <textarea className="input mt-3 min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} />
            <button className="btn btn-secondary mt-3" onClick={() => {
              const tid = thread.data?.thread.id;
              if (reason.trim() && tid) report.mutate(
                { targetId: tid, reason },
                { onSuccess: () => setReason("") }
              );
            }} disabled={report.isPending || !reason.trim()}>
              {report.isPending ? "Reporting..." : "Report"}
            </button>
          </aside>
        </section>
      ) : null}
    </PublicShell>
  );
}
