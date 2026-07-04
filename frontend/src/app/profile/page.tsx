"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useProfile, useNotifications, useSaveProfile, useMarkNotificationRead, useMarkAllNotificationsRead } from "./_api";

export default function ProfilePage() {
  const auth = useAuthStore((state) => state.auth);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const profile = useProfile(Boolean(auth), (result) => {
    setDisplayName(result.displayName);
    setBio(result.bio ?? "");
  });

  const notifications = useNotifications(Boolean(auth));

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
              save.mutate({ displayName, bio });
            }}
          >
            <h1 className="display-face text-4xl font-black">Profile</h1>
            {profile.isLoading ? <LoadingBlock /> : null}
            {profile.error ? <ErrorBlock message="Could not load profile." /> : null}
            {save.error ? <ErrorBlock message="Could not save profile." /> : null}
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
        </section>
      )}
    </PublicShell>
  );
}
