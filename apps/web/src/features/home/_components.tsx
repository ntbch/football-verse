"use client";

import Link from "next/link";
import type { LeaderboardEntryResponse } from "@/features/predictions/types";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─────────────────────────────────────────────
// LeaderboardWidget
// ─────────────────────────────────────────────
interface LeaderboardWidgetProps {
  leaderboard: LeaderboardEntryResponse[];
}

export function LeaderboardWidget({ leaderboard }: LeaderboardWidgetProps) {
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-serif-title font-black text-sm m-0 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a3 3 0 003-3V4H9v7a3 3 0 003 3zM15 4h3a1 1 0 011 1v3a3 3 0 01-3 3h-1M9 4H6a1 1 0 00-1 1v3a3 3 0 003 3h1m3 3v4M8 21h8" />
          </svg>
          <span>Top Predictors</span>
        </h3>
        <Link
          href="/predictions"
          className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline underline-offset-4 active:scale-[0.98] transition-all"
        >
          Play →
        </Link>
      </div>
      {leaderboard.length > 0 ? (
        <div className="divide-y divide-gray-50 flex-1">
          {leaderboard.slice(0, 5).map((u, i) => (
            <div
              key={u.userId}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    i === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : i === 1
                        ? "bg-gray-100 text-gray-600"
                        : i === 2
                          ? "bg-orange-50 text-orange-600"
                          : "bg-gray-50 text-[var(--color-text-secondary)]"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-xs font-bold">@{u.username}</span>
              </div>
              <span className="text-xs font-black text-[var(--color-accent)] tabular-nums">
                {u.points} pts
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">No predictions yet.</p>
        </div>
      )}
      <Link
        href="/predictions"
        className="block text-center py-3 border-t border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)] hover:bg-gray-50 active:bg-gray-100 transition-all active:scale-[0.98]"
      >
        Make Your Predictions
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────
// CommunityWidget
// ─────────────────────────────────────────────
interface CommunityWidgetProps {
  threads: ThreadResponse[];
}

export function CommunityWidget({ threads }: CommunityWidgetProps) {
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-serif-title font-black text-sm m-0 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Community</span>
        </h3>
        <Link
          href="/forum"
          className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline underline-offset-4 active:scale-[0.98] transition-all"
        >
          Forum →
        </Link>
      </div>
      {threads.length > 0 ? (
        <div className="divide-y divide-gray-50 flex-1">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/forum/threads/${t.slug}`}
              className="flex flex-col gap-1 px-5 py-3 hover:bg-gray-50/50 transition-colors"
            >
              <h4 className="text-xs font-bold m-0 leading-snug line-clamp-1 text-[var(--color-text-primary)]">
                {t.title}
              </h4>
              <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-secondary)]">
                <span>@{t.authorUsername}</span>
                <span>•</span>
                <span>{t.replyCount} replies</span>
                <span>•</span>
                <span>{timeAgo(t.lastPostAt || t.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">No discussions yet.</p>
        </div>
      )}
      <Link
        href="/forum"
        className="block text-center py-3 border-t border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
      >
        Join the Conversation
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────
// EditorsPickWidget
// ─────────────────────────────────────────────
interface EditorsPickWidgetProps {
  articles: NewsArticleResponse[];
  getImage: (id: number, content: string) => string;
}

export function EditorsPickWidget({ articles, getImage }: EditorsPickWidgetProps) {
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-serif-title font-black text-sm m-0 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span>Editor&apos;s Pick</span>
        </h3>
        <Link
          href="/news"
          className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline underline-offset-4"
        >
          All →
        </Link>
      </div>
      {articles.length > 0 ? (
        <div className="divide-y divide-gray-50 flex-1">
          {articles.map((art) => (
            <Link
              key={art.id}
              href={`/news/${art.slug}`}
              className="flex gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors items-center"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                <img
                  src={getImage(art.id, art.content)}
                  alt={art.title}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1579952365116-61317f0501cd?q=80&w=800&auto=format&fit=crop";
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <h4 className="text-xs font-bold m-0 leading-snug line-clamp-2 text-[var(--color-text-primary)]">
                  {art.title}
                </h4>
                <span className="text-[9px] text-[var(--color-text-secondary)]">
                  {timeAgo(art.publishedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">More stories coming soon.</p>
        </div>
      )}
      <Link
        href="/news"
        className="block text-center py-3 border-t border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
      >
        Browse All Articles
      </Link>
    </div>
  );
}
