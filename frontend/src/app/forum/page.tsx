"use client";

import Link from "next/link";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useForumCategories } from "./_api";

export default function ForumPage() {
  const categories = useForumCategories();

  return (
    <PublicShell>
      <section className="panel touchline p-6">
        <h1 className="display-face text-5xl font-black">Forum terraces</h1>
        <p className="mt-2 text-[var(--fv-muted)]">Pick a room, start a thread, keep it football.</p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {categories.isLoading ? <LoadingBlock /> : null}
        {categories.error ? <ErrorBlock message="Could not load forum rooms." /> : null}
        {categories.data?.length === 0 ? <div className="panel p-5">No forum rooms yet.</div> : null}
        {categories.data?.map((category) => (
          <Link className="panel p-5 hover:border-[var(--fv-ink)]" href={`/forum/categories/${category.slug}`} key={category.id}>
            <span className="display-face text-3xl font-black">{category.name}</span>
            <span className="mt-4 block text-sm font-bold uppercase text-[var(--fv-muted)]">Open room</span>
          </Link>
        ))}
      </section>
    </PublicShell>
  );
}
