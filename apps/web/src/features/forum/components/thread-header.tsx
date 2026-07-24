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
    <>
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
        <h1 className="m-0 font-serif-title text-2xl font-black tracking-tight text-[var(--color-text-primary)] md:text-3xl">
          {thread.title}
        </h1>

        {thread.tags && thread.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {thread.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {canModerate && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 text-[10px] font-bold uppercase shadow-sm">
            <span className="self-center px-2 text-[var(--color-text-secondary)]">Mod Ops:</span>
            <button
              onClick={onTogglePinned}
              className={`rounded-full px-3 py-1 transition-colors ${
                thread.pinned
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200"
              }`}
            >
              {thread.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={onToggleLocked}
              className={`rounded-full px-3 py-1 transition-colors ${
                thread.locked
                  ? "bg-red-50 text-red-600"
                  : "bg-gray-100 text-[var(--color-text-secondary)] hover:bg-gray-200"
              }`}
            >
              {thread.locked ? "Unlock" : "Lock"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
