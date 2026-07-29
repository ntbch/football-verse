"use client";

import React from "react";

export const LoadingBlock = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex items-center justify-center p-12 w-full min-h-[200px]" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3">
      <div aria-hidden="true" className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-[var(--color-text-secondary)]">
        {label}...
      </span>
    </div>
  </div>
);

export const ErrorBlock = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="w-full my-4 p-4 rounded-xl border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/5 text-[var(--color-danger)] text-xs font-bold flex items-center gap-3" role="alert">
    <span aria-hidden="true" className="w-2 h-2 rounded-full bg-[var(--color-danger)] shrink-0" />
    <span>{message}</span>
    {onRetry ? <button type="button" onClick={onRetry} className="ml-auto min-h-11 px-3 rounded-lg border border-current/30 hover:bg-[var(--color-danger)]/10">Retry</button> : null}
  </div>
);

export const EmptyBlock = ({ message = "No records found." }: { message?: string }) => (
  <div className="w-full text-center py-16 px-4 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-background-surface)]/40" role="status">
    <span aria-hidden="true" className="text-2xl block mb-2">📭</span>
    <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">{message}</p>
  </div>
);
