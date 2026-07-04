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
  solved: boolean;
  bestAnswerPostId: number | null;
  followed: boolean;
  replyCount: number;
  lastActivityAt: string;
};

export type ForumPost = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
};

export type ThreadDetail = {
  thread: ForumThread;
  posts: ForumPost[];
};
