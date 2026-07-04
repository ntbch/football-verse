export type Profile = {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export type NotificationItem = {
  id: number;
  type: string;
  message: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
};