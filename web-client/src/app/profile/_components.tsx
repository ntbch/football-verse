"use client";

import React from "react";
import Link from "next/link";
import type { ThreadResponse, NewsArticleResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";

// ─────────────────────────────────────────────
// ProfileDetails (view & edit card)
// ─────────────────────────────────────────────
export type ProfileData = {
  displayName: string;
  avatarUrl: string;
  bio: string;
};

interface ProfileDetailsCardProps {
  profile: ProfileData | undefined;
  editMode: boolean;
  displayNameInput: string;
  avatarUrlInput: string;
  bioInput: string;
  isPending: boolean;
  onDisplayNameChange: (v: string) => void;
  onAvatarUrlChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onEditStart: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProfileDetailsCard({
  profile,
  editMode,
  displayNameInput,
  avatarUrlInput,
  bioInput,
  isPending,
  onDisplayNameChange,
  onAvatarUrlChange,
  onBioChange,
  onEditStart,
  onCancel,
  onSubmit,
}: ProfileDetailsCardProps) {
  const auth = useAuthStore((s) => s.auth);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
        <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile Details
        </h3>
      </div>

      {editMode ? (
        <form onSubmit={onSubmit} className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Display Name
              </label>
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder="e.g. John Doe"
                className="input text-xs font-semibold"
                maxLength={80}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Avatar URL
              </label>
              <input
                type="url"
                value={avatarUrlInput}
                onChange={(e) => onAvatarUrlChange(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="input text-xs font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Bio / Biography
                </label>
                <span className="text-[9px] text-[var(--color-text-secondary)] font-mono">
                  {bioInput.length}/500
                </span>
              </div>
              <textarea
                value={bioInput}
                onChange={(e) => onBioChange(e.target.value)}
                placeholder="Tell the community about yourself..."
                className="input text-xs font-semibold resize-none"
                rows={4}
                maxLength={500}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary flex-1 !py-2 !text-xs active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary flex-1 !py-2 !text-xs active:scale-[0.98] transition-all"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-5 flex flex-col gap-4">
          {/* Avatar & Identifiers */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="relative w-20 h-20">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || auth?.username}
                  className="w-20 h-20 rounded-full object-cover border border-[var(--color-border)] shadow-md"
                  onError={(e) => {
                    (e.currentTarget).style.display = "none";
                    const fallback = document.getElementById("avatar-fallback");
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <span
                id="avatar-fallback"
                style={{ display: profile?.avatarUrl ? "none" : "flex" }}
                className="w-20 h-20 rounded-full bg-[var(--color-accent)] flex items-center justify-center font-serif-title font-black text-3xl text-white shadow-md"
              >
                {(profile?.displayName || auth?.username)?.[0]?.toUpperCase() || "?"}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <h2 className="m-0 font-serif-title font-black text-lg text-[var(--color-text-primary)]">
                {profile?.displayName || "Anonymous Fans"}
              </h2>
              <p className="m-0 text-xs text-[var(--color-text-secondary)] font-semibold">
                @{auth?.username}
              </p>
              <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">{auth?.email}</p>
            </div>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-[var(--color-border)]">
            <span className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)] tracking-wider">
              Bio
            </span>
            <p className="m-0 text-xs text-[var(--color-text-primary)] leading-relaxed italic">
              {profile?.bio || "No biography provided yet. Edit profile to share your football passion!"}
            </p>
          </div>

          {/* Roles */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-[var(--color-border)]">
            <span className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)] tracking-wider">
              Account Roles
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {auth?.roles.map((role) => (
                <span
                  key={role}
                  className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={onEditStart}
            className="btn btn-secondary w-full active:scale-[0.98] transition-all"
          >
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ActivityStatsCard
// ─────────────────────────────────────────────
interface ActivityStatsCardProps {
  followedCount: number;
  bookmarkCount: number;
  roles: string[];
}

export function ActivityStatsCard({ followedCount, bookmarkCount, roles }: ActivityStatsCardProps) {
  const accountType = roles.includes("ADMIN" as never)
    ? "Admin"
    : roles.includes("MODERATOR" as never)
    ? "Moderator"
    : "Member";

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
        <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          <span>Activity</span>
        </h3>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">Followed Threads</span>
          <span className="font-black text-[var(--color-accent)] tabular-nums">{followedCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">Bookmarked Articles</span>
          <span className="font-black tabular-nums">{bookmarkCount}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-secondary)] font-medium">Account Type</span>
          <span className="font-black tabular-nums">{accountType}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FollowedThreadsList
// ─────────────────────────────────────────────
interface FollowedThreadsListProps {
  threads: ThreadResponse[];
  isLoading: boolean;
}

export function FollowedThreadsList({ threads, isLoading }: FollowedThreadsListProps) {
  if (isLoading) return <LoadingBlock label="Loading followed discussions" />;

  if (threads.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
        <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
          No Followed Threads
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          You haven&apos;t followed any discussion threads yet.
        </p>
        <Link href="/forum" className="text-xs font-bold text-[var(--color-accent)] hover:underline uppercase">
          Browse Forum →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {threads.map((thread) => (
        <div
          key={thread.id}
          className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
        >
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
                <span className="text-[var(--color-accent)] uppercase">{thread.categoryName}</span>
                <span>·</span>
                <span>by @{thread.authorUsername}</span>
              </div>
              <Link href={`/forum/threads/${thread.slug}`}>
                <h4 className="m-0 font-serif-title font-black text-base text-[var(--color-text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors leading-snug">
                  {thread.title}
                </h4>
              </Link>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] font-bold shrink-0">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{thread.replyCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                <span>{thread.likes}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// BookmarkedArticlesList
// ─────────────────────────────────────────────
interface BookmarkedArticlesListProps {
  articles: NewsArticleResponse[];
  isLoading: boolean;
}

export function BookmarkedArticlesList({ articles, isLoading }: BookmarkedArticlesListProps) {
  if (isLoading) return <LoadingBlock label="Loading bookmarked articles" />;

  if (articles.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
        <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
          No Bookmarks
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          You haven&apos;t bookmarked any articles yet.
        </p>
        <Link href="/news" className="text-xs font-bold text-[var(--color-accent)] hover:underline uppercase">
          Browse News →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {articles.map((art) => (
        <div
          key={art.id}
          className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
              <span className="text-[var(--color-accent)] uppercase">{art.category || "News"}</span>
              <span>·</span>
              <span>
                {new Date(art.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <Link href={`/news/${art.slug}`}>
              <h4 className="m-0 font-serif-title font-black text-base text-[var(--color-text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors leading-snug">
                {art.title}
              </h4>
            </Link>
            {art.summary && (
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed m-0">
                {art.summary}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] font-bold mt-1">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                <span>{art.likes}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>{art.bookmarks}</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
