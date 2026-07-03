"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { data, http } from "@/shared/lib/api-client";
import type { NewsArticle, NewsCategory } from "@/shared/lib/types";

const schema = z.object({
  title: z.string().min(3),
  summary: z.string().optional(),
  content: z.string().min(3),
  categoryId: z.coerce.number().optional(),
  tags: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"])
});

type ArticleForm = z.infer<typeof schema>;

export default function AdminNewArticlePage() {
  const router = useRouter();
  const categories = useQuery({ queryKey: ["news-categories"], queryFn: () => data<NewsCategory[]>(http.get("/admin/news/categories")) });
  const { register, handleSubmit, formState } = useForm<ArticleForm>({ defaultValues: { status: "PUBLISHED" } });

  const submit = async (values: ArticleForm) => {
    const parsed = schema.parse(values);
    const article = await data<NewsArticle>(http.post("/admin/news", {
      ...parsed,
      categoryId: parsed.categoryId || null,
      tags: parsed.tags ? parsed.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : []
    }));
    router.push(`/news/${article.slug}`);
  };

  return (
    <div>
      <h1 className="display-face text-4xl font-black">New article</h1>
      <form className="mt-5 grid max-w-3xl gap-4" onSubmit={handleSubmit(submit)}>
        <label className="grid gap-1 font-bold">
          Title
          <input className="input text-[var(--fv-ink)]" {...register("title")} />
        </label>
        <label className="grid gap-1 font-bold">
          Summary
          <textarea className="input min-h-20 text-[var(--fv-ink)]" {...register("summary")} />
        </label>
        <label className="grid gap-1 font-bold">
          Content
          <textarea className="input min-h-56 text-[var(--fv-ink)]" {...register("content")} />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 font-bold">
            Category
            <select className="input text-[var(--fv-ink)]" {...register("categoryId")}>
              <option value="">None</option>
              {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 font-bold">
            Tags
            <input className="input text-[var(--fv-ink)]" placeholder="transfers, tactics" {...register("tags")} />
          </label>
          <label className="grid gap-1 font-bold">
            Status
            <select className="input text-[var(--fv-ink)]" {...register("status")}>
              <option>DRAFT</option>
              <option>PUBLISHED</option>
            </select>
          </label>
        </div>
        <button className="btn w-fit bg-[var(--fv-grass)] text-[var(--fv-ink)]" disabled={formState.isSubmitting}>Publish</button>
      </form>
    </div>
  );
}
