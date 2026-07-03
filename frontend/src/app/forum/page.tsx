"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import { PublicShell } from "@/shared/components/public-shell";
import { LoadingBlock } from "@/shared/components/state-blocks";
import type { ForumCategory } from "@/shared/lib/types";

export default function ForumPage() {
  const categories = useQuery({
    queryKey: ["forum-categories"],
    queryFn: () => data<ForumCategory[]>(http.get("/forum/categories"))
  });

  return (
    <PublicShell>
      <section className="panel touchline p-6">
        <h1 className="display-face text-5xl font-black">Forum terraces</h1>
        <p className="mt-2 text-[var(--fv-muted)]">Pick a room, start a thread, keep it football.</p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {categories.isLoading ? <LoadingBlock /> : null}
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
