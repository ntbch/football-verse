"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { ThreadResponse, NewsArticleResponse, PageResponse } from "@/shared/lib/types";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

type ProfileDetails = {
  username: string;
  email: string;
};

export default function ProfilePage() {
  const auth = useAuthStore((state) => state.auth);
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [usernameInput, setUsernameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
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
      setUsernameInput(profile.username);
      setEmailInput(profile.email);
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
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: qk.user.profile() });
      setEditMode(false);
      if (auth) {
        useAuthStore.setState({
          auth: { ...auth, username: updated.username, email: updated.email },
        });
      }
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
    if (!usernameInput.trim() || !emailInput.trim()) {
      toast({ body: "Username and email cannot be blank.", type: "error" });
      return;
    }
    updateProfileMutation.mutate({
      username: usernameInput.trim(),
      email: emailInput.trim(),
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
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto animate-fade-in">
        {/* Banner */}
        <div className="text-center py-6 border-b border-[var(--color-border)]">
          <h1 className="m-0 font-serif font-black text-4xl uppercase tracking-tight text-[var(--color-text-primary)]">
            User Desk
          </h1>
          <p className="mt-2 font-serif italic text-sm text-[var(--color-text-secondary)]">
            manage your credentials, track your activity, and view saved content
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">

          {/* Left: Profile Info Card — sticky */}
          <aside className="lg:col-span-1 flex flex-col gap-4 lg:sticky lg:top-24">
            {/* Profile Details Card */}
            <div className="rounded-2xl bg-white border border-[var(--color-border)] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="font-serif font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                  👤 Profile Details
                </h3>
              </div>

              {editMode ? (
                <form onSubmit={handleUpdateSubmit} className="p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Username</label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Email</label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fv-clay)]/30"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false);
                          if (profile) {
                            setUsernameInput(profile.username);
                            setEmailInput(profile.email);
                          }
                        }}
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase bg-[var(--fv-clay)] text-white hover:opacity-90 disabled:opacity-50 transition-all duration-200"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-5 flex flex-col gap-4">
                  {/* Avatar */}
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-full bg-[var(--fv-clay)] flex items-center justify-center font-serif font-black text-xl text-white shadow-sm">
                      {profile?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                    <div>
                      <p className="m-0 font-serif font-black text-lg text-[var(--color-text-primary)]">
                        @{profile?.username}
                      </p>
                      <p className="m-0 text-xs text-[var(--color-text-secondary)]">
                        {profile?.email}
                      </p>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)] tracking-wider">Account Roles</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {auth.roles.map((role) => (
                        <span
                          key={role}
                          className="bg-gray-100 border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats Card */}
            <div className="rounded-2xl bg-white border border-[var(--color-border)] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--color-border)] bg-gray-50/50">
                <h3 className="font-serif font-black text-sm m-0 uppercase tracking-wider text-[var(--color-text-primary)] flex items-center gap-1.5">
                  📊 Activity
                </h3>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">Followed Threads</span>
                  <span className="font-black text-[var(--fv-clay)] tabular-nums">{followedThreads.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">Bookmarked Articles</span>
                  <span className="font-black tabular-nums">{bookmarkedArticles.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)] font-medium">Account Type</span>
                  <span className="font-black tabular-nums">{auth.roles.includes("ADMIN" as any) ? "Admin" : auth.roles.includes("MODERATOR" as any) ? "Moderator" : "Member"}</span>
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
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === "threads"
                    ? "bg-[var(--fv-clay)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-gray-50"
                }`}
              >
                💬 Followed Threads
              </button>
              <button
                onClick={() => setActiveTab("bookmarks")}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === "bookmarks"
                    ? "bg-[var(--fv-clay)] text-white shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-gray-50"
                }`}
              >
                🔖 Bookmarked Articles
              </button>
            </div>

            {/* Followed Threads Tab */}
            {activeTab === "threads" && (
              <>
                {isThreadsLoading ? (
                  <LoadingBlock label="Loading followed discussions" />
                ) : followedThreads.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
                    <h3 className="m-0 font-serif font-black text-xl text-[var(--color-text-primary)]">No Followed Threads</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">You haven&apos;t followed any discussion threads yet.</p>
                    <Link href="/forum" className="text-xs font-bold text-[var(--fv-clay)] hover:underline uppercase">
                      Browse Forum →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {followedThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--fv-clay)]/30 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
                              <span className="text-[var(--fv-clay)] uppercase">{thread.categoryName}</span>
                              <span>·</span>
                              <span>by @{thread.authorUsername}</span>
                            </div>
                            <Link href={`/forum/threads/${thread.slug}`}>
                              <h4 className="m-0 font-serif font-black text-base text-[var(--color-text-primary)] hover:text-[var(--fv-clay)] cursor-pointer transition-colors duration-200 leading-snug">
                                {thread.title}
                              </h4>
                            </Link>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] font-bold shrink-0">
                            <span>💬 {thread.replyCount}</span>
                            <span>👍 {thread.likes}</span>
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
                    <h3 className="m-0 font-serif font-black text-xl text-[var(--color-text-primary)]">No Bookmarks</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">You haven&apos;t bookmarked any articles yet.</p>
                    <Link href="/news" className="text-xs font-bold text-[var(--fv-clay)] hover:underline uppercase">
                      Browse News →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {bookmarkedArticles.map((art) => (
                      <div
                        key={art.id}
                        className="p-5 border border-[var(--color-border)] bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-[var(--fv-clay)]/30 transition-all duration-200"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] font-bold">
                            <span className="text-[var(--fv-clay)] uppercase">{art.category || "News"}</span>
                            <span>·</span>
                            <span>{new Date(art.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                          <Link href={`/news/${art.slug}`}>
                            <h4 className="m-0 font-serif font-black text-base text-[var(--color-text-primary)] hover:text-[var(--fv-clay)] cursor-pointer transition-colors duration-200 leading-snug">
                              {art.title}
                            </h4>
                          </Link>
                          {art.summary && (
                            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed m-0">
                              {art.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] font-bold mt-1">
                            <span>👍 {art.likes}</span>
                            <span>🔖 {art.bookmarks}</span>
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
