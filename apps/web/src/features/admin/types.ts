export type AdminRole = "USER" | "MODERATOR" | "ADMIN";

export type AdminUser = {
  id: number;
  email: string;
  username: string;
  status: "ACTIVE" | "MUTED" | "BANNED";
  roles: AdminRole[];
  createdAt?: string;
};
