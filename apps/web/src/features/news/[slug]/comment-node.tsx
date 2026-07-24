"use client";

import type { CommentResponse } from "../types";

export const CommentNode = ({
  comment,
  depth = 0,
  replyTargetId,
  replyText,
  isSubmittingReply,
  onLikeComment,
  onReplyTargetChange,
  onReplyTextChange,
  onReplySubmit,
}: {
  comment: CommentResponse;
  depth?: number;
  replyTargetId: number | null;
  replyText: string;
  isSubmittingReply: boolean;
  onLikeComment: (id: number) => void;
  onReplyTargetChange: (id: number | null) => void;
  onReplyTextChange: (v: string) => void;
  onReplySubmit: (parentId: number) => void;
}) => {
  const isReplying = replyTargetId === comment.id;

  return (
    <div className="w-full flex flex-col pt-4 border-l border-[var(--color-border)] pl-4 ml-1 md:ml-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--color-text-primary)]">{comment.username}</span>
          <span className="text-[var(--color-text-secondary)] font-semibold">
            {new Date(comment.publishedAt).toLocaleDateString()}
          </span>
        </div>

        <p className="text-xs md:text-sm text-[var(--color-text-primary)] leading-relaxed font-medium">
          {comment.content}
        </p>

        <div className="flex items-center gap-3 text-xs font-semibold pt-1">
          <button
            onClick={() => onLikeComment(comment.id)}
            className={`hover:opacity-85 flex items-center gap-1.5 transition-all active:scale-[0.98] ${
              comment.liked ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
            </svg>
            <span>{comment.likes}</span>
          </button>
          <button
            onClick={() => {
              if (isReplying) {
                onReplyTargetChange(null);
                onReplyTextChange("");
              } else {
                onReplyTargetChange(comment.id);
                onReplyTextChange("");
              }
            }}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-all active:scale-[0.98]"
          >
            {isReplying ? "Cancel" : "Reply"}
          </button>
        </div>

        {/* Inline Reply Form */}
        {isReplying && (
          <div className="flex flex-col gap-2 mt-2 pl-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              placeholder={`Reply to ${comment.username}...`}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => onReplySubmit(comment.id)}
                disabled={isSubmittingReply}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {isSubmittingReply
                  ? "Submitting..."
                  : "Submit Reply"}
              </button>
              <button
                onClick={() => {
                  onReplyTargetChange(null);
                  onReplyTextChange("");
                }}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-black/5 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 w-full">
            {comment.replies.map((reply) => (
              <CommentNode
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                replyTargetId={replyTargetId}
                replyText={replyText}
                isSubmittingReply={isSubmittingReply}
                onLikeComment={onLikeComment}
                onReplyTargetChange={onReplyTargetChange}
                onReplyTextChange={onReplyTextChange}
                onReplySubmit={onReplySubmit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
