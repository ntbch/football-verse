"use client";

import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAuthToken, useAuthStore } from "./auth-store";
import { apiBaseUrl, apiOrigin } from "./api-config";

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export { apiBaseUrl } from "./api-config";

export const http = axios.create({ baseURL: apiBaseUrl, timeout: 15_000, withCredentials: true });

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    const target = new URL(config.url ?? "", config.baseURL ?? apiBaseUrl);
    if (target.origin !== apiOrigin) {
      return Promise.reject(new Error("Refusing to send credentials outside the configured API origin"));
    }
    config.headers.Authorization = `Bearer ${token}`;
    config.headers["Cache-Control"] = "no-store";
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as RetryConfig | undefined;
    const authState = useAuthStore.getState();
    const currentAuth = authState.auth;

    if (error.response?.status === 401 && original && !original._retry && currentAuth) {
      original._retry = true;
      try {
        const refreshed = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
          `${apiBaseUrl}/auth/refresh`,
          {},
          { withCredentials: true, headers: { "Cache-Control": "no-store" } }
        );
        authState.setAuth(refreshed.data.data as import("@/features/auth/types").AuthResponse);
        original.headers.Authorization = `Bearer ${refreshed.data.data.accessToken}`;
        return http(original);
      } catch {
        authState.logout();
      }
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== "undefined") {
        const isAuthZone = window.location.pathname.startsWith("/admin") ||
                           window.location.pathname.startsWith("/moderator") ||
                           window.location.pathname.startsWith("/profile");

        // ponytail: degrade to guest gracefully instead of forcing redirect on public pages
        if (currentAuth || isAuthZone) {
          authState.logout();
          window.location.href = "/login";
        }
      }
    }
    const method = original?.method?.toUpperCase();
    if (typeof window !== "undefined" && method && method !== "GET" && ![401, 403].includes(error.response?.status ?? 0)) {
      window.dispatchEvent(new CustomEvent("football-verse:api-error", {
        detail: error.response?.data.message ?? (error.response ? "Action failed. Please try again." : "Server is unavailable. Please try again."),
      }));
    }
    return Promise.reject(error);
  }
);

export const data = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => (await request).data.data;

export const apiErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<ApiEnvelope<unknown>>(error) ? error.response?.data.message ?? fallback : fallback;
