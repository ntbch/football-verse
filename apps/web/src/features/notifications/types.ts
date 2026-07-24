export type NotificationResponse = {
  id: number;
  message: string;
  type: string;
  linkUrl?: string;
  read: boolean;
  createdAt: string;
};
