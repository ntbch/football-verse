"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useProfile, useNotifications, useSaveProfile, useMarkNotificationRead, useMarkAllNotificationsRead, useFollowingThreads } from "./_api";
import { data, http, apiBaseUrl } from "@/shared/lib/api-client";

export default function ProfilePage() {
  const auth = useAuthStore((state) => state.auth);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const profile = useProfile(Boolean(auth), (result) => {
    setDisplayName(result.displayName);
    setBio(result.bio ?? "");
    setAvatarUrl(result.avatarUrl);
  });

  const notifications = useNotifications(Boolean(auth));
  const followingThreads = useFollowingThreads(Boolean(auth));

  const save = useSaveProfile();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const hasUnread = notifications.data?.some((item) => !item.read) ?? false;
  const notificationClass = "block border-l-4 border-[var(--fv-line)] bg-transparent p-3 text-left hover:border-[var(--fv-grass)]";

  return (
    <PublicShell>
      {!auth ? (
        <ErrorBlock message="Login to view your profile." />
      ) : (
        <section className="grid gap-5 md:grid-cols-[420px_1fr]">
          <form
            className="panel touchline p-5"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate({ displayName, bio, avatarUrl });
            }}
          >
            <h1 className="display-face text-4xl font-black">Profile</h1>
            {profile.isLoading ? <LoadingBlock /> : null}
            {profile.error ? <ErrorBlock message="Could not load profile." /> : null}
            {save.error ? <ErrorBlock message="Could not save profile." /> : null}

            {/* Avatar upload */}
            <div className="my-5 flex flex-col items-center gap-3">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-white/20 bg-white/5">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl.startsWith("http") ? avatarUrl : `${apiBaseUrl}${avatarUrl}`}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--fv-clay, #d97706)] text-4xl font-black text-white uppercase">
                    {displayName.slice(0, 2) || "U"}
                  </div>
                )}
              </div>
              <label className="btn btn-secondary cursor-pointer text-sm">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await data<{ url: string }>(
                        http.post("/uploads", formData, {
                          headers: { "Content-Type": "multipart/form-data" }
                        })
                      );
                      setAvatarUrl(res.url);
                    } catch (err) {
                      alert("Failed to upload image. Please try again.");
                    }
                  }}
                />
              </label>
            </div>

            <label className="mt-4 grid gap-1 font-bold">
              Display name
              <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label className="mt-3 grid gap-1 font-bold">
              Bio
              <textarea className="input min-h-28" value={bio} onChange={(event) => setBio(event.target.value)} />
            </label>
            <button className="btn mt-4" disabled={save.isPending || !displayName.trim()}>
              {save.isPending ? "Saving..." : "Save profile"}
            </button>
          </form>

          <div className="grid gap-5">
            <div className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="display-face text-3xl font-black">Notifications</h2>
                <button className="btn btn-secondary" disabled={!hasUnread || markAllRead.isPending} onClick={() => markAllRead.mutate()}>
                  Mark all read
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {notifications.isLoading ? <LoadingBlock label="Loading notifications" /> : null}
                {notifications.error ? <ErrorBlock message="Could not load notifications." /> : null}
                {markRead.error || markAllRead.error ? <ErrorBlock message="Could not update notifications." /> : null}
                {notifications.data?.length === 0 ? <p>No notifications yet.</p> : null}
                {notifications.data?.map((item) => item.linkUrl ? (
                  <Link className={notificationClass} href={item.linkUrl} key={item.id} onClick={() => markRead.mutate(item.id)}>
                    <span className="block font-bold">{item.message}</span>
                    <span className="text-xs uppercase text-[var(--fv-muted)]">{item.read ? "read" : "new"} / {item.type}</span>
                  </Link>
                ) : (
                  <button className={notificationClass} key={item.id} onClick={() => markRead.mutate(item.id)}>
                    <span className="block font-bold">{item.message}</span>
                    <span className="text-xs uppercase text-[var(--fv-muted)]">{item.read ? "read" : "new"} / {item.type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="display-face text-3xl font-black">Following threads</h2>
              <div className="mt-4 grid gap-3">
                {followingThreads.isLoading ? <LoadingBlock label="Loading followed threads" /> : null}
                {followingThreads.error ? <ErrorBlock message="Could not load followed threads." /> : null}
                {followingThreads.data?.length === 0 ? <p>No followed threads yet.</p> : null}
                {followingThreads.data?.map((thread) => (
                  <Link className={notificationClass} href={`/forum/threads/${thread.slug}`} key={thread.id}>
                    <span className="block font-bold">{thread.title}</span>
                    <span suppressHydrationWarning className="text-xs uppercase text-[var(--fv-muted)]">
                      {thread.solved ? "solved" : "open"} / {thread.replyCount} replies / {new Date(thread.lastActivityAt).toLocaleDateString("en-US")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </PublicShell>
  );
}
