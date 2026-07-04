"use client";

import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import type { UserStatus } from "@/shared/lib/types";
import { useAdminUsers, useUpdateUserStatus } from "../_api";

const statuses = ["ACTIVE", "MUTED", "BANNED"] as const;

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const update = useUpdateUserStatus();

  return (
    <div>
      <h1 className="display-face text-4xl font-black">Users</h1>
      {users.isLoading ? <LoadingBlock /> : null}
      {users.error ? <ErrorBlock message="Could not load users." /> : null}
      {update.error ? <ErrorBlock message="Could not update user status." /> : null}
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
            {users.data?.length === 0 ? (
              <tr>
                <td className="p-3 opacity-70" colSpan={4}>No users found.</td>
              </tr>
            ) : null}
            {users.data?.map((user) => (
              <tr className="border-t border-white/10" key={user.id}>
                <td className="p-3 font-bold">{user.username}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.roles.join(", ")}</td>
                <td className="p-3">
                  <select className="input text-[var(--fv-ink)]" disabled={update.isPending} value={user.status} onChange={(event) => update.mutate({ id: user.id, status: event.target.value as UserStatus })}>
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
