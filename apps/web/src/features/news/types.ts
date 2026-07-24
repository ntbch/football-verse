export type NewsArticleResponse = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DELETED";
  category: string;
  tags: string[];
  likes: number;
  bookmarks: number;
  publishedAt: string;
  liked?: boolean;
  bookmarked?: boolean;
  contentKind?: "EDITORIAL" | "AGGREGATED_STORY";
  imageUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "EMBED" | "NONE";
  verificationStatus?: "OFFICIAL" | "MULTIPLE_REPORTS" | "SINGLE_REPORT" | "RUMOUR" | "CONFLICTING";
  sourceName?: string;
  sourceUrl?: string;
  sourceCount?: number;
  sources?: StorySourceResponse[];
  keyPoints?: StoryKeyPointResponse[];
};

export type StorySourceResponse = {
  name: string;
  url: string;
  publishedAt?: string;
  primary: boolean;
};

export type StoryKeyPointResponse = {
  text: string;
  evidence: {
    sourceName: string;
    originalUrl: string;
    publishedAt?: string;
    relation: "SUPPORT" | "CONTRADICTION" | "CONTEXT";
  }[];
};

export type CommentResponse = {
  id: number;
  content: string;
  username: string;
  likes: number;
  liked: boolean;
  replies: CommentResponse[];
  publishedAt: string;
  parentId?: number;
};

export type NewsCategoryResponse = {
  id: number;
  name: string;
  slug: string;
};
