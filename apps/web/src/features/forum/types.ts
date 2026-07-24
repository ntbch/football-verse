export type ForumCategoryResponse = {
  id: number;
  name: string;
  slug: string;
  description: string;
  threadCount: number;
  postCount: number;
};

export type ThreadResponse = {
  id: number;
  title: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  authorUsername: string;
  replyCount: number;
  viewCount: number;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  liked: boolean;
  likes: number;
  createdAt: string;
  lastPostAt: string;
  tags?: string[];
};

export type PostResponse = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  likeCount: number;
  liked: boolean;
  hidden?: boolean;
  bestAnswer?: boolean;
};

export type ThreadDetailResponse = {
  thread: ThreadResponse;
  posts: PostResponse[];
};
