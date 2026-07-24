"use client";

import { create } from "zustand";
import type { AuthResponse } from "@/features/auth/types";
import type { BrowserAuth } from "./auth-session";
import { toBrowserAuth } from "./auth-session";
import { apiBaseUrl } from "./api-config";

interface AuthState {
  auth: BrowserAuth | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  setAuth: (auth: AuthResponse) => void;
  logout: () => void;
}

let hydrationPromise: Promise<BrowserAuth | null> | null = null;

const refreshSession = () => {
  if (!hydrationPromise) {
    hydrationPromise = fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: "{}",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const envelope = (await response.json()) as { success: boolean; data: AuthResponse };
        return envelope.success ? toBrowserAuth(envelope.data) : null;
      })
      .catch(() => null);
  }
  return hydrationPromise;
};

export const useAuthStore = create<AuthState>((set) => ({
  auth: null,
  ready: false,
  hydrate: async () => {
    if (typeof window === "undefined") return;
    const auth = await refreshSession();
    set({ auth, ready: true });
  },
  setAuth: (auth) => {
    const browserAuth = toBrowserAuth(auth);
    hydrationPromise = Promise.resolve(browserAuth);
    set({ auth: browserAuth, ready: true });
  },
  logout: () => {
    hydrationPromise = null;
    set({ auth: null, ready: true });
  },
}));

export const getAuthToken = (): string | null => {
  return useAuthStore.getState().auth?.accessToken ?? null;
};
