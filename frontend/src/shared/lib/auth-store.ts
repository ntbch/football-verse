"use client";

import { create } from "zustand";
import type { AuthResponse } from "./types";

type AuthState = {
  auth: AuthResponse | null;
  ready: boolean;
  hydrate: () => void;
  setAuth: (auth: AuthResponse) => void;
  logout: () => void;
};

const key = "football-verse-auth";

export const storedAuth = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const persistAuth = (auth: AuthResponse) => {
  window.localStorage.setItem(key, JSON.stringify(auth));
};

export const clearAuth = () => {
  window.localStorage.removeItem(key);
};

export const useAuthStore = create<AuthState>((set) => ({
  auth: null,
  ready: false,
  hydrate: () => {
    if (typeof window === "undefined") {
      return;
    }
    set({ auth: storedAuth(), ready: true });
  },
  setAuth: (auth) => {
    persistAuth(auth);
    set({ auth });
  },
  logout: () => {
    clearAuth();
    set({ auth: null });
  }
}));

export const authToken = () => {
  return storedAuth()?.accessToken ?? null;
};
