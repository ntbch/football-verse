"use client";

import React from "react";
import Link from "next/link";
import type { ForumCategoryResponse, ThreadResponse } from "../types";
import { avatarGrad, getAuthorInitials, getCategoryConfig, timeAgo } from "./forum-shared";

interface CategoryBannerProps {
  category: ForumCategoryResponse;
}

export function CategoryBanner({ category }: CategoryBannerProps) {
  const cfg = getCategoryConfig(category.slug);
  return (
    <div className={`rounded-2xl border border-[var(--color-border)] overflow-hidden`}>
      <div className={`px-6 py-5 flex items-center justify-between gap-4 ${cfg.bg}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm ${cfg.color}`}>
            <span className="scale-[1.4]">{cfg.icon}</span>
          </div>
          <div>
            <h2 className={`m-0 font-serif-title font-black text-2xl ${cfg.color.replace("text-", "text-").replace("-600", "-800").replace("-500", "-700")}`}>
              {category.name}
            </h2>
            {category.description && (
              <p className="m-0 text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed max-w-lg">
                {category.description}
              </p>
            )}
          </div>
        </div>
        <div className={`text-center shrink-0 bg-white rounded-xl px-4 py-2.5 shadow-sm`}>
          <div className={`font-black text-2xl tabular-nums ${cfg.color}`}>{category.threadCount}</div>
          <div className="text-[9px] uppercase font-bold tracking-wider text-[var(--color-text-secondary)]">Threads</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CreateThreadModal
// ─────────────────────────────────────────────
