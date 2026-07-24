"use client";

import React, { useState } from "react";
import { useToast } from "@/shared/components/toast";

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="text-[10px] font-black uppercase tracking-widest pb-3" style={{ color: "var(--color-accent)", borderBottom: "1px solid var(--color-border)" }}>{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer gap-4">
      <div>
        <div className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>{label}</div>
        {desc && <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0"
        style={{ backgroundColor: checked ? "var(--color-accent)" : "var(--color-border)" }}
      >
        <span className="inline-block w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5"
          style={{ transform: checked ? "translateX(20px)" : "translateX(2px)" }} />
      </button>
    </label>
  );
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>{label}</label>
      {desc && <div className="text-[10px] mb-1" style={{ color: "var(--color-text-secondary)" }}>{desc}</div>}
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
  const [allowGuestForum, setAllowGuestForum] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ body: "Settings saved successfully!", type: "info", autoHideDuration: 3000 });
  };

  return (
    <form onSubmit={handleSave}>
      <div className="flex flex-col gap-5 w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <h1 className="text-lg font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>System Settings</h1>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Global configuration for Football Verse platform</p>
          </div>
          <button type="submit" className="btn btn-primary !rounded-full !px-5 !py-2 !text-xs">Save All Settings</button>
        </div>

        {/* Site Identity */}
        <SettingSection title="Site Identity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Site Name">
              <input className="input !text-xs" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </Field>
            <Field label="Contact Email">
              <input type="email" className="input !text-xs" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </Field>
          </div>
          <Field label="Site Tagline" desc="Appears in page meta descriptions and hero text">
            <input className="input !text-xs" value={siteTagline} onChange={(e) => setSiteTagline(e.target.value)} />
          </Field>
        </SettingSection>

        {/* Crawler Config */}
        <SettingSection title="RSS Crawler Configuration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Crawl Interval (minutes)" desc="How often the automatic crawler runs">
              <input type="number" min="1" max="1440" className="input !text-xs" value={crawlInterval} onChange={(e) => setCrawlInterval(e.target.value)} />
            </Field>
            <Field label="Max Articles Per Crawl" desc="Cap per single crawl run to avoid overload">
              <input type="number" min="10" max="500" className="input !text-xs" value={maxArticlesPerCrawl} onChange={(e) => setMaxArticlesPerCrawl(e.target.value)} />
            </Field>
          </div>
          <Toggle label="Auto-Publish Crawled Articles" desc="Bypass DRAFT status — publish immediately on crawl" checked={enableAutoPublish} onChange={setEnableAutoPublish} />
        </SettingSection>

        {/* Feature Flags */}
        <SettingSection title="Feature Flags">
          <div className="flex flex-col gap-4">
            <Toggle label="User Registration" desc="Allow new users to create accounts" checked={enableRegister} onChange={setEnableRegister} />
            <Toggle label="Match Predictions Module" desc="Enable the AI-powered match prediction system" checked={enablePredictions} onChange={setEnablePredictions} />
            <Toggle label="SSE Notification Streams" desc="Real-time push notifications for users" checked={enableNotifications} onChange={setEnableNotifications} />
            <Toggle label="Forum Module" desc="Enable or disable the community forum entirely" checked={enableForum} onChange={setEnableForum} />
            <Toggle label="Guest Forum Read Access" desc="Allow non-registered users to browse forum threads" checked={allowGuestForum} onChange={setAllowGuestForum} />
          </div>
        </SettingSection>

        {/* Access Control */}
        <SettingSection title="Access & Security">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Max Login Attempts" desc="Before account is temporarily locked">
              <input type="number" min="3" max="20" className="input !text-xs" value={maxLoginAttempts} onChange={(e) => setMaxLoginAttempts(e.target.value)} />
            </Field>
            <Field label="Session Timeout (minutes)" desc="Inactivity period before user is logged out">
              <input type="number" min="15" max="10080" className="input !text-xs" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
            </Field>
          </div>
          <Toggle label="Require Email Verification" desc="New users must verify their email before accessing the platform" checked={requireEmailVerify} onChange={setRequireEmailVerify} />
        </SettingSection>

        {/* Maintenance */}
        <SettingSection title="Maintenance">
          <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(185,28,28,0.06)", border: "1px solid rgba(185,28,28,0.2)" }}>
            <div className="font-black text-[10px] uppercase mb-1" style={{ color: "#b91c1c" }}>Danger Zone</div>
            <Toggle label="Maintenance Mode" desc="When enabled, the site shows a maintenance page to all non-admin visitors" checked={maintenanceMode} onChange={setMaintenanceMode} />
          </div>
        </SettingSection>

        {/* Save button (bottom) */}
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary !px-6 !py-2.5 !text-xs">Save All Settings</button>
        </div>
      </div>
    </form>
  );
}
