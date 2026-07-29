import type { AuthResponse } from "@/features/auth/types";

export type BrowserAuth = AuthResponse;

export const toBrowserAuth = (auth: AuthResponse): BrowserAuth => ({
  ...auth,
  roles: Array.isArray(auth.roles) ? auth.roles : [],
});
