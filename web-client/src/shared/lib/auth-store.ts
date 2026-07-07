"use client";

import { create } from "zustand";
import type { AuthResponse } from "./types";

interface AuthState {
  auth: AuthResponse | null;
  ready: boolean;
  hydrate: () => void;
  setAuth: (auth: AuthResponse) => void;
  logout: () => void;
}

const key = "football-verse-auth";

const getStoredAuth = (): AuthResponse | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  auth: null,
  ready: false,
  hydrate: () => {
    // ponytail: run on client mount to avoid Next.js hydration mismatches
    if (typeof window === "undefined") return;
    set({ auth: getStoredAuth(), ready: true });
  },
  setAuth: (auth) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(auth));
    }
    set({ auth });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
    set({ auth: null });
  },
}));

export const getAuthToken = (): string | null => {
  return getStoredAuth()?.accessToken ?? null;
};
