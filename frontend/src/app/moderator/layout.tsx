"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModeratorShell } from "@/shared/components/page-shell";
import { useAuthStore } from "@/shared/lib/auth-store";
import { LoadingBlock } from "@/shared/components/state-blocks";

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);
  const router = useRouter();

  useEffect(() => {
    if (ready) {
      if (!auth) {
        router.push("/login");
      } else if (!auth.roles.includes("MODERATOR") && !auth.roles.includes("ADMIN")) {
        router.push("/profile");
      }
    }
  }, [auth, ready, router]);

  if (!ready || !auth || (!auth.roles.includes("MODERATOR") && !auth.roles.includes("ADMIN"))) {
    return (
      <ModeratorShell>
        <LoadingBlock label="Verifying Moderation Privilege" />
      </ModeratorShell>
    );
  }

  return (
    <ModeratorShell>
      {children}
    </ModeratorShell>
  );
}
