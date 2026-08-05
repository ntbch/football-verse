"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/shared/lib/analytics";
import { useSetFollowTarget } from "./api";
import type { FollowTarget } from "./types";

const starterTargets: FollowTarget[] = [
  { targetType: "LEAGUE", targetKey: "premier-league", targetName: "Premier League" },
  { targetType: "CLUB", targetKey: "arsenal", targetName: "Arsenal" },
  { targetType: "CLUB", targetKey: "liverpool", targetName: "Liverpool" },
  { targetType: "CLUB", targetKey: "manchester-city", targetName: "Manchester City" },
  { targetType: "CLUB", targetKey: "manchester-united", targetName: "Manchester United" },
];

const normalized = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function FollowingOnboarding({ follows }: { follows: FollowTarget[] }) {
  const setFollow = useSetFollowTarget();
  const [selected, setSelected] = useState(() => new Set(follows.map((follow) => `${follow.targetType}:${normalized(follow.targetKey)}`)));
  const completed = useRef(follows.length >= 3);

  useEffect(() => {
    setSelected(new Set(follows.map((follow) => `${follow.targetType}:${normalized(follow.targetKey)}`)));
  }, [follows]);

  if (follows.length >= 3) return null;

  const toggle = (target: FollowTarget) => {
    const key = `${target.targetType}:${normalized(target.targetKey)}`;
    const following = selected.has(key);
    setFollow.mutate({ ...target, following: !following }, {
      onSuccess: () => {
        setSelected((current) => {
          const next = new Set(current);
          if (following) next.delete(key); else next.add(key);
          if (next.size >= 3 && !completed.current) {
            completed.current = true;
            trackEvent("onboarding_completed");
          }
          return next;
        });
      },
    });
  };

  return (
    <section aria-labelledby="following-onboarding-title" className="mb-4 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-muted)]/20 p-5 sm:p-6">
      <p className="editorial-kicker m-0">Make Home yours</p>
      <h3 id="following-onboarding-title" className="editorial-section-title m-0 mt-1">Choose three teams or competitions</h3>
      <p className="m-0 mt-2 text-sm text-[var(--color-text-secondary)]">Your intelligence feed will prioritise stories about these follows.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {starterTargets.map((target) => {
          const key = `${target.targetType}:${normalized(target.targetKey)}`;
          const active = selected.has(key);
          return <button aria-pressed={active} className={`min-h-11 rounded-full border px-4 text-xs font-bold transition-colors ${active ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-text-inverse)]" : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"}`} disabled={setFollow.isPending} key={key} onClick={() => toggle(target)} type="button">{active ? "Following " : "Follow "}{target.targetName}</button>;
        })}
      </div>
      <p className="m-0 mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{Math.min(selected.size, 3)}/3 selected</p>
    </section>
  );
}
