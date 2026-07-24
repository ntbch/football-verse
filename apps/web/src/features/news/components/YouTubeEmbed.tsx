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
    <div className="card p-5 flex flex-col gap-4 border border-[var(--color-border)] bg-[var(--color-background-surface)] rounded-2xl shadow-sm">
      {/* YouTube Header Badge */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2">
          {/* YouTube Red SVG Logo */}
          <svg className="w-5 h-5 fill-[#FF0000]" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            Video Highlight Trận Đấu
          </span>
        </div>
        {sourceName && (
          <span className="text-[10px] font-bold text-[#FF0000] bg-[rgba(255,0,0,0.08)] px-2.5 py-1 rounded-full">
            {sourceName}
          </span>
        )}
      </div>

      {/* Embedded YouTube iFrame Video Player with Fallback Cover */}
      {videoId ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner group">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0`}
            title={title || "YouTube Highlight Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full border-0 z-10"
          />
        </div>
      ) : (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl">
          Video ID không khả dụng.
        </div>
      )}

      {/* External Watch Button (Peek.vn Style) */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
        <span className="text-xs text-[var(--color-text-secondary)] font-medium">
          Nếu video bị chặn theo quốc gia, hãy mở trực tiếp trên YouTube
        </span>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-[#FF0000] px-4 py-2.5 rounded-xl hover:bg-[#cc0000] transition-colors shadow-sm cursor-pointer flex-shrink-0"
        >
          <span>Xem trên YouTube</span>
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </a>
      </div>
    </div>
  );
};
