"use client";

import React from "react";
import Link from "next/link";
import type { ForumCategoryResponse, ThreadResponse } from "../types";
import { avatarGrad, getAuthorInitials, getCategoryConfig, timeAgo } from "./forum-shared";

interface CreateThreadModalProps {
  categories: ForumCategoryResponse[];
  targetCategorySlug: string;
  newTitle: string;
  newContent: string;
  newTags: string;
  isPending: boolean;
  onCategoryChange: (slug: string) => void;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onTagsChange: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateThreadModal({
  categories,
  targetCategorySlug,
  newTitle,
  newContent,
  newTags,
  isPending,
  onCategoryChange,
  onTitleChange,
  onContentChange,
  onTagsChange,
  onClose,
  onSubmit,
}: CreateThreadModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-xl bg-white border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-accent)]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 className="m-0 font-serif-title font-black text-lg text-[var(--color-text-primary)]">
              Start a New Thread
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-gray-100 hover:text-[var(--color-accent)] transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Forum Category
              </label>
              <select
                value={targetCategorySlug}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Thread Title
              </label>
              <input
                type="text"
                placeholder="A clear, compelling title..."
                value={newTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Your Post
              </label>
              <textarea
                placeholder="Share your thoughts, analysis, or questions..."
                value={newContent}
                onChange={(e) => onContentChange(e.target.value)}
                rows={6}
                className="w-full bg-white border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Tags
                <span className="ml-1 font-normal normal-case tracking-normal text-[var(--color-text-secondary)]/60">(comma separated)</span>
              </label>
              <input
                type="text"
                placeholder="transfers, arsenal, rumours..."
                value={newTags}
                onChange={(e) => onTagsChange(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)]">
              <p className="text-[9px] text-[var(--color-text-secondary)] italic">
                Be respectful. No spam or offensive content.
              </p>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={onClose} className="btn btn-secondary !px-4 !py-2 !text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary !px-5 !py-2 !text-xs shadow-sm">
                  {isPending ? "Publishing..." : "Publish Thread"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
