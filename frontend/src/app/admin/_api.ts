"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { PageResponse, UserStatus } from "@/shared/lib/types";
import type { AdminUser, ForumReport, NewsSource } from "./_types";
import type { NewsArticle, NewsCategory } from "@/app/news/_types";
import type { ForumCategory } from "@/app/forum/_types";
import { qk } from "@/shared/lib/query-keys";

// --- users ---
export const useAdminUsers = () =>
  useQuery({ queryKey: qk.admin.users(), queryFn: () => data<AdminUser[]>(http.get("/admin/users")) });

export const useUpdateUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: UserStatus }) =>
      data<AdminUser>(http.patch(`/admin/users/${id}/status`, { status })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.users() })
  });
};

// --- news admin ---
export const useAdminNews = (size = 50) =>
  useQuery({ queryKey: qk.admin.news(), queryFn: () => data<PageResponse<NewsArticle>>(http.get(`/admin/news?size=${size}`)) });

export const useAdminArticle = (id: number) =>
  useQuery({
    queryKey: qk.admin.article(id),
    queryFn: () => data<NewsArticle>(http.get(`/admin/news/${id}`)),
    enabled: Number.isFinite(id)
  });

export const useAdminNewsCategories = () =>
  useQuery({ queryKey: qk.admin.newsCategories(), queryFn: () => data<NewsCategory[]>(http.get("/admin/news/categories")) });

export const useAdminNewsSources = () =>
  useQuery({ queryKey: qk.admin.newsSources(), queryFn: () => data<NewsSource[]>(http.get("/admin/news/sources")) });

export const useCreateNewsCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => data<NewsCategory>(http.post("/admin/news/categories", { name })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.newsCategories() })
  });
};

export const useCreateNewsSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, feedUrl }: { name: string; feedUrl: string }) =>
      data<NewsSource>(http.post("/admin/news/sources", { name, feedUrl })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.newsSources() })
  });
};

export const useToggleNewsSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => data<NewsSource>(http.patch(`/admin/news/sources/${id}/toggle`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.newsSources() })
  });
};

export const useDeleteNewsSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => data<{ deleted: boolean }>(http.delete(`/admin/news/sources/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.newsSources() })
  });
};

export const useCrawlNow = () => {
  const qc = useQueryClient();
  return useMutation({
    // ponytail: alert side-effect + dual-key invalidation preserved from pre-refactor. Split if crawl gets its own page.
    mutationFn: () => data<{ saved: number; repaired: number; skipped: number; failed: number }>(http.post("/admin/news/crawl")),
    onSuccess: (res) => {
      alert(`Crawl done. Saved ${res.saved}, repaired ${res.repaired}, skipped ${res.skipped}, failed ${res.failed}.`);
      qc.invalidateQueries({ queryKey: qk.admin.news() });
    },
    onError: (err: any) => {
      alert("Crawl failed: " + (err.response?.data?.message || err.message));
    }
  });
};

export const useUpdateNewsStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: NewsArticle["status"] }) =>
      data<NewsArticle>(http.patch(`/admin/news/${id}/status`, { status })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.news() })
  });
};

export const useDeleteNewsArticle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => data<{ deleted: boolean }>(http.delete(`/admin/news/${id}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.news() })
  });
};

export const useCreateNewsArticle = () =>
  useMutation({
    mutationFn: (payload: Record<string, unknown>) => data<NewsArticle>(http.post("/admin/news", payload))
  });

export const useUpdateNewsArticle = (id: number) =>
  useMutation({
    mutationFn: (payload: Record<string, unknown>) => data<NewsArticle>(http.put(`/admin/news/${id}`, payload))
  });

// --- forum admin ---
export const useAdminForumCategories = () =>
  useQuery({ queryKey: qk.admin.forumCategories(), queryFn: () => data<ForumCategory[]>(http.get("/forum/categories")) });

export const useCreateForumCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => data<ForumCategory>(http.post("/admin/forum/categories", { name })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.forumCategories() })
  });
};

// --- reports ---
export const useAdminReports = () =>
  useQuery({ queryKey: qk.admin.reports(), queryFn: () => data<ForumReport[]>(http.get("/admin/forum/reports")) });

export const useResolveReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => data<ForumReport>(http.patch(`/admin/forum/reports/${id}/resolve`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.reports() })
  });
};

export const useHideForumTarget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, hidden }: { type: ForumReport["targetType"]; id: number; hidden: boolean }) =>
      data(http.patch(`/admin/forum/${type === "THREAD" ? "threads" : "posts"}/${id}/hide?value=${hidden}`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.reports() })
  });
};
