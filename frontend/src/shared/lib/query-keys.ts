// ponytail: central query-key registry. Keys MUST match pre-refactor literals exactly —
// changing a key here breaks cache invalidation across the app. Collapse into per-feature
// if this grows beyond 15 keys.

export const qk = {
  news: {
    list: () => ["news"] as const,
    detail: (slug: string) => ["news", slug] as const,
    comments: (slug: string) => ["news-comments", slug] as const,
  },
  forum: {
    categories: () => ["forum-categories"] as const,
    threads: (categorySlug: string) => ["threads", categorySlug] as const,
    thread: (slug: string) => ["thread", slug] as const,
  },
  admin: {
    users: () => ["admin-users"] as const,
    news: () => ["admin-news"] as const,
    article: (id: number) => ["admin-article", id] as const,
    newsCategories: () => ["news-categories"] as const,
    newsSources: () => ["news-sources"] as const,
    forumCategories: () => ["forum-categories"] as const,
    reports: () => ["admin-reports"] as const,
    dashboardStats: () => ["admin-dashboard-stats"] as const,
    userGrowth: () => ["admin-user-growth"] as const,
  },
  user: {
    profile: () => ["profile"] as const,
    notifications: () => ["notifications"] as const,
  },
  moderator: {
    stats: () => ["moderator-stats"] as const,
    reports: () => ["moderator-reports"] as const,
  },
} as const;