"use client";

import axios from "axios";
import { authToken } from "./auth-store";
import type { ApiEnvelope } from "./types";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export const http = axios.create({ baseURL: apiBaseUrl });

http.interceptors.request.use((config) => {
  const token = authToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const data = async <T>(request: Promise<{ data: ApiEnvelope<T> }>) => (await request).data.data;
