"use client";

import React from "react";
import Link from "next/link";
import type { ForumCategoryResponse, ThreadResponse } from "@/shared/lib/types";

// ─────────────────────────────────────────────
// Category icon/color config
// ─────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  default: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    color: "text-[var(--color-accent)]",
    bg: "bg-[var(--color-accent)]/10",
  },
};

function getCategoryConfig(slug: string) {
  const configs: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    tactics: {
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    transfers: {
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    matchday: {
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    gossip: {
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    predictions: {
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" /></svg>,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    general: {
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      color: "text-sky-600",
      bg: "bg-sky-50",
    },
  };

  for (const key of Object.keys(configs)) {
    if (slug.toLowerCase().includes(key)) return configs[key];
  }
  return CATEGORY_CONFIG.default;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getAuthorInitials(username?: string | null) {
  if (!username) return "?";
  return username.substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-red-500","bg-amber-500","bg-emerald-500","bg-blue-500",
  "bg-purple-500","bg-pink-500","bg-indigo-500","bg-teal-500",
];

function avatarColor(username?: string | null) {
  if (!username) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────
// ForumHeroBanner
// ─────────────────────────────────────────────
interface ForumHeroBannerProps {
  totalThreads: number;
  totalCategories: number;
}

export function ForumHeroBanner({ totalThreads, totalCategories }: ForumHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a00] via-[#3d1a08] to-[#1a0a00] border border-[var(--color-accent)]/30 shadow-xl">
      {/* Pitch texture overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(255,255,255,0.5) 30px, rgba(255,255,255,0.5) 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(255,255,255,0.5) 30px, rgba(255,255,255,0.5) 31px)`
      }} />
      {/* Glow accent */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[var(--color-accent)] opacity-10 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-amber-400 opacity-5 blur-3xl" />

      <div className="relative z-10 px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">Live Community</span>
          </div>
          <h1 className="m-0 font-serif-title font-black text-3xl md:text-4xl text-white leading-tight tracking-tight">
            Fan Community<br />
            <span className="text-[var(--color-accent)]">Arena</span>
          </h1>
          <p className="m-0 text-sm text-gray-400 max-w-md leading-relaxed">
            Connect with fans worldwide. Debate tactics, transfers, gossip, and live matchday moments.
          </p>
        </div>

        {/* Live stats strip */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <div className="font-serif-title font-black text-3xl text-white tabular-nums">{totalThreads}</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-gray-500 mt-1">Threads</div>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="text-center">
            <div className="font-serif-title font-black text-3xl text-white tabular-nums">{totalCategories}</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-gray-500 mt-1">Topics</div>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="text-center">
            <div className="font-serif-title font-black text-3xl text-[var(--color-accent)] tabular-nums">24/7</div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-gray-500 mt-1">Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CategoryList
// ─────────────────────────────────────────────
interface CategoryListProps {
  categories: ForumCategoryResponse[];
  activeCategorySlug: string | null;
  onSelect: (slug: string) => void;
}

export function CategoryList({ categories, activeCategorySlug, onSelect }: CategoryListProps) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
        <h3 className="font-serif-title font-black text-xs m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
          Discussion Topics
        </h3>
      </div>
      <div className="p-2 flex flex-col gap-0.5">
        {categories.map((cat) => {
          const isActive = activeCategorySlug === cat.slug;
          const cfg = getCategoryConfig(cat.slug);
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.slug)}
              className={`w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200 flex items-center gap-3 active:scale-[0.98] group ${
                isActive
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "hover:bg-gray-50"
              }`}
            >
              {/* Category icon */}
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

              {/* Activity dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-white/60" : "bg-green-400"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ForumSidebarWidget
// ─────────────────────────────────────────────
interface ForumSidebarWidgetProps {
  categories: ForumCategoryResponse[];
  activeCategory: ForumCategoryResponse | undefined;
  trendingThreads: ThreadResponse[];
}

export function ForumSidebarWidget({ categories, activeCategory, trendingThreads }: ForumSidebarWidgetProps) {
  const totalThreads = categories.reduce((sum, c) => sum + (c.threadCount ?? 0), 0);
  return (
    <div className="flex flex-col gap-4">
      {/* Community pulse */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
          <h3 className="font-serif-title font-black text-xs m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
            Community Pulse
          </h3>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {[
            { label: "Categories", value: categories.length, accent: false },
            { label: "Threads", value: totalThreads, accent: true },
            { label: "Active Now", value: "—", accent: false },
            ...(activeCategory
              ? [{ label: activeCategory.name, value: activeCategory.threadCount, accent: false }]
              : [{ label: "Pick a topic", value: "↑", accent: false }]),
          ].map((stat, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1">
              <span className={`font-black text-xl tabular-nums ${stat.accent ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}>
                {stat.value}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending threads */}
      {trendingThreads.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            <h3 className="font-serif-title font-black text-xs m-0 uppercase tracking-widest text-[var(--color-text-secondary)]">
              Hot Threads
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {trendingThreads.slice(0, 4).map((t, i) => (
              <Link
                key={t.id}
                href={`/forum/threads/${t.slug}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors"
              >
                <span className="font-serif-title font-black text-2xl leading-none text-gray-200 tabular-nums w-6 shrink-0">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-[var(--color-text-primary)] leading-snug line-clamp-2">
                    {t.title}
                  </span>
                  <span className="text-[9px] text-[var(--color-text-secondary)] font-semibold">
                    {t.replyCount} replies · {t.likes} likes
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ThreadCard
// ─────────────────────────────────────────────
interface ThreadCardProps {
  thread: ThreadResponse;
  index?: number;
}

export function ThreadCard({ thread, index = 0 }: ThreadCardProps) {
  const isHot = thread.replyCount > 10 || thread.likes > 5;
  const isNew = (Date.now() - new Date(thread.createdAt).getTime()) < 3600000 * 3;

  return (
    <div
      className="group relative bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-accent)]/40 hover:shadow-md transition-all duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Left accent strip for pinned */}
      {thread.pinned && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-2xl" />
      )}

      <div className="p-5 pl-6 flex flex-col gap-3">
        {/* Top row: badges + meta */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Author avatar chip */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 ${avatarColor(thread.authorUsername)}`}>
              {getAuthorInitials(thread.authorUsername)}
            </span>
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">
              @{thread.authorUsername}
            </span>
          </div>

          <span className="text-[var(--color-text-secondary)]/40 text-[10px]">·</span>
          <span className="text-[10px] text-[var(--color-text-secondary)]">{timeAgo(thread.createdAt)}</span>

          {/* Status badges */}
          <div className="flex items-center gap-1.5 ml-auto">
            {isNew && !thread.pinned && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-wider border border-blue-100">
                New
              </span>
            )}
            {isHot && (
              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[8px] font-black uppercase tracking-wider border border-orange-100 flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                Hot
              </span>
            )}
            {thread.pinned && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-wider border border-amber-100">
                Pinned
              </span>
            )}
            {thread.locked && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-wider border border-red-100 flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Locked
              </span>
            )}
          </div>
        </div>

        {/* Thread Title */}
        <Link href={`/forum/threads/${thread.slug}`}>
          <h4 className="m-0 font-serif-title font-black text-[1.05rem] leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-200">
            {thread.title}
          </h4>
        </Link>

        {/* Tags */}
        {thread.tags && thread.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-[var(--color-background-body)] border border-[var(--color-border)] text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: stats + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-4">
            {/* Reply count */}
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{thread.replyCount}</span>
              <span className="text-[9px] font-normal text-[var(--color-text-secondary)]/60">replies</span>
            </span>
            {/* Likes */}
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
              </svg>
              <span>{thread.likes}</span>
              <span className="text-[9px] font-normal text-[var(--color-text-secondary)]/60">likes</span>
            </span>
            {/* Views */}
            {thread.viewCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{thread.viewCount}</span>
              </span>
            )}
          </div>

          <Link
            href={`/forum/threads/${thread.slug}`}
            className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline underline-offset-4 transition-all active:scale-[0.96] group-hover:opacity-100 opacity-60"
          >
            Read →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CategoryBanner (replaces plain card header)
// ─────────────────────────────────────────────
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
interface CreateThreadModalProps {
  categories: ForumCategoryResponse[];
  targetCategorySlug: string;
  newTitle: string;
  newContent: string;
  newTags: string;
  isPending: boolean;
  onCategoryChange: (slug: string) => void;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onTagsChange: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateThreadModal({
  categories,
  targetCategorySlug,
  newTitle,
  newContent,
  newTags,
  isPending,
  onCategoryChange,
  onTitleChange,
  onContentChange,
  onTagsChange,
  onClose,
  onSubmit,
}: CreateThreadModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl bg-white border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="m-0 font-serif-title font-black text-lg text-[var(--color-text-primary)]">
              Start a New Thread
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-gray-100 hover:text-[var(--color-accent)] transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Forum Category
              </label>
              <select
                value={targetCategorySlug}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Thread Title
              </label>
              <input
                type="text"
                placeholder="A clear, compelling title..."
                value={newTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Your Post
              </label>
              <textarea
                placeholder="Share your thoughts, analysis, or questions..."
                value={newContent}
                onChange={(e) => onContentChange(e.target.value)}
                rows={6}
                className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Tags
                <span className="ml-1 font-normal normal-case tracking-normal text-[var(--color-text-secondary)]/60">(comma separated)</span>
              </label>
              <input
                type="text"
                placeholder="transfers, arsenal, rumours..."
                value={newTags}
                onChange={(e) => onTagsChange(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)]">
              <p className="text-[9px] text-[var(--color-text-secondary)] italic">
                Be respectful. No spam or offensive content.
              </p>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={onClose} className="btn btn-secondary !px-4 !py-2 !text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary !px-5 !py-2 !text-xs shadow-sm">
                  {isPending ? "Publishing..." : "Publish Thread"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
