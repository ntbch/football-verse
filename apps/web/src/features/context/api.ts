"use client";

import { useQuery } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { FixtureContextResponse } from "./types";

export const useFixtureContext = (fixtureId: string | null | undefined, enabled = true) =>
  useQuery({
    queryKey: ["context", "fixture", fixtureId],
    queryFn: () => data<FixtureContextResponse>(http.get(`/contexts/fixtures/${encodeURIComponent(fixtureId!)}`)),
    enabled: enabled && Boolean(fixtureId),
    staleTime: 120_000,
  });
