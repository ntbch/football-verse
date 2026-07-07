"use client";

import React from "react";
import { PublicShell } from "@/shared/components/page-shell";

export default function SearchPage() {
  return (
    <PublicShell>
      <div className="p-8 bg-white border border-[var(--color-border)] rounded-2xl shadow-premium max-w-2xl mx-auto text-center mt-10">
        <div className="flex flex-col gap-3">
          <h2 className="m-0 font-serif-title font-black text-2xl text-[var(--color-text-primary)]">
            Search
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">
            Use the search bar in the header to look for news articles and discussions.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
