"use client";

import React from "react";

export const LoadingBlock = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex items-center justify-center p-12 w-full min-h-[200px]">
    <div className="flex flex-col items-center gap-3">
      {/* Premium circular loading indicator */}
      <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest animate-pulse text-[var(--color-text-secondary)]">
        {label}...
      </span>
    </div>
  </div>
);

export const ErrorBlock = ({ message }: { message: string }) => (
  <div className="w-full my-4 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-semibold flex items-center gap-3">
    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
    <span>{message}</span>
  </div>
);
