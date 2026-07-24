"use client";

import React from "react";

interface YouTubeEmbedProps {
  videoUrl: string;
  sourceName?: string;
  title?: string;
  summary?: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoUrl,
  sourceName,
  title,
  summary,
}) => {
  // Extract YouTube Video ID from URL (e.g. watch?v=videoId or embed/videoId)
  const videoIdMatch = videoUrl.match(/(?:v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  return (
    <div className="card p-6 flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-sm">
      {/* YouTube Header Badge */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2">
          {/* YouTube Red SVG Logo */}
          <svg className="w-6 h-6 fill-[#FF0000]" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF0000]">
            Match Highlights Video
          </span>
        </div>
        {sourceName && (
          <span className="text-xs font-bold text-[#FF0000] bg-[rgba(255,0,0,0.1)] px-2.5 py-1 rounded-full">
            {sourceName}
          </span>
        )}
      </div>

      {/* Embedded YouTube iFrame Video Player */}
      {videoId ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`}
            title={title || "YouTube Match Highlight Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full border-0"
          />
        </div>
      ) : (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl">
          Video ID unavailable.
        </div>
      )}

      {/* Video Content Metadata */}
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

      {/* External Link */}
      <div className="pt-2 flex justify-end">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-[#FF0000] px-4 py-2 rounded-xl hover:bg-[#cc0000] transition-colors shadow-sm"
        >
          <span>Watch on YouTube</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};
