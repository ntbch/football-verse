"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import type { AdminUser } from "../types";

type RoleTab = "ADMIN" | "MODERATOR" | "USER";

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: "Active", bg: "rgba(74,124,89,0.12)", color: "#4a7c59" },
  MUTED: { label: "Muted", bg: "rgba(180,95,53,0.12)", color: "#B45F35" },
  BANNED: { label: "Banned", bg: "rgba(185,28,28,0.12)", color: "#b91c1c" },
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<RoleTab>("USER");
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: qk.admin.users(),
    queryFn: () => data<AdminUser[]>(http.get("/admin/users")),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdminUser["status"] }) =>
      data<AdminUser>(http.patch(`/admin/users/${id}/status`, { status })),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.users() });
      toast({ body: `@${u.username} → ${u.status}`, type: "info", autoHideDuration: 2500 });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update status."), type: "error" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: string[] }) =>
      data<AdminUser>(http.patch(`/admin/users/${id}/roles`, { roles })),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.users() });
      toast({ body: `@${u.username} roles updated: ${u.roles.join(", ")}`, type: "info", autoHideDuration: 2500 });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Failed to update roles."), type: "error" }),
  });

  const counts = useMemo(() => ({
    ADMIN: users.filter((u) => u.roles.includes("ADMIN")).length,
    MODERATOR: users.filter((u) => u.roles.includes("MODERATOR") && !u.roles.includes("ADMIN")).length,
    USER: users.filter((u) => !u.roles.includes("ADMIN") && !u.roles.includes("MODERATOR")).length,
  }), [users]);

  const filtered = useMemo(() => {
    let base = users;
    if (tab === "ADMIN") base = users.filter((u) => u.roles.includes("ADMIN"));
    else if (tab === "MODERATOR") base = users.filter((u) => u.roles.includes("MODERATOR") && !u.roles.includes("ADMIN"));
    else base = users.filter((u) => !u.roles.includes("ADMIN") && !u.roles.includes("MODERATOR"));

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return base;
  }, [users, tab, search]);

  if (isLoading) return <LoadingBlock label="Fetching user database" />;

  const TABS: { key: RoleTab; label: string }[] = [
    { key: "USER", label: `Users (${counts.USER})` },
    { key: "MODERATOR", label: `Moderators (${counts.MODERATOR})` },
    { key: "ADMIN", label: `Admins (${counts.ADMIN})` },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>User Accounts</h1>
          <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{users.length} accounts</span>
        </div>
        <div className="relative w-56 shrink-0">
          <input
            placeholder="Search username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 pl-9 rounded-full text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)]/50 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all duration-300"
          />
          <svg className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-secondary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex items-center gap-1" style={{ borderBottom: "1px solid var(--color-border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-xs font-bold transition-all relative"
            style={{
              color: tab === t.key ? "var(--color-accent)" : "var(--color-text-secondary)",
              borderBottom: tab === t.key ? "2px solid var(--color-accent)" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-background-body)" }}>
              {["#", "Username", "Email", "Role", "Status", "Joined", "Actions"].map((h, i) => (
                <th key={h} className={`py-3 px-4 text-[10px] font-black uppercase tracking-wider ${i === 6 ? "text-right" : "text-left"}`} style={{ color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-xs italic" style={{ color: "var(--color-text-secondary)" }}>No users in this group.</td></tr>
            ) : filtered.map((user, i) => {
              const st = STATUS_STYLES[user.status] ?? STATUS_STYLES.ACTIVE;
              const isAdmin = user.roles.includes("ADMIN");
              const isMod = user.roles.includes("MODERATOR");
              const highestRole = isAdmin ? "ADMIN" : isMod ? "MODERATOR" : "USER";

              return (
                <tr key={user.id} className="hover:bg-black/[0.02] transition-colors" style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--color-border)" : undefined }}>
                  <td className="py-3 px-4 font-mono text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{user.id}</td>
                  <td className="py-3 px-4 font-bold" style={{ color: "var(--color-text-primary)" }}>@{user.username}</td>
                  <td className="py-3 px-4" style={{ color: "var(--color-text-secondary)" }}>{user.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase" style={
                      highestRole === "ADMIN" ? { background: "rgba(180,95,53,0.12)", color: "var(--color-accent)" }
                      : highestRole === "MODERATOR" ? { background: "rgba(180,95,53,0.07)", color: "#8B4513" }
                      : { background: "rgba(109,113,95,0.12)", color: "var(--color-text-secondary)" }
                    }>{highestRole}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black" style={{ color: st.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      {/* Role management buttons */}
                      {!isAdmin ? (
                        <button
                          onClick={() => updateRoleMutation.mutate({ id: user.id, roles: ["USER", "MODERATOR", "ADMIN"] })}
                          disabled={updateRoleMutation.isPending}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors hover:opacity-80 bg-amber-500/10 text-amber-700 border border-amber-500/20 cursor-pointer"
                        >
                          Make Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => updateRoleMutation.mutate({ id: user.id, roles: ["USER"] })}
                          disabled={updateRoleMutation.isPending}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors hover:opacity-80 bg-gray-500/10 text-gray-700 border border-gray-500/20 cursor-pointer"
                        >
                          Demote
                        </button>
                      )}

                      {!isMod && !isAdmin && (
                        <button
                          onClick={() => updateRoleMutation.mutate({ id: user.id, roles: ["USER", "MODERATOR"] })}
                          disabled={updateRoleMutation.isPending}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors hover:opacity-80 bg-blue-500/10 text-blue-700 border border-blue-500/20 cursor-pointer"
                        >
                          Make Mod
                        </button>
                      )}

                      {/* Status management buttons */}
                      {user.status !== "ACTIVE" && (
                        <button onClick={() => updateStatusMutation.mutate({ id: user.id, status: "ACTIVE" })}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors hover:opacity-80"
                          style={{ background: "rgba(74,124,89,0.15)", color: "#4a7c59" }}>Activate</button>
                      )}
                      {user.status !== "MUTED" && (
                        <button onClick={() => updateStatusMutation.mutate({ id: user.id, status: "MUTED" })}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors hover:opacity-80"
                          style={{ background: "rgba(180,95,53,0.12)", color: "var(--color-accent)" }}>Mute</button>
                      )}
                      {user.status !== "BANNED" && (
                        <button onClick={() => updateStatusMutation.mutate({ id: user.id, status: "BANNED" })}
                          className="px-2.5 py-1 rounded text-[9px] font-black uppercase transition-colors hover:opacity-80"
                          style={{ background: "rgba(185,28,28,0.12)", color: "#b91c1c" }}>Ban</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
