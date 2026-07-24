"use client";

import React from "react";

interface RedditEmbedProps {
  postUrl: string;
  sourceName?: string;
  title?: string;
  summary?: string;
}

export const RedditEmbed: React.FC<RedditEmbedProps> = ({
  postUrl,
  sourceName,
  title,
  summary,
}) => {
  return (
    <div className="card p-6 flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-sm">
      {/* Reddit Header Badge */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2">
          {/* Reddit Orange SVG Logo */}
          <svg className="w-6 h-6 fill-[#FF4500]" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-1.287 3.861 3.861-1.287C8.261 24.314 10.086 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.01 13.5c0 2.485-3.01 4.5-5.01 4.5s-5.01-2.015-5.01-4.5c0-.18.016-.356.046-.528C5.836 12.441 5 11.319 5 10c0-1.657 1.343-3 3-3 .785 0 1.5.302 2.036.797A9.852 9.852 0 0 1 12 7.5a9.852 9.852 0 0 1 1.964.297A2.99 2.99 0 0 1 16 7c1.657 0 3 1.343 3 3 0 1.319-.836 2.441-2.036 2.972.03.172.046.348.046.528z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF4500]">
            Reddit Community Discussion
          </span>
        </div>
        {sourceName && (
          <span className="text-xs font-bold text-[#FF4500] bg-[rgba(255,69,0,0.1)] px-2.5 py-1 rounded-full">
            {sourceName}
          </span>
        )}
      </div>

      {/* Post Content */}
      <div className="flex flex-col gap-2">
        {title && (
          <h3 className="m-0 text-base font-bold leading-snug text-[var(--color-text-primary)]">
            {title}
          </h3>
        )}
        {summary && (
          <p className="m-0 text-sm leading-relaxed text-[var(--color-text-secondary)] font-serif whitespace-pre-line">
            {summary}
          </p>
        )}
      </div>

      {/* Discussion Link */}
      <div className="pt-2 flex justify-end">
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-[#FF4500] px-4 py-2 rounded-xl hover:bg-[#e03d00] transition-colors shadow-sm"
        >
          <span>Join Discussion on Reddit</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};
