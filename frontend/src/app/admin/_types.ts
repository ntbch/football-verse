import type { UserStatus } from "@/shared/lib/types";

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  status: UserStatus;
  roles: string[];
};

export type ForumReport = {
  id: number;
  targetType: "THREAD" | "POST";
  targetId: number;
  reporter: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
};

export type NewsSourceSourceType = "RSS" | "SITEMAP" | "HOMEPAGE";

export type NewsSource = {
  id: number;
  name: string;
  feedUrl: string;
  active: boolean;
  sourceType: NewsSourceSourceType;
  cssSelector: string | null;
};