"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PublicShell } from "@/shared/components/page-shell";
import { LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { usePaymentOrder } from "./api";

const statusLabels: Record<string, string> = {
  PENDING: "Awaiting bank transfer",
  PAID: "Payment confirmed",
  REVIEW_REQUIRED: "Under review",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
};

export default function PremiumPaymentResult({ title }: { title: string }) {
  const auth = useAuthStore((state) => state.auth);
  const invoice = useSearchParams().get("invoice");
  const { data: order, isLoading } = usePaymentOrder(invoice, Boolean(auth));
  if (!auth || isLoading) return <PublicShell><LoadingBlock label="Checking payment status" /></PublicShell>;
  return (
    <PublicShell>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <section className="editorial-panel p-6">
          <p className="editorial-kicker m-0">Football Verse / Premium</p>
          <h1 className="mt-2 text-2xl font-black">{title}</h1>
          {!order && <p className="mt-3 text-sm text-[var(--color-text-secondary)]">We could not find a local order for this return. Open Premium to check again.</p>}
          {order && <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Invoice <span className="font-mono">{order.invoiceNumber}</span> is currently <strong>{statusLabels[order.status] ?? order.status}</strong>. Premium access changes only after the verified transaction reaches our server.</p>}
          <Link className="btn btn-primary mt-5" href="/premium">Open Premium</Link>
        </section>
      </div>
    </PublicShell>
  );
}
