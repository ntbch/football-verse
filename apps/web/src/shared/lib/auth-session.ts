import type { AuthResponse } from "@/features/auth/types";

export type BrowserAuth = Omit<AuthResponse, "refreshToken">;

export const toBrowserAuth = ({ refreshToken: _refreshToken, ...auth }: AuthResponse): BrowserAuth => auth;
