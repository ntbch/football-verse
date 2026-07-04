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