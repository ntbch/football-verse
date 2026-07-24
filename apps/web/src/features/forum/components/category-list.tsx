"use client";

import React from "react";
import Link from "next/link";
import type { ForumCategoryResponse, ThreadResponse } from "../types";
import { avatarGrad, getAuthorInitials, getCategoryConfig, timeAgo } from "./forum-shared";

interface CategoryListProps {
  categories: ForumCategoryResponse[];
  activeCategorySlug: string | null;
  onSelect: (slug: string) => void;
}

export function CategoryList({ categories, activeCategorySlug, onSelect }: CategoryListProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const activeCat = categories.find((c) => c.slug === activeCategorySlug);

  return (
    <div className="w-full">
      {/* Mobile/Tablet Category Selector (Dropdown Popover) */}
      <div className="lg:hidden relative w-full mb-1">
        {isOpen && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-5 py-3.5 rounded-2xl bg-[var(--color-background-surface)] border border-[var(--color-border)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)] flex items-center justify-between shadow-sm active:scale-[0.99] transition-all z-40 relative cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--color-accent)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Topic:{" "}
            <span className="text-[var(--color-accent)]">
              {activeCat ? activeCat.name : "All Topics"}
            </span>
          </span>
          <svg
            className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium p-2 flex flex-col gap-1.5 animate-fade-in">
            {categories.map((cat) => {
              const isActive = activeCategorySlug === cat.slug;
              const cfg = getCategoryConfig(cat.slug);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelect(cat.slug);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-left transition-colors flex items-center gap-2.5 cursor-pointer ${
                    isActive
                      ? "bg-[var(--color-accent)] text-white shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    isActive ? "bg-white/20 text-white" : `${cfg.bg} ${cfg.color}`
                  }`}>
                    {cfg.icon}
                  </span>
                  <span className="text-xs font-bold">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Card view */}
      <div className="card overflow-hidden hidden lg:block">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
          <h3 className="font-serif-title font-black text-xs m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
            Discussion Topics
          </h3>
        </div>
        <div className="p-2.5 flex flex-col gap-1.5">
          {categories.map((cat) => {
            const isActive = activeCategorySlug === cat.slug;
            const cfg = getCategoryConfig(cat.slug);
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.slug)}
                className={`w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 active:scale-[0.98] cursor-pointer group ${
                  isActive
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "hover:bg-gray-50 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? "bg-white/20 text-white" : `${cfg.bg} ${cfg.color}`
                }`}>
                  {cfg.icon}
                </span>

                <div className="flex flex-col gap-0 flex-1 min-w-0">
                  <span className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-[var(--color-text-primary)]"}`}>
                    {cat.name}
                  </span>
                  <span className={`text-[9px] font-semibold ${isActive ? "text-white/60" : "text-[var(--color-text-secondary)]"}`}>
                    {cat.threadCount} threads
                  </span>
                </div>

                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-white/60" : "bg-green-400"}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ForumSidebarWidget
// ─────────────────────────────────────────────
