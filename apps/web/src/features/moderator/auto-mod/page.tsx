"use client";

import React, { useState } from "react";
import { useToast } from "@/shared/components/toast";

type BannedWordRule = {
  id: string;
  keyword: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  action: "AUTO_FLAG" | "AUTO_HIDE";
  createdAt: string;
  matchesCount: number;
};

export default function ModeratorAutoModPage() {
  const toast = useToast();
  const [engineActive, setEngineActive] = useState(true);
  const [rules, setRules] = useState<BannedWordRule[]>([]);

  const [newKeyword, setNewKeyword] = useState("");
  const [newSeverity, setNewSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [newAction, setNewAction] = useState<"AUTO_FLAG" | "AUTO_HIDE">("AUTO_FLAG");

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const newRule: BannedWordRule = {
      id: Date.now().toString(),
      keyword: newKeyword.trim().toLowerCase(),
      severity: newSeverity,
      action: newAction,
      createdAt: new Date().toISOString().split("T")[0],
      matchesCount: 0,
    };

    setRules([newRule, ...rules]);
    setNewKeyword("");
    toast({
      body: `Banned keyword "${newRule.keyword}" added to Auto-Mod rulebook.`,
      type: "info",
      autoHideDuration: 3000,
    });
  };

  const handleDeleteRule = (id: string, keyword: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast({
      body: `Rule "${keyword}" removed.`,
      type: "info",
      autoHideDuration: 3000,
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-xl font-black font-serif-title tracking-tight m-0" style={{ color: "var(--color-text-primary)" }}>
            Auto-Moderation Rules
          </h1>
          <p className="text-[11px] font-medium text-[var(--color-text-secondary)] mt-0.5">
            Configure automated keyword filters and severity enforcement rules for the Fan Arena
          </p>
        </div>

        {/* Master Engine Toggle */}
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-black/10 border border-[var(--color-border)]">
          <span className="text-xs font-bold text-[var(--color-text-primary)]">Auto-Mod Engine:</span>
          <button
            onClick={() => {
              setEngineActive(!engineActive);
              toast({
                body: `Auto-Mod Engine ${!engineActive ? "ACTIVATED" : "PAUSED"}.`,
                type: "info",
              });
            }}
            className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
              engineActive ? "bg-emerald-600 text-white" : "bg-red-600/20 text-red-400"
            }`}
          >
            {engineActive ? "Active" : "Paused"}
          </button>
        </div>
      </div>

      {/* Grid Split: Add Rule Form (1 col) + Active Rules Table (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Form Card */}
        <div className="card p-5 flex flex-col gap-4">
          <h3 className="font-serif-title m-0 text-sm font-bold uppercase tracking-wider text-[var(--color-accent)]">
            Add Banned Keyword
          </h3>

          <form onSubmit={handleAddRule} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--color-text-secondary)]">Keyword / Pattern:</label>
              <input
                type="text"
                required
                placeholder="e.g. crypto_scam_link"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--color-text-secondary)]">Severity Level:</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as any)}
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
              >
                <option value="LOW">Low (Mild insult)</option>
                <option value="MEDIUM">Medium (Toxicity / Harassment)</option>
                <option value="HIGH">High (Spam / Illegal content)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--color-text-secondary)]">Automated Action:</label>
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value as any)}
                className="w-full px-3 py-2 rounded bg-black/10 border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
              >
                <option value="AUTO_FLAG">Auto-Flag (Send to Queue)</option>
                <option value="AUTO_HIDE">Auto-Hide (Hide from Public Feed)</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 py-2 px-4 rounded text-xs font-black uppercase tracking-wider bg-[var(--color-accent)] text-white hover:opacity-90 active:scale-[0.98] cursor-pointer"
            >
              Add Auto-Mod Rule
            </button>
          </form>
        </div>

        {/* Rules Table */}
        <div className="card p-5 lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-title m-0 text-sm font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              Active Keyword Filters ({rules.length})
            </h3>
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
              Automated Enforcements: {rules.reduce((acc, r) => acc + r.matchesCount, 0)} Total
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {["Keyword", "Severity", "Action", "Enforced Count", "Added Date", "Actions"].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 px-3 text-[10px] font-black uppercase tracking-wider ${i === 5 ? "text-right" : "text-left"}`}
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: i < rules.length - 1 ? "1px solid var(--color-border)" : undefined }}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-[var(--color-text-primary)]">
                      "{rule.keyword}"
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                        style={{
                          background: rule.severity === "HIGH" ? "rgba(185,28,28,0.15)" : rule.severity === "MEDIUM" ? "rgba(217,119,6,0.15)" : "rgba(74,124,89,0.15)",
                          color: rule.severity === "HIGH" ? "#b91c1c" : rule.severity === "MEDIUM" ? "#d97706" : "#4a7c59",
                        }}
                      >
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-[10px]" style={{ color: rule.action === "AUTO_HIDE" ? "#b91c1c" : "var(--color-accent)" }}>
                      {rule.action === "AUTO_HIDE" ? "Auto-Hide" : "Auto-Flag"}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {rule.matchesCount} times
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {rule.createdAt}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteRule(rule.id, rule.keyword)}
                        className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
