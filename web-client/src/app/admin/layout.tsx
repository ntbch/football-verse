"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/shared/components/page-shell";
import { useAuthStore } from "@/shared/lib/auth-store";
import { LoadingBlock } from "@/shared/components/state-blocks";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);
  const router = useRouter();

  useEffect(() => {
    if (ready) {
      if (!auth) {
        router.push("/login");
      } else if (!auth.roles.includes("ADMIN")) {
        router.push("/profile");
      }
    }
  }, [auth, ready, router]);

  if (!ready || !auth || !auth.roles.includes("ADMIN")) {
    return (
      <AdminShell>
        <LoadingBlock label="Verifying Administrator Privilege" />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
