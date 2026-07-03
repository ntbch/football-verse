"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { NotificationItem } from "@/shared/lib/types";

type Profile = {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
};

export default function ProfilePage() {
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const result = await data<Profile>(http.get("/users/me/profile"));
      setDisplayName(result.displayName);
      setBio(result.bio ?? "");
      return result;
    },
    enabled: Boolean(auth)
  });

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => data<NotificationItem[]>(http.get("/notifications")),
    enabled: Boolean(auth)
  });

  const save = useMutation({
    mutationFn: () => data<Profile>(http.patch("/users/me/profile", { displayName, bio })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] })
  });

  const markRead = useMutation({
    mutationFn: (id: number) => data<NotificationItem>(http.patch(`/notifications/${id}/read`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

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
              save.mutate();
            }}
          >
            <h1 className="display-face text-4xl font-black">Profile</h1>
            {profile.isLoading ? <LoadingBlock /> : null}
            <label className="mt-4 grid gap-1 font-bold">
              Display name
              <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label className="mt-3 grid gap-1 font-bold">
              Bio
              <textarea className="input min-h-28" value={bio} onChange={(event) => setBio(event.target.value)} />
            </label>
            <button className="btn mt-4" disabled={save.isPending}>Save profile</button>
          </form>

          <div className="panel p-5">
            <h2 className="display-face text-3xl font-black">Notifications</h2>
            <div className="mt-4 grid gap-3">
              {notifications.data?.length === 0 ? <p>No notifications yet.</p> : null}
              {notifications.data?.map((item) => (
                <button
                  className="border-l-4 border-[var(--fv-line)] bg-transparent p-3 text-left hover:border-[var(--fv-grass)]"
                  key={item.id}
                  onClick={() => markRead.mutate(item.id)}
                >
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
