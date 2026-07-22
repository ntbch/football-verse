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
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (previousPrincipal.current !== undefined && previousPrincipal.current !== principal) {
      queryClient.removeQueries({ queryKey: ["game"] });
    }
    previousPrincipal.current = principal;
  }, [principal, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
