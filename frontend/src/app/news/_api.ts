"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { PageResponse } from "@/shared/lib/types";
import type { Comment, NewsArticle, NewsCategory, NewsTag } from "./_types";
import { qk } from "@/shared/lib/query-keys";

const NEWS_PAGE_SIZE = 20;

type NewsFilters = {
  categoryIds: number[];
  tagIds: number[];
};

const newsUrl = (page: number, filters: NewsFilters) => {
  const params = new URLSearchParams({ page: String(page), size: String(NEWS_PAGE_SIZE) });
  filters.categoryIds.forEach((id) => params.append("categories", String(id)));
  filters.tagIds.forEach((id) => params.append("tags", String(id)));
  return `/news?${params.toString()}`;
};

export const useNewsFeed = (page: number, filters: NewsFilters = { categoryIds: [], tagIds: [] }) =>
  useQuery({
    queryKey: [...qk.news.list(), page, filters.categoryIds, filters.tagIds],
    queryFn: () => data<PageResponse<NewsArticle>>(http.get(newsUrl(page, filters)))
  });

export const useNewsCategories = () =>
  useQuery({
    queryKey: ["news-categories"],
    queryFn: () => data<NewsCategory[]>(http.get("/news/categories"))
  });

export const useNewsTags = () =>
  useQuery({
    queryKey: ["news-tags"],
    queryFn: () => data<NewsTag[]>(http.get("/news/tags"))
  });

export const useNewsArticle = (slug: string) =>
  useQuery({
    queryKey: qk.news.detail(slug),
    queryFn: () => data<NewsArticle>(http.get(`/news/${slug}`))
  });

export const useNewsComments = (slug: string) =>
  useQuery({
    queryKey: qk.news.comments(slug),
    queryFn: () => data<Comment[]>(http.get(`/news/${slug}/comments`))
  });

export const useLikeNews = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (articleId: number) => data<{ liked: boolean }>(http.post(`/news/${articleId}/like`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.news.detail(slug) })
  });
};

export const useBookmarkNews = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (articleId: number) => data<{ bookmarked: boolean }>(http.post(`/news/${articleId}/bookmark`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.news.detail(slug) })
  });
};

export const useCreateNewsComment = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ articleId, content, parentId }: { articleId: number; content: string; parentId?: number }) =>
      data<Comment>(http.post(`/news/${articleId}/comments`, { content, parentId })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.news.comments(slug) })
  });
};

export const useLikeNewsComment = (slug: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => data<{ liked: boolean }>(http.post(`/news/comments/${commentId}/like`)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.news.comments(slug) })
  });
};
