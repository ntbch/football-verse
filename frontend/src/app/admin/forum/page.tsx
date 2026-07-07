"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import type { ForumCategoryResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

export default function AdminForumPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // 1. Fetch Categories (using the public endpoint which works everywhere)
  const { data: categories = [], isLoading } = useQuery({
    queryKey: qk.forum.categories(),
    queryFn: () => data<ForumCategoryResponse[]>(http.get("/forum/categories")),
  });

  // 2. Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: (payload: { name: string; slug: string; description: string }) =>
      data<ForumCategoryResponse>(http.post("/admin/forum/categories", payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.forum.categories() });
      toast({ body: "Forum category created successfully!", type: "info" });
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setShowAddForm(false);
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to create category."), type: "error" });
    },
  });

  const handleNameChange = (val: string) => {
    setNewName(val);
    setNewSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    );
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim() || !newDescription.trim()) {
      toast({ body: "All fields are required.", type: "error" });
      return;
    }
    createCategoryMutation.mutate({
      name: newName.trim(),
      slug: newSlug.trim(),
      description: newDescription.trim(),
    });
  };

  if (isLoading) {
    return <LoadingBlock label="Fetching forum categories" />;
  }

  return (
    <div className="flex flex-col gap-4 w-full text-white">
      <div className="flex items-center justify-between w-full border-b border-[var(--color-border)] pb-2 flex-wrap gap-2">
        <h3 className="font-serif-title text-xl md:text-2xl font-black tracking-tight text-white m-0">
          Forum Categories
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary !rounded-full !px-4 !py-2 !text-xs"
        >
          Create Forum Category
        </button>
      </div>

      {/* Add Form Card */}
      {showAddForm && (
        <div className="card p-5 w-full">
          <form onSubmit={handleCreateCategory} className="w-full">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase text-[var(--color-accent)] text-left">
                Create category
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="flex flex-col gap-1 w-full text-left">
                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Champions League"
                    value={newName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="flex flex-col gap-1 w-full text-left">
                  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                    Category Slug
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. champions-league"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 w-full text-left">
                <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Description of category threads..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-secondary !px-4 !py-2 !text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="btn btn-primary !px-4 !py-2 !text-xs"
                >
                  {createCategoryMutation.isPending ? "Creating..." : "Save category"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* List of categories */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-secondary)] font-bold">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Threads count</th>
                <th className="py-3 px-4 text-right">Posts count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-[var(--color-background-body)] text-white">
                  <td className="py-3 px-4 font-bold">{cat.name}</td>
                  <td className="py-3 px-4 font-mono text-gray-300">{cat.slug}</td>
                  <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{cat.description}</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-300">{cat.threadCount}</td>
                  <td className="py-3 px-4 font-mono text-right text-gray-300">{cat.postCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
