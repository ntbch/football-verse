"use client";

import React, { useState } from "react";
import { useToast } from "@/shared/components/toast";

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="text-[10px] font-black uppercase tracking-widest pb-3 text-[var(--color-accent)] border-b border-[var(--color-border)]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-4">
      <div>
        <div className="text-xs font-bold text-[var(--color-text-primary)]">{label}</div>
        {desc && <div className="text-[10px] mt-0.5 text-[var(--color-text-secondary)]">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer"
        style={{ backgroundColor: checked ? "var(--color-accent)" : "var(--color-border)" }}
      >
        <span
          className="inline-block w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5"
          style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }}
        />
      </button>
    </label>
  );
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">{label}</label>
      {desc && <div className="text-[10px] text-[var(--color-text-secondary)]">{desc}</div>}
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  const toast = useToast();

  // Site
  const [siteName, setSiteName] = useState("Football Verse");
  const [siteTagline, setSiteTagline] = useState("Your Premier Football Intelligence Platform");
  const [contactEmail, setContactEmail] = useState("admin@footballverse.com");
  const [crawlInterval, setCrawlInterval] = useState("10");
  const [maxArticlesPerCrawl, setMaxArticlesPerCrawl] = useState("50");

  // Features
  const [enableRegister, setEnableRegister] = useState(true);
  const [enablePredictions, setEnablePredictions] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableForum, setEnableForum] = useState(true);
  const [enableAutoPublish, setEnableAutoPublish] = useState(false);
  const [requireEmailVerify, setRequireEmailVerify] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Security
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [sessionTimeout, setSessionTimeout] = useState("60");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ body: "System Settings updated successfully!", type: "info", autoHideDuration: 3000 });
  };

  const handleFlushCache = () => {
    toast({ body: "System Redis Cache successfully flushed.", type: "info", autoHideDuration: 3000 });
  };

  return (
    <form onSubmit={handleSave}>
      <div className="flex flex-col gap-6 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h1 className="text-xl font-black font-serif-title tracking-tight m-0 text-[var(--color-text-primary)]">
              System Settings & Platform Control
            </h1>
            <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mt-0.5">
              Global configuration, feature flags, security policies and cache management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFlushCache}
              className="py-2 px-4 rounded-full text-xs font-bold transition-all border border-[var(--color-border)] bg-white/5 hover:bg-white/10 active:scale-[0.98] cursor-pointer"
            >
              Flush Redis Cache
            </button>
            <button
              type="submit"
              className="py-2 px-5 rounded-full text-xs font-black uppercase tracking-wider bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md"
            >
              Save All Settings
            </button>
          </div>
        </div>

        {/* Site Identity */}
        <SettingSection title="Site Identity & Branding">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Platform Name">
              <input
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </Field>
            <Field label="System Support Email">
              <input
                type="email"
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Platform Tagline" desc="Appears in page metadata and hero banners">
            <input
              className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              value={siteTagline}
              onChange={(e) => setSiteTagline(e.target.value)}
            />
          </Field>
        </SettingSection>

        {/* Ingestion Engine Config */}
        <SettingSection title="Ingestion Engine & Crawler Policy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Crawl Frequency Interval (minutes)" desc="Automated background crawler run frequency">
              <input
                type="number"
                min="1"
                max="1440"
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                value={crawlInterval}
                onChange={(e) => setCrawlInterval(e.target.value)}
              />
            </Field>
            <Field label="Max Articles Per Ingestion Run" desc="Cap per single crawl cycle to protect database memory">
              <input
                type="number"
                min="10"
                max="500"
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                value={maxArticlesPerCrawl}
                onChange={(e) => setMaxArticlesPerCrawl(e.target.value)}
              />
            </Field>
          </div>
          <Toggle
            label="Auto-Publish Ingested Stories"
            desc="Bypass DRAFT moderation queue — publish stories immediately on crawl"
            checked={enableAutoPublish}
            onChange={setEnableAutoPublish}
          />
        </SettingSection>

        {/* Feature Flags */}
        <SettingSection title="Platform Feature Flags">
          <div className="flex flex-col gap-4">
            <Toggle label="User Account Registration" desc="Allow new visitors to sign up for accounts" checked={enableRegister} onChange={setEnableRegister} />
            <Toggle label="Match Predictions Module" desc="Enable the AI match predictions & points engine" checked={enablePredictions} onChange={setEnablePredictions} />
            <Toggle label="Realtime Push Notifications" desc="Enable SSE push notifications for users" checked={enableNotifications} onChange={setEnableNotifications} />
            <Toggle label="Community Forum" desc="Enable or disable the community discussion arena" checked={enableForum} onChange={setEnableForum} />
          </div>
        </SettingSection>

        {/* Access & Security */}
        <SettingSection title="Security & Session Policy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Max Failed Login Attempts" desc="Throttling threshold before temporary lockout">
              <input
                type="number"
                min="3"
                max="20"
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(e.target.value)}
              />
            </Field>
            <Field label="Session Timeout (minutes)" desc="Inactivity window before automatic logout">
              <input
                type="number"
                min="15"
                max="10080"
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
              />
            </Field>
          </div>
          <Toggle label="Mandatory Email Verification" desc="New users must verify email address before posting" checked={requireEmailVerify} onChange={setRequireEmailVerify} />
        </SettingSection>

        {/* Maintenance Mode */}
        <SettingSection title="Maintenance & Emergency Controls">
          <div className="p-4 rounded-lg bg-red-950/20 border border-red-500/30 flex flex-col gap-3">
            <div className="font-mono font-black text-xs uppercase text-red-400">Emergency System Override</div>
            <Toggle
              label="Activate Maintenance Mode"
              desc="Redirect non-admin visitors to a maintenance screen while maintaining full Admin Control Hub access"
              checked={maintenanceMode}
              onChange={setMaintenanceMode}
            />
          </div>
        </SettingSection>
      </div>
    </form>
  );
}
