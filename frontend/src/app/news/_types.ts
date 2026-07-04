export type NewsArticle = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DELETED";
  category: string | null;
  tags: string[];
  likes: number;
  bookmarks: number;
  publishedAt: string | null;
};

export type NewsCategory = {
  id: number;
  name: string;
  slug: string;
};

export type Comment = {
  id: number;
  parentId: number | null;
  author: string;
  content: string;
  createdAt: string;
};