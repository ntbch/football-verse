import Link from "next/link";
import type { ThreadResponse } from "../types";

type ThreadHeaderProps = {
  thread: ThreadResponse;
  canModerate: boolean;
  onTogglePinned: () => void;
  onToggleLocked: () => void;
};

export function ThreadHeader({
  thread,
  canModerate,
  onTogglePinned,
  onToggleLocked,
}: ThreadHeaderProps) {
  return (
    <header className="editorial-panel p-6 md:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 text-xs">
        <Link
          href="/forum"
          className="font-bold text-[var(--color-accent)] transition-colors hover:underline"
        >
          ← Category: {thread.categoryName}
        </Link>
        <div className="flex items-center gap-3 font-semibold text-[var(--color-text-secondary)]">
          <span>Views: {thread.viewCount}</span>
          <span>Replies: {thread.replyCount}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="editorial-kicker m-0">Community discussion</p>
        <h1 className="m-0 font-serif-title text-3xl font-black tracking-tight text-[var(--color-text-primary)] md:text-4xl leading-[1.1]">
          {thread.title}
        </h1>

        {thread.tags && thread.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {canModerate && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] p-3 text-[10px] font-bold uppercase shadow-sm">
            <span className="self-center px-2 text-[var(--color-text-secondary)]">Mod Ops:</span>
            <button
              onClick={onTogglePinned}
              className={`rounded-full px-3 py-1 transition-colors ${
                thread.pinned
                  ? "bg-amber-100 text-amber-700"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {thread.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={onToggleLocked}
              className={`rounded-full px-3 py-1 transition-colors ${
                thread.locked
                  ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {thread.locked ? "Unlock" : "Lock"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
