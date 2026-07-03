"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { AdminUser, UserStatus } from "@/shared/lib/types";

const statuses: UserStatus[] = ["ACTIVE", "MUTED", "BANNED"];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => data<AdminUser[]>(http.get("/admin/users")) });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UserStatus }) => data<AdminUser>(http.patch(`/admin/users/${id}/status`, { status })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  return (
    <div>
      <h1 className="display-face text-4xl font-black">Users</h1>
      <div className="mt-5 overflow-x-auto border border-white/15">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/10 uppercase">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((user) => (
              <tr className="border-t border-white/10" key={user.id}>
                <td className="p-3 font-bold">{user.username}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.roles.join(", ")}</td>
                <td className="p-3">
                  <select className="input text-[var(--fv-ink)]" value={user.status} onChange={(event) => update.mutate({ id: user.id, status: event.target.value as UserStatus })}>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
