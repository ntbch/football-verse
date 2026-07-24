"use client";

import React, { useEffect } from "react";

interface XEmbedProps {
  tweetUrl: string;
  authorName?: string;
  title?: string;
  summary?: string;
}

export const XEmbed: React.FC<XEmbedProps> = ({
  tweetUrl,
  authorName,
  title,
  summary,
}) => {
  useEffect(() => {
    // Load official X widgets script if not already present
    if (typeof window !== "undefined" && !(window as any).twttr) {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="card p-6 flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-sm">
      {/* X Header Badge */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2">
          {/* X / Twitter SVG Logo */}
          <svg className="w-5 h-5 fill-current text-[var(--color-text-primary)]" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Post on X (Twitter)
          </span>
        </div>
        {authorName && (
          <span className="text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent-subtle,rgba(59,130,246,0.1))] px-2.5 py-1 rounded-full">
            {authorName}
          </span>
        )}
      </div>

      {/* Tweet Body Content */}
      <div className="flex flex-col gap-2">
        {title && (
          <h3 className="m-0 text-base font-bold leading-snug text-[var(--color-text-primary)]">
            {title}
          </h3>
        )}
        {summary && (
          <p className="m-0 text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-line font-serif">
            {summary}
          </p>
        )}
      </div>

      {/* Link to view on X */}
      <div className="pt-2 flex justify-end">
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-black dark:bg-white dark:text-black px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          <span>View on X</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};
