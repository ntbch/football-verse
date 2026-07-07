"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { NewsCategoryResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

export default function WriteNewsArticlePage() {
  const router = useRouter();
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

  // 1. Fetch categories for selector
  const { data: categories = [], isLoading } = useQuery({
    queryKey: qk.admin.newsCategories(),
    queryFn: () => data<NewsCategoryResponse[]>(http.get("/admin/news/categories")),
  });

  // Set default category
  React.useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    );
  };

  // Image upload handler
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
      // Convert relative backend path to absolute API URL if needed, or keep it relative
      setUploadedImageUrl(url);
      
      // Inject image markdown helper into the content textarea
      setContent((prev) => `${prev}\n\n![Image](${url})\n\n`);
      toast({ body: "Image uploaded successfully!", type: "info" });
    } catch (err) {
      toast({ body: "Failed to upload image.", type: "error" });
    } finally {
      setImageUploadLoading(false);
    }
  };

  // 2. Create Article Mutation
  const createArticleMutation = useMutation({
    mutationFn: (payload: any) => data<any>(http.post("/admin/news", payload)),
    onSuccess: () => {
      toast({
        body: "Article created successfully!",
        type: "info",
        autoHideDuration: 4000,
      });
      router.push("/admin/news");
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to create article."),
        type: "error",
      });
    },
  });

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !summary.trim() || !content.trim()) {
      toast({ body: "All core fields are required.", type: "error" });
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    createArticleMutation.mutate({
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim(),
      content: content.trim(),
      category: category || "General",
      tags: parsedTags,
      status,
    });
  };

  if (isLoading) {
    return <LoadingBlock label="Preparing editor workspace" />;
  }

  return (
    <div className="flex flex-col gap-4 w-full text-white">
      <div className="border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
        <h3 className="font-serif text-xl md:text-2xl font-black tracking-tight text-white m-0 font-serif font-bold text-xl text-white">
          Write Editorial News Publication
        </h3>
        <button
  type="button"
  onClick={() => router.push("/admin/news")}
  disabled={false || false}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-white hover:bg-white/5 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {false ? "Loading..." : "Back to Articles"}
</button>
      </div>

      <div className="p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium bg-[var(--color-background-surface)] border border-[var(--color-border)] w-full">
        <form onSubmit={handlePublish} className="w-full">
          <div className="flex flex-col gap-4 ">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Article Title</label>
  <input
    type="text"
    placeholder="Enter title..."
    value={title}
    onChange={(e) => handleTitleChange(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>
              <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Slug URL Path</label>
  <input
    type="text"
    placeholder="auto-generated-from-title"
    value={slug}
    onChange={(e) => setSlug(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>
            </div>

            <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Article Summary</label>
  <input
    type="text"
    placeholder="Short paragraph summary/excerpt of the story..."
    value={summary}
    onChange={(e) => setSummary(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>

            {/* Custom rich helper bar */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Image Upload Uploader</label>
              <div className="flex items-center gap-3 bg-[var(--color-background-body)] border border-[var(--color-border)] p-3 rounded">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-gray-300"
                />
                {imageUploadLoading && <span className="text-xs animate-pulse text-[var(--color-accent)]">Uploading file...</span>}
                {uploadedImageUrl && (
                  <span className="text-[10px] text-green-400 font-bold">Uploaded: {uploadedImageUrl}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Article Content Body (supports HTML/markdown)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article stories here..."
                rows={12}
                className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-sm rounded p-3 focus:outline-none focus:border-[var(--color-accent)] font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              <div className="flex flex-col gap-1 ">
                <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded p-2 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Tags (Comma separated)</label>
  <input
    type="text"
    placeholder="e.g. premier-league, transfers, tactical"
    value={tags}
    onChange={(e) => setTags(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>

              <div className="flex flex-col gap-1 ">
                <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Publish Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-white text-xs rounded p-2 focus:outline-none"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
  type="button"
  onClick={() => router.push("/admin/news")}
  disabled={false || false}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-white hover:bg-white/5 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {false ? "Loading..." : "Cancel"}
</button>
              <button
  type="button"
  disabled={false || createArticleMutation.isPending}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-black hover:opacity-90 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {createArticleMutation.isPending ? "Loading..." : createArticleMutation.isPending ? "Creating..." : "Save & Publish"}
</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
