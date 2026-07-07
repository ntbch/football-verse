"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import type { NewsCategoryResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

export default function WriteNewsArticlePage() {
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
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
      setUploadedImageUrl(url);

      // Smart insert at cursor position
      const textarea = textareaRef.current;
      const imageMarkdown = `\n\n![Image](${url})\n\n`;
      
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        
        setContent(before + imageMarkdown + after);
        
        // Restore focus and move cursor right after the inserted markdown
        setTimeout(() => {
          textarea.focus();
          const newPos = start + imageMarkdown.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 50);
      } else {
        setContent((prev) => `${prev}${imageMarkdown}`);
      }

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
    <div className="flex flex-col gap-4 w-full" style={{ color: "var(--color-text-primary)" }}>
      <div className="border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
        <h3 className="font-serif-title text-xl md:text-2xl font-black tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
          Write Editorial News Publication
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
        <form onSubmit={handlePublish} className="w-full">
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

             {/* Custom rich helper bar */}
            <div className="flex flex-col gap-1 w-full">
              <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)] text-left">
                Image Uploader
              </label>
              <div className="flex flex-col gap-1.5 bg-[var(--color-background-body)] border border-[var(--color-border)] p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-[var(--color-text-primary)]"
                  />
                  {imageUploadLoading && (
                    <span className="text-xs animate-pulse text-[var(--color-accent)]">Uploading file...</span>
                  )}
                  {uploadedImageUrl && (
                    <span className="text-[10px] text-green-400 font-bold">Uploaded: {uploadedImageUrl}</span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: "var(--color-text-secondary)", opacity: 0.85 }}>
                  💡 Tip: The image will be inserted automatically at your current cursor position in the editor body below.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full text-left">
              <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">
                Article Content Body (supports HTML/markdown)
              </label>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article stories here..."
                rows={12}
                className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm rounded-xl p-3 focus:outline-none focus:border-[var(--color-accent)] font-mono"
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
                  className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-2.5 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name} style={{ backgroundColor: "var(--color-background-body)", color: "var(--color-text-primary)" }}>
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
                  className="w-full bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-2.5 focus:outline-none"
                >
                  <option value="DRAFT" style={{ backgroundColor: "var(--color-background-body)", color: "var(--color-text-primary)" }}>DRAFT</option>
                  <option value="PUBLISHED" style={{ backgroundColor: "var(--color-background-body)", color: "var(--color-text-primary)" }}>PUBLISHED</option>
                  <option value="ARCHIVED" style={{ backgroundColor: "var(--color-background-body)", color: "var(--color-text-primary)" }}>ARCHIVED</option>
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
                disabled={createArticleMutation.isPending}
                className="btn btn-primary !px-5 !py-2 !text-xs"
              >
                {createArticleMutation.isPending ? "Creating..." : "Save & Publish"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
