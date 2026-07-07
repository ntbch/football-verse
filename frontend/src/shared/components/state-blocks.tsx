"use client";

import React from "react";

export const LoadingBlock = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex items-center justify-center p-12 w-full min-h-[200px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-[var(--color-text-secondary)]">
        {label}...
      </span>
    </div>
  </div>
);

export const ErrorBlock = ({ message }: { message: string }) => (
  <div className="w-full my-4 p-4 rounded-xl border border-red-500/25 bg-red-500/5 text-red-500 text-xs font-bold flex items-center gap-3">
    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
    <span>{message}</span>
  </div>
);

export const EmptyBlock = ({ message = "No records found." }: { message?: string }) => (
  <div className="w-full text-center py-16 px-4 border border-dashed border-[var(--color-border)] rounded-2xl bg-white/40">
    <span className="text-2xl block mb-2">📭</span>
    <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">{message}</p>
  </div>
);
