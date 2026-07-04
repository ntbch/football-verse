"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiErrorMessage, data, http, apiBaseUrl } from "@/shared/lib/api-client";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { NewsArticle, NewsCategory } from "@/app/news/_types";

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
  const [error, setError] = useState<string | null>(null);
  const categories = useQuery({ queryKey: ["news-categories"], queryFn: () => data<NewsCategory[]>(http.get("/admin/news/categories")) });
  const { register, handleSubmit, formState } = useForm<ArticleForm>({ defaultValues: { status: "PUBLISHED" } });

  const submit = async (values: ArticleForm) => {
    setError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setError("Title and content are required.");
      return;
    }
    try {
      const article = await data<NewsArticle>(http.post("/admin/news", {
        ...parsed.data,
        categoryId: parsed.data.categoryId || null,
        tags: parsed.data.tags ? parsed.data.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : []
      }));
      router.push(`/news/${article.slug}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create article."));
    }
  };

  return (
    <div>
      <h1 className="display-face text-4xl font-black">New article</h1>
      <form className="mt-5 grid max-w-3xl gap-4" onSubmit={handleSubmit(submit)}>
        {categories.isLoading ? <LoadingBlock label="Loading categories" /> : null}
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
        <div className="grid gap-1 font-bold">
          <span className="flex items-center justify-between">
            Content
            <label className="cursor-pointer text-xs font-bold uppercase text-[var(--fv-clay, #d97706)] hover:underline">
              Upload image & insert
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const res = await data<{ url: string }>(
                      http.post("/uploads", formData, {
                        headers: { "Content-Type": "multipart/form-data" }
                      })
                    );
                    const image = `\n<img src="${apiBaseUrl}${res.url}" alt="image" />\n`;
                    const textEl = document.getElementById("content-editor") as HTMLTextAreaElement;
                    if (textEl) {
                      const start = textEl.selectionStart;
                      const end = textEl.selectionEnd;
                      const text = textEl.value;
                      const newVal = text.substring(0, start) + image + text.substring(end);
                      textEl.value = newVal;
                      textEl.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                  } catch (err) {
                    alert("Failed to upload image.");
                  }
                }}
              />
            </label>
          </span>
          <textarea id="content-editor" className="input min-h-56 text-[var(--fv-ink)]" {...register("content")} />
        </div>
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
        <button className="btn w-fit bg-[var(--fv-grass)] text-[var(--fv-ink)]" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving..." : "Publish"}
        </button>
      </form>
    </div>
  );
}
