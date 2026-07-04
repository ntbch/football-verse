"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { LoadingBlock } from "@/shared/components/state-blocks";

const nav = [
  { href: "/moderator", label: "Dashboard" },
  { href: "/moderator/reports", label: "Forum Reports" }
];

export const ModeratorShell = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);

  useEffect(() => {
    if (ready && !auth?.roles.includes("MODERATOR") && !auth?.roles.includes("ADMIN")) {
      router.replace("/login");
    }
  }, [auth, ready, router]);

  if (!ready) {
    return <LoadingBlock label="Checking access" />;
  }

  if (!auth?.roles.includes("MODERATOR") && !auth?.roles.includes("ADMIN")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--fv-night)] text-[var(--fv-paper)] md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-b border-white/15 p-5 md:border-b-0 md:border-r">
        <Link href="/" className="display-face text-2xl font-black">
          FV Moderator
        </Link>
        <nav className="mt-8 grid gap-2 text-sm font-bold uppercase">
          {nav.map((item) => (
            <Link className="border border-white/10 px-3 py-2 hover:bg-white/10" key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="p-4 md:p-8">{children}</section>
    </div>
  );
};
