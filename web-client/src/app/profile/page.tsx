"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { ThreadResponse, NewsArticleResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import {
  ProfileDetailsCard,
  ActivityStatsCard,
  FollowedThreadsList,
  BookmarkedArticlesList,
  type ProfileData,
} from "./_components";

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

            {activeTab === "threads" && (
              <FollowedThreadsList threads={followedThreads} isLoading={isThreadsLoading} />
            )}
            {activeTab === "bookmarks" && (
              <BookmarkedArticlesList articles={bookmarkedArticles} isLoading={isBookmarksLoading} />
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
