import React from "react";

type MentionRendererProps = {
  content: string;
};

export function MentionRenderer({ content }: MentionRendererProps) {
  if (!content) return null;

  // Split content by `@username` patterns
  const parts = content.split(/(@[a-zA-Z0-9_\-]+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <span key={i} className="font-bold text-[var(--color-accent)] hover:underline cursor-pointer">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}
