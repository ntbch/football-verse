"use client";

import React, { useState } from "react";
import { useToast } from "@/shared/components/toast";

export default function AdminSettingsPage() {
  const toast = useToast();

  const [siteName, setSiteName] = useState("Football Verse");
  const [crawlInterval, setCrawlInterval] = useState("10");
  const [enableRegister, setEnableRegister] = useState(true);
  const [enablePredictions, setEnablePredictions] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      body: "Administrative properties saved successfully!",
      type: "info",
      autoHideDuration: 3000,
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full text-white">
      <h3 className="font-serif text-xl md:text-2xl font-black tracking-tight text-white m-0 font-serif font-bold text-xl text-white border-b border-[var(--color-border)] pb-2">
        System Settings
      </h3>

      <div className="p-5 bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-2xl shadow-premium bg-[var(--color-background-surface)] border border-[var(--color-border)] w-full">
        <form onSubmit={handleSave} className="w-full">
          <div className="flex flex-col gap-4 ">
            <h4 className="font-serif text-lg font-black leading-snug text-white m-0 text-sm font-bold uppercase text-[var(--color-accent)]">Site properties</h4>

            <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">Application Site Name</label>
  <input
    type="text"
    placeholder=""
    value={siteName}
    onChange={(e) => setSiteName(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>

            <div className="flex flex-col gap-1 w-full text-left">
  <label className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">RSS News Crawler Interval Rate (in minutes)</label>
  <input
    type="text"
    placeholder=""
    value={crawlInterval}
    onChange={(e) => setCrawlInterval(e.target.value)}
    className="w-full px-3 py-2 rounded-lg text-xs border border-[var(--color-border)] bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-medium"
  />
</div>

            <h4 className="font-serif text-lg font-black leading-snug text-white m-0 text-sm font-bold uppercase text-[var(--color-accent)] pt-2 border-t border-[var(--color-border)]">System feature toggles</h4>

            <div className="flex items-center gap-6 text-xs font-semibold py-1.5 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableRegister}
                  onChange={(e) => setEnableRegister(e.target.checked)}
                  className="rounded bg-[var(--color-background-body)] border-[var(--color-border)] focus:ring-0 text-[var(--color-accent)] w-4 h-4"
                />
                <span>Enable User Registration</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePredictions}
                  onChange={(e) => setEnablePredictions(e.target.checked)}
                  className="rounded bg-[var(--color-background-body)] border-[var(--color-border)] focus:ring-0 text-[var(--color-accent)] w-4 h-4"
                />
                <span>Enable Match Predictions Module</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableNotifications}
                  onChange={(e) => setEnableNotifications(e.target.checked)}
                  className="rounded bg-[var(--color-background-body)] border-[var(--color-border)] focus:ring-0 text-[var(--color-accent)] w-4 h-4"
                />
                <span>Enable Notification SSE Streams</span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
              <button
  type="button"
  disabled={false || false}
  className="px-4 py-2 rounded-full text-xs font-bold uppercase bg-[var(--color-accent)] text-black hover:opacity-90 disabled:opacity-50 transition-all-300 shadow-sm active:scale-95"
>
  {false ? "Loading..." : "Save settings"}
</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
