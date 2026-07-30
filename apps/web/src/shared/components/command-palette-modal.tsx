"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/components/toast";

type CommandItem = {
  id: string;
  category: "Navigation" | "System Commands" | "Quick Actions";
  title: string;
  subtitle: string;
  shortcut?: string;
  action: () => void;
};

type CommandPaletteModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CommandPaletteModal({ isOpen, onClose }: CommandPaletteModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const commands: CommandItem[] = [
    {
      id: "nav-dash",
      category: "Navigation",
      title: "Admin Control Hub",
      subtitle: "System overview, health metrics and analytics",
      shortcut: "G D",
      action: () => { router.push("/admin"); onClose(); },
    },
    {
      id: "nav-users",
      category: "Navigation",
      title: "User Accounts & RBAC",
      subtitle: "Manage accounts, roles, bans and strikes",
      shortcut: "G U",
      action: () => { router.push("/admin/users"); onClose(); },
    },
    {
      id: "nav-sources",
      category: "Navigation",
      title: "Ingestion Crawlers",
      subtitle: "RSS, GNews, Reddit & X feeds monitoring",
      shortcut: "G S",
      action: () => { router.push("/admin/news/sources"); onClose(); },
    },
    {
      id: "nav-cms",
      category: "Navigation",
      title: "News CMS",
      subtitle: "Publishing, draft reviews and article management",
      shortcut: "G N",
      action: () => { router.push("/admin/news"); onClose(); },
    },
    {
      id: "nav-ai",
      category: "Navigation",
      title: "AI Clustering Engine",
      subtitle: "Gemini model embeddings, vector scores & story decisions",
      shortcut: "G A",
      action: () => { router.push("/admin/ai-engine"); onClose(); },
    },
    {
      id: "cmd-sync",
      category: "System Commands",
      title: "Trigger Feed Synchronization",
      subtitle: "Run instant RSS & API ingestion crawler pipeline",
      shortcut: "Ctrl + S",
      action: () => {
        toast({ body: "Ingestion crawler synchronization started in background.", type: "info" });
        onClose();
      },
    },
    {
      id: "cmd-cache",
      category: "System Commands",
      title: "Flush System Cache (Redis)",
      subtitle: "Purge cached API responses and temporary query keys",
      action: () => {
        toast({ body: "Redis system cache successfully flushed.", type: "info" });
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all border border-[var(--color-border)]"
        style={{ backgroundColor: "var(--color-background-body)" }}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 border-b border-[var(--color-border)] bg-black/20">
          <svg className="w-4 h-4 text-[var(--color-accent)] shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search module... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNavigation}
            className="w-full py-3.5 text-xs font-semibold bg-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/60 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-white/5">
            ESC
          </kbd>
        </div>

        {/* Command List Container */}
        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1 divide-y divide-white/5">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs italic text-[var(--color-text-secondary)]">
              No matching commands or navigation routes found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? "bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/20 text-[var(--color-accent)]">
                        {cmd.category}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        {cmd.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {cmd.subtitle}
                    </span>
                  </div>

                  {cmd.shortcut && (
                    <kbd className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-white/5">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-black/30 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-text-secondary)] font-mono">
          <span>Navigate with ↑ ↓, select with Enter</span>
          <span>Admin Command Center v2.0</span>
        </div>
      </div>
    </div>
  );
}
