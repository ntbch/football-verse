import React from "react";

type MentionRendererProps = {
  content: string;
};

export function MentionRenderer({ content }: MentionRendererProps) {
  if (!content) return null;
  
  // Split content by `@username` patterns (alphanumeric, underscore, hyphen)
  const parts = content.split(/(@[a-zA-Z0-9_\-]+)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <span key={i} className="font-bold text-[var(--color-accent, #B45F35)] hover:underline cursor-pointer">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}
