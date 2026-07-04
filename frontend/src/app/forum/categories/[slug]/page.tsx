"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useCategoryThreads, useCreateThread } from "../../_api";

export default function CategoryThreadsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("latest");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const threads = useCategoryThreads(slug, page, sort);
  const createThread = useCreateThread(slug);
  const totalPages = threads.data?.totalPages ?? 0;
  const totalThreads = threads.data?.totalElements ?? 0;

  return (
    <PublicShell>
      <section className="grid gap-5 md:grid-cols-[1fr_360px]">
        <div>
          <div className="panel touchline p-5">
            <h1 className="display-face text-4xl font-black">{slug.replaceAll("-", " ")}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {["latest", "top", "hot"].map((value) => (
                <button
                  className={sort === value ? "btn" : "btn btn-secondary"}
                  key={value}
                  onClick={() => { setSort(value); setPage(0); }}
                >
                  {value}
                </button>
              ))}
            </div>
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
                  {thread.solved ? <span>SOLVED</span> : <span>OPEN</span>}
                  <span>{thread.replyCount} replies</span>
                  <span>by {thread.author}</span>
                </div>
                <h2 className="mt-1 text-xl font-black">{thread.title}</h2>
                <p suppressHydrationWarning className="mt-2 text-xs font-bold uppercase text-[var(--fv-muted)]">
                  Last activity {new Date(thread.lastActivityAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </Link>
            ))}
            {totalPages > 1 ? (
              <nav className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-sm font-bold uppercase text-[var(--fv-muted)]">
                  Page {page + 1}/{totalPages} - {totalThreads} threads
                </p>
                <div className="flex gap-2">
                  <button className="btn btn-secondary" disabled={page === 0 || threads.isFetching} onClick={() => setPage((value) => Math.max(0, value - 1))}>
                    Prev
                  </button>
                  <button className="btn btn-secondary" disabled={page + 1 >= totalPages || threads.isFetching} onClick={() => setPage((value) => value + 1)}>
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
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
