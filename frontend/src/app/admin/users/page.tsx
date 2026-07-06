"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query-keys";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";

type AdminUser = {
  id: number;
  email: string;
  username: string;
  status: "ACTIVE" | "MUTED" | "BANNED";
  roles: ("USER" | "MODERATOR" | "ADMIN")[];
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: qk.admin.users(),
    queryFn: () => data<AdminUser[]>(http.get("/admin/users")),
  });

  // 2. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "MUTED" | "BANNED" }) =>
      data<AdminUser>(http.patch(`/admin/users/${id}/status`, { status })),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: qk.admin.users() });
      toast({
        body: `@${updated.username} status updated to ${updated.status}`,
        type: "info",
        autoHideDuration: 3000,
      });
    },
    onError: (err) => {
      toast({
        body: apiErrorMessage(err, "Failed to update user status."),
        type: "error",
      });
    },
  });

  const handleStatusToggle = (user: AdminUser, newStatus: "ACTIVE" | "MUTED" | "BANNED") => {
    updateStatusMutation.mutate({ id: user.id, status: newStatus });
  };

  if (isLoading) {
    return <LoadingBlock label="Fetching user database" />;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="font-serif text-xl md:text-2xl font-black tracking-tight text-white m-0 font-serif font-bold text-xl text-white">
        User Accounts Management
      </h3>

      <div className="bg-[var(--color-background-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-secondary)] font-bold">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Roles</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-[var(--color-text-secondary)] italic">
                    No user accounts found in the database.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--color-background-body)] text-white">
                    <td className="py-3 px-4 text-[var(--color-text-secondary)] font-mono">{user.id}</td>
                    <td className="py-3 px-4 font-bold">@{user.username}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {user.roles.map((r) => (
                          <span
                            key={r}
                            className="bg-[var(--color-background-body)] border border-[var(--color-border)] text-gray-300 font-bold px-1.5 py-0.5 rounded text-[9px]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[9px] ${
                          user.status === "ACTIVE"
                            ? "bg-green-950 text-green-300 border border-green-800"
                            : user.status === "MUTED"
                            ? "bg-yellow-950 text-yellow-300 border border-yellow-800"
                            : "bg-red-950 text-red-300 border border-red-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1.5 inline-flex">
                        {user.status !== "ACTIVE" && (
                          <button
                            onClick={() => handleStatusToggle(user, "ACTIVE")}
                            className="bg-green-800 hover:bg-green-700 text-white text-[9px] font-bold uppercase rounded px-2 py-1 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        {user.status !== "MUTED" && (
                          <button
                            onClick={() => handleStatusToggle(user, "MUTED")}
                            className="bg-yellow-800 hover:bg-yellow-700 text-black text-[9px] font-bold uppercase rounded px-2 py-1 transition-colors"
                          >
                            Mute
                          </button>
                        )}
                        {user.status !== "BANNED" && (
                          <button
                            onClick={() => handleStatusToggle(user, "BANNED")}
                            className="bg-red-800 hover:bg-red-700 text-white text-[9px] font-bold uppercase rounded px-2 py-1 transition-colors"
                          >
                            Ban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
