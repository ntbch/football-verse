"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

type ToastPayload = {
  body: string;
  type?: "info" | "error";
  autoHideDuration?: number;
};

const ToastContext = createContext<((payload: ToastPayload) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const [type, setType] = useState<"info" | "error">("info");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((payload: ToastPayload) => {
    // Clear any active timer to prevent premature hide race conditions
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setToast(payload.body);
    setType(payload.type || "info");
    const duration = payload.autoHideDuration || 3000;

    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white shadow-xl border ${
              type === "error"
                ? "bg-red-950/90 text-red-300 border-red-800"
                : "bg-[#10140f]/90 text-white border-white/10"
            }`}
          >
            {toast}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
