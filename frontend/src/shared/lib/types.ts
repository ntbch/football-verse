// Cross-cutting types used by 3+ features. Feature-specific types live in their per-feature _types.ts
export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

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