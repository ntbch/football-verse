"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { PageResponse } from "@/shared/lib/types";
import type { ForumCategory, ForumPost, ForumThread, ThreadDetail } from "./_types";
import { qk } from "@/shared/lib/query-keys";

export const useForumCategories = () =>
  useQuery({
    queryKey: qk.forum.categories(),
    queryFn: () => data<ForumCategory[]>(http.get("/forum/categories"))
  });

export const useCategoryThreads = (categorySlug: string) =>
  useQuery({
    queryKey: qk.forum.threads(categorySlug),
    queryFn: () => data<PageResponse<ForumThread>>(http.get(`/forum/categories/${categorySlug}/threads?size=20`))
  });

export const useThreadDetail = (slug: string) =>
  useQuery({
    queryKey: qk.forum.thread(slug),
    queryFn: () => data<ThreadDetail>(http.get(`/forum/threads/${slug}`))
  });

export const useCreateThread = (categorySlug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      data<ForumThread>(http.post(`/forum/categories/${categorySlug}/threads`, { title, content })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.forum.threads(categorySlug) })
  });
};

export const useReply = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { threadId: number; content: string }) =>
      data<ForumPost>(http.post(`/forum/threads/${args.threadId}/replies`, { content: args.content })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.forum.thread(slug) })
  });
};

export const useReportThread = () =>
  useMutation({
    mutationFn: (args: { targetId: number; reason: string }) =>
      data(http.post("/forum/reports", { targetType: "THREAD", targetId: args.targetId, reason: args.reason }))
  });