"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { NewsArticle, NewsCategory } from "@/app/news/_types";

const schema = z.object({
  title: z.string().min(3),
  summary: z.string().optional(),
  content: z.string().min(3),
  categoryId: z.coerce.number().optional(),
  tags: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
});

type ArticleForm = z.infer<typeof schema>;

export default function AdminEditArticlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const articleId = Number(params.id);
  const [error, setError] = useState<string | null>(null);
  const article = useQuery({
    queryKey: ["admin-article", articleId],
    queryFn: () => data<NewsArticle>(http.get(`/admin/news/${articleId}`)),
    enabled: Number.isFinite(articleId)
  });
  const categories = useQuery({ queryKey: ["news-categories"], queryFn: () => data<NewsCategory[]>(http.get("/admin/news/categories")) });
  const { register, handleSubmit, reset, formState } = useForm<ArticleForm>();

  useEffect(() => {
    if (!article.data) {
      return;
    }
    const category = categories.data?.find((item) => item.name === article.data.category);
    reset({
      title: article.data.title,
      summary: article.data.summary ?? "",
      content: article.data.content,
      categoryId: category?.id,
      tags: article.data.tags.join(", "),
      status: article.data.status === "DELETED" ? "DRAFT" : article.data.status
    });
  }, [article.data, categories.data, reset]);

  const submit = async (values: ArticleForm) => {
    setError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setError("Title and content are required.");
      return;
    }
    try {
      await data<NewsArticle>(http.put(`/admin/news/${articleId}`, {
        ...parsed.data,
        categoryId: parsed.data.categoryId || null,
        tags: parsed.data.tags ? parsed.data.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : []
      }));
      router.push("/admin/news");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save article."));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-face text-4xl font-black">Edit article</h1>
        {article.data?.status === "PUBLISHED" ? <a className="btn" href={`/news/${article.data.slug}`}>View</a> : null}
      </div>
      <form className="mt-5 grid max-w-3xl gap-4" onSubmit={handleSubmit(submit)}>
        {article.isLoading ? <LoadingBlock label="Loading article" /> : null}
        {article.error ? <ErrorBlock message="Article not found." /> : null}
        {categories.error ? <ErrorBlock message="Could not load categories." /> : null}
        {error ? <ErrorBlock message={error} /> : null}
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
              <option>ARCHIVED</option>
            </select>
          </label>
        </div>
        <button className="btn w-fit bg-[var(--fv-grass)] text-[var(--fv-ink)]" disabled={formState.isSubmitting || article.isLoading}>
          {formState.isSubmitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
