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

export const useCategoryThreads = (categorySlug: string, page = 0, sort = "latest") =>
  useQuery({
    queryKey: [...qk.forum.threads(categorySlug), page, sort],
    queryFn: () => data<PageResponse<ForumThread>>(http.get(`/forum/categories/${categorySlug}/threads?page=${page}&size=20&sort=${sort}`))
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

export const useLikeForumPost = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: number) => data<{ liked: boolean }>(http.post(`/forum/posts/${postId}/like`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.forum.thread(slug) })
  });
};

export const useFollowThread = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: number) => data<{ followed: boolean }>(http.post(`/forum/threads/${threadId}/follow`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      qc.invalidateQueries({ queryKey: qk.user.followingThreads() });
    }
  });
};

export const useMarkBestAnswer = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, postId }: { threadId: number; postId: number }) =>
      data<ForumThread>(http.post(`/forum/threads/${threadId}/best-answer`, { postId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.forum.thread(slug) })
  });
};

export const useClearBestAnswer = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: number) => data<ForumThread>(http.delete(`/forum/threads/${threadId}/best-answer`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.forum.thread(slug) })
  });
};

export const useReportForumTarget = () =>
  useMutation({
    mutationFn: (args: { targetType: "THREAD" | "POST"; targetId: number; reason: string }) =>
      data(http.post("/forum/reports", args))
  });

export const useReportThread = () =>
  useMutation({
    mutationFn: (args: { targetId: number; reason: string }) =>
      data(http.post("/forum/reports", { targetType: "THREAD", targetId: args.targetId, reason: args.reason }))
  });

export const useModerateThread = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, value }: { id: number; action: "pin" | "lock" | "hide"; value: boolean }) =>
      data<ForumThread>(http.patch(`/moderator/forum/threads/${id}/${action}?value=${value}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.forum.thread(slug) })
  });
};

export const useHideForumPost = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hidden }: { id: number; hidden: boolean }) =>
      data<ForumPost>(http.patch(`/moderator/forum/posts/${id}/hide?value=${hidden}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.forum.thread(slug) })
  });
};
