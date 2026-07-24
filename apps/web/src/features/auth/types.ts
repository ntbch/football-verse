export type UserRole = "USER" | "MODERATOR" | "ADMIN";
export type UserStatus = "ACTIVE" | "MUTED" | "BANNED";

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
  username: string;
  roles: UserRole[];
};
