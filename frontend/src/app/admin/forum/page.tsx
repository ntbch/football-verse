"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data, http } from "@/shared/lib/api-client";
import type { ForumCategory } from "@/shared/lib/types";

export default function AdminForumPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const categories = useQuery({ queryKey: ["forum-categories"], queryFn: () => data<ForumCategory[]>(http.get("/forum/categories")) });
  const create = useMutation({
    mutationFn: () => data<ForumCategory>(http.post("/admin/forum/categories", { name })),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
    }
  });

  return (
    <div>
      <h1 className="display-face text-4xl font-black">Forum control</h1>
      <form className="mt-5 flex max-w-xl gap-3" onSubmit={(event) => { event.preventDefault(); if (name.trim()) create.mutate(); }}>
        <input className="input text-[var(--fv-ink)]" value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" />
        <button className="btn">Add</button>
      </form>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
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
