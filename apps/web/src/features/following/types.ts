import type { NewsArticleResponse } from "@/features/news/types";

export type FollowTargetType = "CLUB" | "LEAGUE" | "PLAYER" | "TOPIC";

export type FollowTarget = {
  targetType: FollowTargetType;
  targetKey: string;
  targetName: string;
  following?: boolean;
  createdAt?: string | null;
};

export type FollowingFeed = {
  follows: FollowTarget[];
  items: { article: NewsArticleResponse; reasons: string[] }[];
};

export const followTopics: FollowTarget[] = [
  { targetType: "TOPIC", targetKey: "transfers", targetName: "Transfers" },
  { targetType: "TOPIC", targetKey: "tactical", targetName: "Tactical" },
  { targetType: "TOPIC", targetKey: "injury", targetName: "Injury" },
  { targetType: "TOPIC", targetKey: "match-reports", targetName: "Match Reports" },
];
