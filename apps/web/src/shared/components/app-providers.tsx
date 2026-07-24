"use client";

import React, { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../lib/auth-store";
import { ToastProvider } from "./toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      })
  );

  const hydrate = useAuthStore((state) => state.hydrate);
  const principal = useAuthStore((state) => state.auth?.userId ?? null);
  const previousPrincipal = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        queryClient.clear();
        void hydrate();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [hydrate, queryClient]);

  useEffect(() => {
    if (previousPrincipal.current !== undefined && previousPrincipal.current !== principal) {
      queryClient.clear();
    }
    previousPrincipal.current = principal;
  }, [principal, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
