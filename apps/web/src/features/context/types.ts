export type FootballContext = {
  id: number;
  type: "FIXTURE" | "COMPETITION" | "CLUB" | "PLAYER" | "TOPIC";
  key: string;
  displayName: string;
};

export type ContextualNews = {
  title: string;
  slug: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
};

export type ContextualThread = {
  title: string;
  slug: string;
  category: string;
  lastActivityAt: string;
};

export type FixtureContextResponse = {
  context: FootballContext;
  news: ContextualNews[];
  threads: ContextualThread[];
};
