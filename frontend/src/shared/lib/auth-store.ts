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

export const useAuthStore = create<AuthState>((set) => ({
  auth: null,
  ready: false,
  hydrate: () => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(key);
    set({ auth: raw ? (JSON.parse(raw) as AuthResponse) : null, ready: true });
  },
  setAuth: (auth) => {
    window.localStorage.setItem(key, JSON.stringify(auth));
    set({ auth });
  },
  logout: () => {
    window.localStorage.removeItem(key);
    set({ auth: null });
  }
}));

export const authToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as AuthResponse).accessToken : null;
};
