"use client";

import Link from "next/link";
import { useSetFollowTarget } from "./api";
import type { FollowTarget } from "./types";

export function FollowTargetButton({ target, follows, loginHref }: { target: FollowTarget; follows: FollowTarget[]; loginHref?: string }) {
  const setFollow = useSetFollowTarget();
  if (loginHref) return <Link className="min-h-11 rounded-full border border-[var(--color-border)] px-4 text-xs font-bold text-[var(--color-accent)] inline-flex items-center" href={loginHref}>Login to follow</Link>;

  const targetKey = target.targetKey.trim().toLowerCase().replace(/\s+/g, " ");
  const following = follows.some((follow) => follow.targetType === target.targetType && follow.targetKey === targetKey);
  return (
    <button
      aria-pressed={following}
      className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${following ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"}`}
      disabled={setFollow.isPending}
      onClick={() => setFollow.mutate({ ...target, following: !following })}
      type="button"
    >
      {following ? `Following ${target.targetName}` : `Follow ${target.targetName}`}
    </button>
  );
}
