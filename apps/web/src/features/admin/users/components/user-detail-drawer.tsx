"use client";

import React from "react";
import { formatDate } from "@/shared/lib/format";
import type { AdminUser } from "../../types";

type UserDetailDrawerProps = {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRole: (id: number, roles: string[]) => void;
  onUpdateStatus: (id: number, status: AdminUser["status"]) => void;
  isUpdating?: boolean;
};

export function UserDetailDrawer({
  user,
  isOpen,
  onClose,
  onUpdateRole,
  onUpdateStatus,
  isUpdating = false,
}: UserDetailDrawerProps) {
  if (!isOpen || !user) return null;

  const isAdmin = user.roles.includes("ADMIN");
  const isMod = user.roles.includes("MODERATOR");
  const currentHighestRole = isAdmin ? "ADMIN" : isMod ? "MODERATOR" : "USER";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-md h-full flex flex-col shadow-2xl transition-transform duration-300 transform translate-x-0 border-l border-[var(--color-border)]"
        style={{ backgroundColor: "var(--color-background-body)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-[var(--color-accent)]">
              USER ACCOUNT #{user.id}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* User Profile Summary */}
          <div className="card p-5 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-accent)]/20 border-2 border-[var(--color-accent)] flex items-center justify-center text-xl font-black text-[var(--color-accent)] font-mono">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text-primary)] m-0">@{user.username}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] m-0 mt-0.5">{user.email}</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span
                className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase"
                style={{
                  background: currentHighestRole === "ADMIN" ? "rgba(180,95,53,0.15)" : currentHighestRole === "MODERATOR" ? "rgba(74,124,89,0.15)" : "rgba(255,255,255,0.05)",
                  color: currentHighestRole === "ADMIN" ? "var(--color-accent)" : currentHighestRole === "MODERATOR" ? "#4a7c59" : "var(--color-text-secondary)",
                }}
              >
                ROLE: {currentHighestRole}
              </span>
              <span
                className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase"
                style={{
                  background: user.status === "ACTIVE" ? "rgba(74,124,89,0.15)" : user.status === "BANNED" ? "rgba(185,28,28,0.15)" : "rgba(217,119,6,0.15)",
                  color: user.status === "ACTIVE" ? "#4a7c59" : user.status === "BANNED" ? "#b91c1c" : "#d97706",
                }}
              >
                STATUS: {user.status}
              </span>
            </div>
          </div>

          {/* Account Metrics */}
          <div className="card p-4 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
              Account Metadata
            </span>
            <div className="flex items-center justify-between text-xs py-1 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-secondary)]">Member Since:</span>
              <span className="font-mono text-[var(--color-text-primary)]">{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-[var(--color-border)]">
              <span className="text-[var(--color-text-secondary)]">Assigned Roles:</span>
              <span className="font-bold text-[var(--color-accent)]">{user.roles.join(", ")}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-[var(--color-text-secondary)]">Violation Strikes:</span>
              <span className="font-mono font-bold text-amber-500">1 Warning Strike</span>
            </div>
          </div>

          {/* Role Mutation Controls */}
          <div className="card p-4 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
              RBAC Role Controls
            </span>
            <div className="flex flex-col gap-2">
              {!isAdmin ? (
                <button
                  onClick={() => onUpdateRole(user.id, ["USER", "MODERATOR", "ADMIN"])}
                  disabled={isUpdating}
                  className="py-2 px-3 rounded text-xs font-bold uppercase transition-all bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25 active:scale-[0.98] cursor-pointer"
                >
                  Promote to System Administrator
                </button>
              ) : (
                <button
                  onClick={() => onUpdateRole(user.id, ["USER"])}
                  disabled={isUpdating}
                  className="py-2 px-3 rounded text-xs font-bold uppercase transition-all bg-white/5 text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-white/10 active:scale-[0.98] cursor-pointer"
                >
                  Demote to Standard User
                </button>
              )}

              {!isMod && !isAdmin && (
                <button
                  onClick={() => onUpdateRole(user.id, ["USER", "MODERATOR"])}
                  disabled={isUpdating}
                  className="py-2 px-3 rounded text-xs font-bold uppercase transition-all bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/25 active:scale-[0.98] cursor-pointer"
                >
                  Promote to Community Moderator
                </button>
              )}
            </div>
          </div>

          {/* Account Status Mutations */}
          <div className="card p-4 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
              Account Status Actions
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdateStatus(user.id, "ACTIVE")}
                disabled={user.status === "ACTIVE" || isUpdating}
                className="py-2 px-2 rounded text-[10px] font-black uppercase transition-all bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                Activate
              </button>
              <button
                onClick={() => onUpdateStatus(user.id, "MUTED")}
                disabled={user.status === "MUTED" || isUpdating}
                className="py-2 px-2 rounded text-[10px] font-black uppercase transition-all bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                Mute User
              </button>
              <button
                onClick={() => onUpdateStatus(user.id, "BANNED")}
                disabled={user.status === "BANNED" || isUpdating}
                className="py-2 px-2 rounded text-[10px] font-black uppercase transition-all bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
              >
                Ban Account
              </button>
            </div>
          </div>

          {/* Audit Note Input */}
        </div>
      </div>
    </div>
  );
}
