"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useCategoryThreads, useCreateThread } from "../../_api";

export default function CategoryThreadsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const threads = useCategoryThreads(slug);
  const createThread = useCreateThread(slug);

  return (
    <PublicShell>
      <section className="grid gap-5 md:grid-cols-[1fr_360px]">
        <div>
          <div className="panel touchline p-5">
            <h1 className="display-face text-4xl font-black">{slug.replaceAll("-", " ")}</h1>
          </div>
          <div className="mt-4 grid gap-3">
            {threads.isLoading ? <LoadingBlock /> : null}
            {threads.error ? <ErrorBlock message="Could not load threads." /> : null}
            {threads.data?.content.length === 0 ? <div className="panel p-4">No threads yet.</div> : null}
            {threads.data?.content.map((thread) => (
              <Link className="panel p-4 hover:border-[var(--fv-ink)]" href={`/forum/threads/${thread.slug}`} key={thread.id}>
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase text-[var(--fv-muted)]">
                  {thread.pinned ? <span>PINNED</span> : null}
                  {thread.locked ? <span>LOCKED</span> : null}
                  <span>by {thread.author}</span>
                </div>
                <h2 className="mt-1 text-xl font-black">{thread.title}</h2>
              </Link>
            ))}
          </div>
        </div>

        <form
          className="panel h-fit p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim() && content.trim()) createThread.mutate(
              { title, content },
              { onSuccess: () => { setTitle(""); setContent(""); } }
            );
          }}
        >
          <h2 className="display-face text-3xl font-black">Start thread</h2>
          {createThread.error ? <ErrorBlock message="Could not create thread." /> : null}
          <label className="mt-4 grid gap-1 font-bold">
            Title
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="mt-3 grid gap-1 font-bold">
            Opening post
            <textarea className="input min-h-32" value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <button className="btn mt-4" disabled={createThread.isPending || !title.trim() || !content.trim()}>
            {createThread.isPending ? "Posting..." : "Post"}
          </button>
        </form>
      </section>
    </PublicShell>
  );
}
