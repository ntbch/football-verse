"use client";

import React, { useState, useEffect, useRef } from "react";

type LogLine = {
  id: string;
  time: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  message: string;
};

type CrawlerTerminalProps = {
  isSyncing: boolean;
  onClear?: () => void;
};

export function CrawlerTerminal({ isSyncing, onClear }: CrawlerTerminalProps) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length === 0) {
      setLogs([
        {
          id: "init",
          time: new Date().toLocaleTimeString("en-US", { hour12: false }),
          level: "INFO",
          message: "Ingestion Engine initialized. Standing by for feed synchronization.",
        },
      ]);
    }
  }, [logs.length]);

  useEffect(() => {
    if (isSyncing) {
      const now = new Date().toLocaleTimeString("en-US", { hour12: false });
      const newLogs: LogLine[] = [
        { id: Date.now() + "-1", time: now, level: "INFO", message: "[INGESTION] Triggering RSS & API synchronization pipeline..." },
        { id: Date.now() + "-2", time: now, level: "INFO", message: "[INGESTION] Requesting active feeds from configured sources directory..." },
      ];

      setLogs((prev) => [...prev, ...newLogs]);
    }
  }, [isSyncing]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleClearLogs = () => {
    setLogs([{ id: Date.now().toString(), time: new Date().toLocaleTimeString(), level: "INFO", message: "Terminal log buffer cleared." }]);
    if (onClear) onClear();
  };

  return (
    <div className="card p-4 flex flex-col gap-3 font-mono text-xs border border-[var(--color-border)] bg-black/40 shadow-inner">
      {/* Terminal Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-bold text-[var(--color-accent)] ml-2 uppercase tracking-wider">
            Ingestion Terminal Stream
          </span>
          {isSyncing && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              EXECUTING PIPELINE...
            </span>
          )}
        </div>

        <button
          onClick={handleClearLogs}
          className="text-[10px] font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline cursor-pointer"
        >
          Clear Terminal
        </button>
      </div>

      {/* Terminal Body */}
      <div className="h-40 overflow-y-auto flex flex-col gap-1 pr-2 font-mono text-[11px] leading-relaxed">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">[{log.time}]</span>
            <span
              className={`font-bold shrink-0 text-[10px] ${
                log.level === "SUCCESS"
                  ? "text-emerald-400"
                  : log.level === "WARN"
                  ? "text-amber-400"
                  : log.level === "ERROR"
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {log.level}
            </span>
            <span className="text-[var(--color-text-primary)] break-all">{log.message}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
