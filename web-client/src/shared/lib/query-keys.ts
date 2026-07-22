const gamePrincipal = () => {
  if (typeof window === "undefined") return "anonymous";
  try {
    const auth = JSON.parse(window.localStorage.getItem("football-verse-auth") ?? "null") as { userId?: number } | null;
    return String(auth?.userId ?? "anonymous");
  } catch {
    return "anonymous";
  }
};
const gameKey = (...parts: (string | number)[]) => ["game", gamePrincipal(), ...parts] as const;

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
    reports: () => ["admin-reports"] as const,
    dashboardStats: () => ["admin-dashboard-stats"] as const,
    userGrowth: () => ["admin-user-growth"] as const,
  },
  user: {
    profile: () => ["profile"] as const,
    notifications: () => ["notifications"] as const,
    followingThreads: () => ["following-threads"] as const,
  },
  moderator: {
    stats: () => ["moderator-stats"] as const,
    reports: () => ["moderator-reports"] as const,
  },
  predictions: {
    fixtures: (league: string) => ["predictions", "fixtures", league] as const,
    stats: () => ["predictions", "stats"] as const,
    leaderboard: (period: string) => ["predictions", "leaderboard", period] as const,
    matchCentre: (league: string, round?: string) => ["predictions", "match-centre", league, round ?? ""] as const,
  },
  game: {
    key: gameKey,
    saves: () => gameKey("saves"),
    save: (id: string) => gameKey("save", id),
    squad: (saveId: string, clubId: string) => gameKey("squad", saveId, clubId),
    match: (saveId: string, matchId: string) => gameKey("match", saveId, matchId),
    standings: (saveId: string) => gameKey("standings", saveId),
  },
} as const;
