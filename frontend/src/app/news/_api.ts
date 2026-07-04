"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { PageResponse } from "@/shared/lib/types";
import type { Comment, NewsArticle } from "./_types";
import { qk } from "@/shared/lib/query-keys";

const NEWS_PAGE_SIZE = 20;

export const useNewsFeed = (page: number) =>
  useQuery({
    queryKey: [...qk.news.list(), page],
    queryFn: () => data<PageResponse<NewsArticle>>(http.get(`/news?page=${page}&size=${NEWS_PAGE_SIZE}`))
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
    mutationFn: ({ articleId, content }: { articleId: number; content: string }) =>
      data<Comment>(http.post(`/news/${articleId}/comments`, { content })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.news.comments(slug) })
  });
};
