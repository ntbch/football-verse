"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { ThreadResponse, NewsArticleResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

type ProfileDetails = {
  displayName: string;
  avatarUrl: string;
  bio: string;
};

export default function ProfilePage() {
  const auth = useAuthStore((state) => state.auth);
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [displayNameInput, setDisplayNameInput] = useState("");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"threads" | "bookmarks">("threads");

  // Redirect to login if user is not authenticated
  React.useEffect(() => {
    if (!auth) {
      router.push("/login");
    }
  }, [auth, router]);

  // 1. Fetch profile details
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: qk.user.profile(),
    queryFn: () => data<ProfileDetails>(http.get("/users/me/profile")),
    enabled: !!auth,
  });

  // Sync state with fetched details
  React.useEffect(() => {
    if (profile) {
      setDisplayNameInput(profile.displayName || "");
      setAvatarUrlInput(profile.avatarUrl || "");
      setBioInput(profile.bio || "");
    }
  }, [profile]);

  // 2. Fetch followed threads
  const { data: followedThreads = [], isLoading: isThreadsLoading } = useQuery({
    queryKey: qk.user.followingThreads(),
    queryFn: () => data<ThreadResponse[]>(http.get("/users/me/following-threads")),
    enabled: !!auth,
  });

  // 3. Fetch bookmarked articles
  const { data: bookmarkedArticles = [], isLoading: isBookmarksLoading } = useQuery({
    queryKey: ["user-bookmarks"],
    queryFn: () => data<NewsArticleResponse[]>(http.get("/users/me/bookmarked-articles")),
    enabled: !!auth,
  });

  // 4. Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (payload: ProfileDetails) =>
      data<ProfileDetails>(http.patch("/users/me/profile", payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.profile() });
      setEditMode(false);
      toast({
        body: "Profile details updated successfully!",
        type: "info",
        autoHideDuration: 3000,
      });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to update profile."),
        type: "error",
      });
    },
  });

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) {
      toast({ body: "Display name cannot be blank.", type: "error" });
      return;
    }
    updateProfileMutation.mutate({
      displayName: displayNameInput.trim(),
      avatarUrl: avatarUrlInput.trim(),
      bio: bioInput.trim(),
    });
  };

  if (!auth) {
    return (
      <PublicShell>
        <LoadingBlock label="Redirecting to Login" />
      </PublicShell>
    );
  }

  if (isProfileLoading) {
    return (
      <PublicShell>
        <LoadingBlock label="Retrieving Profile" />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto animate-fade-in mt-4">
        {/* Banner */}
        <div className="text-center py-6 border-b border-[var(--color-border)]">
          <h1 className="m-0 font-serif-title font-black text-4xl uppercase tracking-tight text-[var(--color-text-primary)]">
            User Desk
          </h1>
          <p className="mt-2 font-serif italic text-sm text-[var(--color-text-secondary)]">
            manage your credentials, track your activity, and view saved content
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          {/* Left: Profile Info Card */}
          <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24">
            {/* Profile Details Card */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="font-serif-title font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                  👤 Profile Details
                </h3>
              </div>

              {editMode ? (
                <form onSubmit={handleUpdateSubmit} className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
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
                        onChange={(e) => setAvatarUrlInput(e.target.value)}
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
                        onChange={(e) => setBioInput(e.target.value)}
                        placeholder="Tell the community about yourself..."
                        className="input text-xs font-semibold resize-none"
                        rows={4}
                        maxLength={500}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false);
                          if (profile) {
                            setDisplayNameInput(profile.displayName || "");
                            setAvatarUrlInput(profile.avatarUrl || "");
                            setBioInput(profile.bio || "");
                          }
                        }}
                        className="btn btn-secondary flex-1 !py-2 !text-xs active:scale-[0.98] transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="btn btn-primary flex-1 !py-2 !text-xs active:scale-[0.98] transition-all"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save"}
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
                          alt={profile.displayName || auth.username}
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
                        {(profile?.displayName || auth.username)?.[0]?.toUpperCase() || "?"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <h2 className="m-0 font-serif-title font-black text-lg text-[var(--color-text-primary)]">
                        {profile?.displayName || "Anonymous Fans"}
                      </h2>
                      <p className="m-0 text-xs text-[var(--color-text-secondary)] font-semibold">
                        @{auth.username}
                      </p>
                      <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">
                        {auth.email}
                      </p>
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
                      {auth.roles.map((role) => (
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
                    onClick={() => setEditMode(true)}
                    className="btn btn-secondary w-full active:scale-[0.98] transition-all"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats Card */}
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
                  <span className="font-black text-[var(--color-accent)] tabular-nums">
                    {followedThreads.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">
                    Bookmarked Articles
                  </span>
                  <span className="font-black tabular-nums">{bookmarkedArticles.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">Account Type</span>
                  <span className="font-black tabular-nums">
                    {auth.roles.includes("ADMIN" as any)
                      ? "Admin"
                      : auth.roles.includes("MODERATOR" as any)
                        ? "Moderator"
                        : "Member"}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right: Tabbed Content */}
          <div className="lg:col-span-2 flex flex-col gap-4 w-full">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-white border border-[var(--color-border)] rounded-2xl p-1 shadow-sm">
              <button
                onClick={() => setActiveTab("threads")}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                  activeTab === "threads"
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-gray-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Followed Threads</span>
              </button>
              <button
                onClick={() => setActiveTab("bookmarks")}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                  activeTab === "bookmarks"
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-gray-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Bookmarked Articles</span>
              </button>
            </div>

            {/* Followed Threads Tab */}
            {activeTab === "threads" && (
              <>
                {isThreadsLoading ? (
                  <LoadingBlock label="Loading followed discussions" />
                ) : followedThreads.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
                    <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
                      No Followed Threads
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      You haven&apos;t followed any discussion threads yet.
                    </p>
                    <Link
                      href="/forum"
                      className="text-xs font-bold text-[var(--color-accent)] hover:underline uppercase"
                    >
                      Browse Forum →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {followedThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
                              <span className="text-[var(--color-accent)] uppercase">
                                {thread.categoryName}
                              </span>
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
                              <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>{thread.replyCount}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                              </svg>
                              <span>{thread.likes}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Bookmarked Articles Tab */}
            {activeTab === "bookmarks" && (
              <>
                {isBookmarksLoading ? (
                  <LoadingBlock label="Loading bookmarked articles" />
                ) : bookmarkedArticles.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
                    <h3 className="m-0 font-serif-title font-black text-xl text-[var(--color-text-primary)]">
                      No Bookmarks
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      You haven&apos;t bookmarked any articles yet.
                    </p>
                    <Link
                      href="/news"
                      className="text-xs font-bold text-[var(--color-accent)] hover:underline uppercase"
                    >
                      Browse News →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {bookmarkedArticles.map((art) => (
                      <div
                        key={art.id}
                        className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--color-accent)]/30 transition-all duration-200"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
                            <span className="text-[var(--color-accent)] uppercase">
                              {art.category || "News"}
                            </span>
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
                              <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                              </svg>
                              <span>{art.likes}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              <span>{art.bookmarks}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
