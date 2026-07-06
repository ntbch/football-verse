"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PublicShell } from "@/shared/components/page-shell";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { ThreadResponse } from "@/shared/lib/types";
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

  // 3. Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (payload: ProfileDetails) =>
      data<ProfileDetails>(http.patch("/users/me/profile", payload)),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: qk.user.profile() });
      setEditMode(false);
      // Sync auth state if username changed
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
      <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-fade-in">
        {/* Banner */}
        <div className="text-center py-6 border-b border-[var(--color-border)]">
          <h1 className="m-0 font-serif font-black text-4xl uppercase tracking-tight text-[var(--color-text-primary)]">
            User Desk
          </h1>
          <p className="mt-2 font-serif italic text-sm text-[var(--color-text-secondary)]">
            Manage your credentials, roles, and followed community topics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start w-full">
          
          {/* Left: Profile Info Form */}
          <div className="w-full flex flex-col gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
              Profile details
            </span>

            <div className="p-5 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-premium">
              {editMode ? (
                <form onSubmit={handleUpdateSubmit} className="w-full">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Username</label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Email</label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
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
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-4 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-all-300"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save details"}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)]">Username</span>
                    <span className="font-serif font-black text-lg text-[var(--color-text-primary)]">
                      @{profile?.username}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)]">Email Address</span>
                    <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                      {profile?.email}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--color-text-secondary)]">Account Roles</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {auth.roles.map((role) => (
                        <span
                          key={role}
                          className="bg-[var(--fv-paper)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full px-4 py-2 rounded-full text-xs font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all-300"
                  >
                    Edit profile details
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Followed threads list */}
          <div className="md:col-span-2 flex flex-col gap-4 w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
              Followed Discussions
            </span>

            {isThreadsLoading ? (
              <LoadingBlock label="Loading followed discussions" />
            ) : followedThreads.length === 0 ? (
              <div className="text-center py-12 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-premium">
                <p className="text-xs text-[var(--color-text-secondary)] font-semibold">You are not following any discussion threads yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {followedThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="p-5 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-premium shadow-premium-hover transition-all-300"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">
                          <span className="font-bold text-[var(--color-accent)] uppercase">
                            {thread.categoryName}
                          </span>
                          <span className="font-bold">•</span>
                          <span className="font-semibold">Posted by @{thread.authorUsername}</span>
                        </div>
                        <Link href={`/forum/threads/${thread.slug}`}>
                          <h4 className="m-0 font-serif font-black text-base hover:text-[var(--color-accent)] cursor-pointer text-[var(--color-text-primary)] transition-all-300">
                            {thread.title}
                          </h4>
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] font-semibold">
                        <span>💬 {thread.replyCount} replies</span>
                        <span>👍 {thread.likes} likes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </PublicShell>
  );
}
