"use client";

import React from "react";
import Link from "next/link";
import type { ForumCategoryResponse, ThreadResponse } from "../types";
import { avatarGrad, getAuthorInitials, getCategoryConfig, timeAgo } from "./forum-shared";

interface ForumHeroBannerProps {
  totalThreads: number;
  totalCategories: number;
}

export function ForumHeroBanner({ totalThreads, totalCategories }: ForumHeroBannerProps) {
  return (
    <div className="forum-hero relative overflow-hidden rounded-2xl border border-[var(--color-accent)]/30 shadow-xl">
      {/* Pitch texture overlay */}
      <div className="forum-hero-grid absolute inset-0" />
      {/* Glow accent */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[var(--color-accent)] opacity-10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[var(--color-warning)] opacity-5 blur-3xl" />

      <div className="relative z-10 px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-success)]">Live Community</span>
          </div>
          <h1 className="m-0 font-serif-title font-black text-3xl md:text-4xl text-[var(--color-story-text)] leading-tight tracking-tight">
            Fan Community<br />
            <span className="text-[var(--color-accent)]">Arena</span>
          </h1>
          <p className="m-0 text-sm text-[var(--color-story-muted)] max-w-md leading-relaxed">
            Connect with fans worldwide. Debate tactics, transfers, gossip, and live matchday moments.
          </p>
        </div>

        {/* Live stats strip */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <div className="font-serif-title font-black text-3xl text-[var(--color-story-text)] tabular-nums">{totalThreads}</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-story-muted)] mt-1">Threads</div>
          </div>
          <div className="w-px h-12 bg-[var(--color-story-text)]/10" />
          <div className="text-center">
            <div className="font-serif-title font-black text-3xl text-[var(--color-story-text)] tabular-nums">{totalCategories}</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-story-muted)] mt-1">Topics</div>
          </div>
          <div className="w-px h-12 bg-[var(--color-story-text)]/10" />
          <div className="text-center">
            <div className="font-serif-title font-black text-3xl text-[var(--color-accent)] tabular-nums">24/7</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-story-muted)] mt-1">Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CategoryList
// ─────────────────────────────────────────────
