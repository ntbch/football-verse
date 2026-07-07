"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import type { NewsCategoryResponse, NewsArticleResponse } from "@/shared/lib/types";
import { LoadingBlock, ErrorBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

export default function EditNewsArticlePage() {
  const router = useRouter();
  const params = useParams();
  const idStr = params.id as string;
  const id = parseInt(idStr);
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // 1. Fetch Categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: qk.admin.newsCategories(),
    queryFn: () => data<NewsCategoryResponse[]>(http.get("/admin/news/categories")),
  });

  // 2. Fetch Article Details for Edit
  const { data: article, isLoading: isArticleLoading, error: articleError } = useQuery({
    queryKey: qk.admin.article(id),
    queryFn: () => data<NewsArticleResponse>(http.get(`/admin/news/${id}`)),
    enabled: !isNaN(id),
  });

  // Populate form states once article detail is loaded
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setSlug(article.slug);
      setSummary(article.summary);
      setContent(article.content);
      setCategory(article.category || "");
      setTags(article.tags ? Array.from(article.tags).join(", ") : "");
      setStatus(article.status);
    }
  }, [article]);

  // Handle title to slug generation
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    );
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await http.post("/uploads", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.data.url;
      setUploadedImageUrl(url);
      setContent((prev) => `${prev}\n\n![Image](${url})\n\n`);
      toast({ body: "Image uploaded successfully!", type: "info" });
    } catch (err) {
      toast({ body: "Failed to upload image.", type: "error" });
    } finally {
      setImageUploadLoading(false);
    }
  };

  // 3. Update Article Mutation
  const updateArticleMutation = useMutation({
    mutationFn: (payload: any) => data<any>(http.put(`/admin/news/${id}`, payload)),
    onSuccess: () => {
      toast({
        body: "Article details saved successfully!",
        type: "info",
        autoHideDuration: 4000,
      });
      router.push("/admin/news");
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to update article details."),
        type: "error",
      });
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !summary.trim() || !content.trim()) {
      toast({ body: "All core fields are required.", type: "error" });
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    updateArticleMutation.mutate({
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim(),
      content: content.trim(),
      category: category || "General",
      tags: parsedTags,
      status,
    });
  };

  if (isArticleLoading || isCategoriesLoading) {
    return <LoadingBlock label="Fetching article editor worksheet" />;
  }

  if (articleError || !article) {
    return <ErrorBlock message="Article details failed to fetch or article ID is invalid." />;
  }

  return (
    <div className="flex flex-col gap-4 w-full text-white">
      <div className="border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
        <h3 className="font-serif-title text-xl md:text-2xl font-black tracking-tight text-white m-0">
          Modify Editorial Publication
        </h3>
        <button
          type="button"
          onClick={() => router.push("/admin/news")}
          className="btn btn-secondary !px-4 !py-2 !text-xs"
        >
          Back to Articles
        </button>
      </div>

      <div className="card p-5 w-full">
        <form onSubmit={handleUpdate} className="w-full">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                  Article Title
                </label>
                <input
                  type="text"
                  placeholder="Enter title..."
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                  Slug URL Path
                </label>
                <input
                  type="text"
                  placeholder="auto-generated-from-title"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full text-left">
              <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                Article Summary
              </label>
              <input
                type="text"
                placeholder="Short paragraph summary/excerpt of the story..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="input"
              />
            </div>

            {/* Custom file upload */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)] text-left">
                Image Uploader
              </label>
              <div className="flex items-center gap-3 bg-[var(--color-background-body)] border border-[var(--color-border)] p-3 rounded-xl">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-gray-300"
                />
                {imageUploadLoading && (
                  <span className="text-xs animate-pulse text-[var(--color-accent)]">Uploading file...</span>
                )}
                {uploadedImageUrl && (
                  <span className="text-[10px] text-green-400 font-bold">Uploaded: {uploadedImageUrl}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full text-left">
              <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">
                Article Content Body (supports HTML/markdown)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article stories here..."
                rows={12}
                className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-sm rounded-xl p-3 focus:outline-none focus:border-[var(--color-accent)] font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded-xl p-2.5 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. premier-league, transfers, tactical"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">
                  Publish Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded-xl p-2.5 focus:outline-none"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border)] justify-end">
              <button
                type="button"
                onClick={() => router.push("/admin/news")}
                className="btn btn-secondary !px-4 !py-2 !text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateArticleMutation.isPending}
                className="btn btn-primary !px-5 !py-2 !text-xs"
              >
                {updateArticleMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
