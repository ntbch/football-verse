"use client";

import React from "react";
import Link from "next/link";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";

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
