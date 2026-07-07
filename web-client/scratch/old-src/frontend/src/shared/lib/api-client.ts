"use client";

import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { authToken, persistAuth, storedAuth, useAuthStore } from "./auth-store";
import type { ApiEnvelope, AuthResponse } from "./types";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const http = axios.create({ baseURL: apiBaseUrl });

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

http.interceptors.request.use((config) => {
  const token = authToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as RetryConfig | undefined;
    const auth = storedAuth();
    if (error.response?.status === 401 && original && !original._retry && auth?.refreshToken) {
      original._retry = true;
      try {
        const refreshed = await axios.post<ApiEnvelope<AuthResponse>>(`${apiBaseUrl}/auth/refresh`, {
          refreshToken: auth.refreshToken
        });
        persistAuth(refreshed.data.data);
        useAuthStore.setState({ auth: refreshed.data.data });
        original.headers.Authorization = `Bearer ${refreshed.data.data.accessToken}`;
        return http(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== "undefined") {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const data = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => (await request).data.data;

export const apiErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<ApiEnvelope<unknown>>(error) ? error.response?.data.message ?? fallback : fallback;
