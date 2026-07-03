export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type UserRole = "USER" | "MODERATOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "MUTED" | "BANNED";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  username: string;
  roles: UserRole[];
};

export type NewsCategory = {
  id: number;
  name: string;
  slug: string;
};

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

export type Comment = {
  id: number;
  parentId: number | null;
  author: string;
  content: string;
  createdAt: string;
};

export type ForumCategory = {
  id: number;
  name: string;
  slug: string;
};

export type ForumThread = {
  id: number;
  title: string;
  slug: string;
  category: string;
  author: string;
  pinned: boolean;
  locked: boolean;
  createdAt: string;
};

export type ForumPost = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
};

export type ThreadDetail = {
  thread: ForumThread;
  posts: ForumPost[];
};

export type NotificationItem = {
  id: number;
  type: string;
  message: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
};

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  status: UserStatus;
  roles: UserRole[];
};

export type NewsSource = {
  id: number;
  name: string;
  feedUrl: string;
  active: boolean;
};

export type ForumReport = {
  id: number;
  targetType: "THREAD" | "POST";
  targetId: number;
  reporter: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
};
