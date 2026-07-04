"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAdminForumCategories, useCreateForumCategory } from "../_api";

export default function AdminForumPage() {
  const [name, setName] = useState("");
  const categories = useAdminForumCategories();
  const create = useCreateForumCategory();

  return (
    <div>
      <h1 className="display-face text-4xl font-black">Forum control</h1>
      <form className="mt-5 flex max-w-xl gap-3" onSubmit={(event) => { event.preventDefault(); if (name.trim()) create.mutate(name, { onSuccess: () => setName("") }); }}>
        <input className="input text-[var(--fv-ink)]" value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" />
        <button className="btn" disabled={create.isPending || !name.trim()}>{create.isPending ? "Adding..." : "Add"}</button>
      </form>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {categories.isLoading ? <LoadingBlock /> : null}
        {categories.error ? <ErrorBlock message="Could not load forum categories." /> : null}
        {create.error ? <ErrorBlock message="Could not create category." /> : null}
        {categories.data?.length === 0 ? <p>No forum categories yet.</p> : null}
        {categories.data?.map((category) => (
          <Link className="border border-white/15 p-4 hover:bg-white/10" href={`/forum/categories/${category.slug}`} key={category.id}>
            <p className="font-bold">{category.name}</p>
            <p className="text-xs uppercase opacity-70">{category.slug}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
