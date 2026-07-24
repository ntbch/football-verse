import { MentionRenderer } from "@/shared/components/MentionRenderer";
import type { PostResponse, ThreadResponse } from "../types";

type ThreadPostListProps = {
  thread: ThreadResponse;
  posts: PostResponse[];
  currentUsername?: string;
  canModerate: boolean;
  onReport: (postId: number) => void;
  onToggleHidden: (post: PostResponse) => void;
  onToggleLiked: (postId: number) => void;
  onMarkBestAnswer: (postId: number) => void;
  onClearBestAnswer: () => void;
};

export function ThreadPostList({
  thread,
  posts,
  currentUsername,
  canModerate,
  onReport,
  onToggleHidden,
  onToggleLiked,
  onMarkBestAnswer,
  onClearBestAnswer,
}: ThreadPostListProps) {
  const isThreadOwner = currentUsername === thread.authorUsername;

  return (
    <div className="mt-2 flex flex-col gap-4">
      {posts.map((post, index) => {
        const isBestAnswer = Boolean(post.bestAnswer);
        return (
          <article
            key={post.id}
            className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 ${
              isBestAnswer ? "border-green-400 bg-green-50/30" : "border-[var(--color-border)]"
            }`}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[var(--color-text-primary)]">@{post.author}</span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  {index === 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-slate-300" /> OP
                    </span>
                  )}
                  {isBestAnswer && (
                    <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-green-700 shadow-sm">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-green-500" /> Best Answer
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReport(post.id)}
                    className="flex items-center gap-1 font-bold text-[var(--color-text-secondary)] transition-all hover:text-red-500 active:scale-[0.98]"
                  >
                    <span aria-hidden="true">⚠</span> Report
                  </button>
                  {canModerate && (
                    <button
                      onClick={() => onToggleHidden(post)}
                      className="ml-2 font-bold text-[var(--color-text-secondary)] transition-all hover:text-orange-500 active:scale-[0.98]"
                    >
                      {post.hidden ? "Unhide" : "Hide"}
                    </button>
                  )}
                </div>
              </div>

              {post.hidden ? (
                <span className="py-2 text-xs font-medium italic text-[var(--color-text-secondary)]">
                  [This post was hidden by a moderator.]
                </span>
              ) : (
                <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--color-text-primary)]">
                  <MentionRenderer content={post.content} />
                </div>
              )}

              <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-2">
                <button
                  onClick={() => onToggleLiked(post.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-all hover:opacity-85 active:scale-[0.98] ${
                    post.liked ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  <span aria-hidden="true">♡</span> {post.likeCount}
                </button>

                {index > 0 && isThreadOwner && !thread.locked && (
                  <button
                    onClick={isBestAnswer ? onClearBestAnswer : () => onMarkBestAnswer(post.id)}
                    className={`text-xs font-bold transition-all hover:underline active:scale-[0.98] ${
                      isBestAnswer ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {isBestAnswer ? "Unmark Best Answer" : "Mark as Best Answer"}
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
