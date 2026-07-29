"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { ThreadResponse } from "@/features/forum/types";
import type { NewsArticleResponse } from "@/features/news/types";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import {
  ProfileDetailsCard,
  ActivityStatsCard,
  FollowedThreadsList,
  BookmarkedArticlesList,
  type ProfileData,
} from "./components";

export default function ProfilePage() {
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [displayNameInput, setDisplayNameInput] = useState("");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"threads" | "bookmarks">("threads");

  const selectTab = (tab: "threads" | "bookmarks") => setActiveTab(tab);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const tabs = ["threads", "bookmarks"] as const;
    const current = tabs.indexOf(activeTab);
    const next = event.key === "ArrowRight" ? tabs[(current + 1) % tabs.length]
      : event.key === "ArrowLeft" ? tabs[(current + tabs.length - 1) % tabs.length]
      : event.key === "Home" ? tabs[0]
      : event.key === "End" ? tabs[tabs.length - 1]
      : null;
    if (!next) return;
    event.preventDefault();
    selectTab(next);
    document.getElementById(`saved-tab-${next}`)?.focus();
  };

  // Redirect to login if user is not authenticated
  React.useEffect(() => {
    if (ready && !auth) {
      router.push("/login");
    }
  }, [auth, ready, router]);

  // 1. Fetch profile details
  const { data: profile, isLoading: isProfileLoading, isError: isProfileError, refetch: refetchProfile } = useQuery({
    queryKey: qk.user.profile(),
    queryFn: () => data<ProfileData>(http.get("/users/me/profile")),
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
  const { data: followedThreads = [], isLoading: isThreadsLoading, isError: isThreadsError, refetch: refetchThreads } = useQuery({
    queryKey: qk.user.followingThreads(),
    queryFn: () => data<ThreadResponse[]>(http.get("/users/me/following-threads")),
    enabled: !!auth,
  });

  // 3. Fetch bookmarked articles
  const { data: bookmarkedArticles = [], isLoading: isBookmarksLoading, isError: isBookmarksError, refetch: refetchBookmarks } = useQuery({
    queryKey: ["user-bookmarks"],
    queryFn: () => data<NewsArticleResponse[]>(http.get("/users/me/bookmarked-articles")),
    enabled: !!auth,
  });

  const { data: notificationPreferences, isLoading: isPreferencesLoading, isError: isPreferencesError, refetch: refetchPreferences } = useQuery({
    queryKey: qk.user.notificationPreferences(),
    queryFn: () => data<{ forumReplies: boolean; predictionScored: boolean }>(http.get("/users/me/notification-preferences")),
    enabled: !!auth,
  });

  // 4. Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (payload: ProfileData) =>
      data<ProfileData>(http.patch("/users/me/profile", payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.profile() });
      setEditMode(false);
      toast({ body: "Profile details updated successfully!", type: "info", autoHideDuration: 3000 });
    },
    onError: (err) => {
      toast({ body: apiErrorMessage(err, "Failed to update profile."), type: "error" });
    },
  });

  const updateNotificationPreferences = useMutation({
    mutationFn: (payload: Partial<{ forumReplies: boolean; predictionScored: boolean }>) =>
      data<{ forumReplies: boolean; predictionScored: boolean }>(http.patch("/users/me/notification-preferences", payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.user.notificationPreferences() }),
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update notification preferences."), type: "error" }),
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

  const handleCancel = () => {
    setEditMode(false);
    if (profile) {
      setDisplayNameInput(profile.displayName || "");
      setAvatarUrlInput(profile.avatarUrl || "");
      setBioInput(profile.bio || "");
    }
  };

  if (!ready || !auth) {
    return (
      <PublicShell>
        <LoadingBlock label={!ready ? "Initializing Session..." : "Redirecting to Login"} />
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

  if (isProfileError) {
    return <PublicShell><ErrorBlock message="Could not load profile." onRetry={() => void refetchProfile()} /></PublicShell>;
  }

  return (
    <PublicShell>
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto animate-fade-in mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          {/* Left: Profile Info Card */}
          <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24">
            <ProfileDetailsCard
              profile={profile}
              editMode={editMode}
              displayNameInput={displayNameInput}
              avatarUrlInput={avatarUrlInput}
              bioInput={bioInput}
              isPending={updateProfileMutation.isPending}
              onDisplayNameChange={setDisplayNameInput}
              onAvatarUrlChange={setAvatarUrlInput}
              onBioChange={setBioInput}
              onEditStart={() => setEditMode(true)}
              onCancel={handleCancel}
              onSubmit={handleUpdateSubmit}
            />
            <ActivityStatsCard
              followedCount={followedThreads.length}
              bookmarkCount={bookmarkedArticles.length}
              roles={auth.roles as string[]}
            />
            <section className="editorial-panel p-4" aria-labelledby="notification-preferences-title">
              <h2 className="m-0 text-sm font-black text-[var(--color-text-primary)]" id="notification-preferences-title">Notification preferences</h2>
              {isPreferencesLoading ? <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">Loading preferences…</p> : isPreferencesError ? <button className="mt-2 min-h-11 text-xs font-bold text-[var(--color-accent)]" onClick={() => void refetchPreferences()} type="button">Retry preferences</button> : (
                <fieldset className="mt-3 grid gap-3" disabled={updateNotificationPreferences.isPending}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[var(--color-text-secondary)]">
                    Forum replies
                    <input aria-label="Forum replies" checked={notificationPreferences?.forumReplies ?? true} className="h-5 w-5 accent-[var(--color-accent)]" onChange={(event) => updateNotificationPreferences.mutate({ forumReplies: event.target.checked })} type="checkbox" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[var(--color-text-secondary)]">
                    Prediction scores
                    <input aria-label="Prediction scores" checked={notificationPreferences?.predictionScored ?? true} className="h-5 w-5 accent-[var(--color-accent)]" onChange={(event) => updateNotificationPreferences.mutate({ predictionScored: event.target.checked })} type="checkbox" />
                  </label>
                </fieldset>
              )}
            </section>
          </aside>

          {/* Right: Tabbed Content */}
          <div className="lg:col-span-2 flex flex-col gap-4 w-full">
            {/* Tab Switcher */}
            <div aria-label="Saved content" className="editorial-panel grid grid-cols-2 gap-1 p-1.5" role="tablist">
              <button
                aria-controls="saved-panel-threads"
                aria-selected={activeTab === "threads"}
                id="saved-tab-threads"
                onClick={() => selectTab("threads")}
                onKeyDown={handleTabKeyDown}
                role="tab"
                tabIndex={activeTab === "threads" ? 0 : -1}
                type="button"
                className={`min-h-11 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                  activeTab === "threads"
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Followed Threads</span>
                <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${activeTab === "threads" ? "bg-white/20" : "bg-[var(--color-surface-hover)]"}`}>{followedThreads.length}</span>
              </button>
              <button
                aria-controls="saved-panel-bookmarks"
                aria-selected={activeTab === "bookmarks"}
                id="saved-tab-bookmarks"
                onClick={() => selectTab("bookmarks")}
                onKeyDown={handleTabKeyDown}
                role="tab"
                tabIndex={activeTab === "bookmarks" ? 0 : -1}
                type="button"
                className={`min-h-11 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                  activeTab === "bookmarks"
                    ? "bg-[var(--color-accent)] text-[var(--color-text-inverse)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>Bookmarked Articles</span>
                <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${activeTab === "bookmarks" ? "bg-white/20" : "bg-[var(--color-surface-hover)]"}`}>{bookmarkedArticles.length}</span>
              </button>
            </div>

            {activeTab === "threads" && (
              <div aria-labelledby="saved-tab-threads" id="saved-panel-threads" role="tabpanel" tabIndex={0}>
                <FollowedThreadsList threads={followedThreads} isLoading={isThreadsLoading} error={isThreadsError} onRetry={() => void refetchThreads()} />
              </div>
            )}
            {activeTab === "bookmarks" && (
              <div aria-labelledby="saved-tab-bookmarks" id="saved-panel-bookmarks" role="tabpanel" tabIndex={0}>
                <BookmarkedArticlesList articles={bookmarkedArticles} isLoading={isBookmarksLoading} error={isBookmarksError} onRetry={() => void refetchBookmarks()} />
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
