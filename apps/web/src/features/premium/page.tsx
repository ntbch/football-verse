"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import {
  useBillingPlans,
  useCancelPaymentOrder,
  useCreatePaymentOrder,
  useHidePaymentOrder,
  useMembership,
  usePaymentHistory,
  usePaymentOrder,
} from "./api";
import type { BillingPlan, PaymentOrder } from "./types";

const money = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const dateTime = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "-";

const planLabel = (durationDays: number) => {
  if (durationDays === 30) return "1 month / 30 days";
  if (durationDays === 90) return "3 months / 90 days";
  if (durationDays === 180) return "6 months / 180 days";
  return "12 months / 365 days";
};

const planMonths = (durationDays: number) => durationDays === 30 ? 1 : durationDays === 90 ? 3 : durationDays === 180 ? 6 : 12;

const statusLabels: Record<PaymentOrder["status"], string> = {
  PENDING: "Awaiting transfer",
  PAID: "Payment confirmed",
  REVIEW_REQUIRED: "Under review",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
};

const statusClass = (status: PaymentOrder["status"]) => {
  if (status === "PENDING") return "bg-[var(--color-accent-muted)] text-[var(--color-accent)]";
  if (status === "PAID") return "bg-[var(--color-success-muted)] text-[var(--color-success)]";
  if (status === "REVIEW_REQUIRED") return "bg-[var(--color-accent-muted)] text-[var(--color-accent)]";
  return "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]";
};

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  if (remaining === 0) return <span className="text-[var(--color-danger)]">Order expired</span>;
  const totalSeconds = Math.floor(remaining / 1_000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return <span>Expires in {minutes}:{seconds}</span>;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-accent)] underline-offset-4 hover:underline active:translate-y-px"
      onClick={() => void copy()}
      aria-label={`${label}: ${value}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function QrPaymentBlock({ order }: { order: PaymentOrder }) {
  const qr = order.qrPayment;
  const [qrFailed, setQrFailed] = useState(false);
  if (order.status !== "PENDING") return null;

  if (!qr) {
    if (!order.checkoutUrl || order.checkoutFields.length === 0) {
      return <p className="mt-6 border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-danger)]">Payment details are unavailable. Please try again shortly.</p>;
    }
    return (
      <form action={order.checkoutUrl} method="post" className="mt-6 border-t border-[var(--color-border)] pt-5">
        {order.checkoutFields.map((field) => <input key={field.name} type="hidden" name={field.name} value={field.value} />)}
        <button className="btn btn-primary w-full" type="submit">Continue to secure checkout</button>
      </form>
    );
  }

  return (
    <div className="mt-7 grid gap-8 border-t border-[var(--color-border)] pt-7 md:grid-cols-[minmax(0,1fr)_minmax(19rem,23rem)] md:items-center">
      <div className="order-1 mx-auto w-full max-w-[420px] md:order-2">
        <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-premium)]">
          {qrFailed ? (
            <div className="grid aspect-square place-items-center rounded-[1.25rem] bg-[var(--color-surface-muted)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
              QR image unavailable. Use the transfer details beside it.
            </div>
          ) : (
            <img
              className="aspect-square w-full rounded-[1.25rem] object-contain"
              src={qr.imageUrl}
              alt={`VietQR transfer code for ${money(qr.amountVnd)}`}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setQrFailed(true)}
            />
          )}
        </div>
        <p className="m-0 mt-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">VietQR</p>
      </div>

      <div className="order-2 space-y-5 md:order-1">
        <div>
          <p className="m-0 text-base font-black text-[var(--color-text-primary)]">Scan this QR with your banking app</p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">The amount and transfer reference are already filled in.</p>
        </div>
        <dl className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)] text-sm">
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--color-text-secondary)]">Bank</dt><dd className="m-0 font-bold">{qr.bankCode}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--color-text-secondary)]">Account number</dt><dd className="m-0 flex items-center gap-3 font-mono font-bold"><span>{qr.accountNumber}</span><CopyButton value={qr.accountNumber} label="Copy account number" /></dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--color-text-secondary)]">Account holder</dt><dd className="m-0 max-w-[14rem] text-right font-bold">{qr.accountName}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--color-text-secondary)]">Amount</dt><dd className="m-0 font-black text-[var(--color-accent)]">{money(qr.amountVnd)}</dd></div>
          <div className="flex items-center justify-between gap-4 py-3"><dt className="text-[var(--color-text-secondary)]">Reference</dt><dd className="m-0 flex max-w-[16rem] items-center gap-3 text-right font-mono text-xs font-bold"><span className="break-all">{qr.transferContent}</span><CopyButton value={qr.transferContent} label="Copy transfer reference" /></dd></div>
        </dl>
      </div>
    </div>
  );
}

function OrderStatus({ order, onCancel, cancelling }: { order: PaymentOrder; onCancel?: () => void; cancelling?: boolean }) {
  const pending = order.status === "PENDING";
  const description = pending
    ? "Transfer the exact amount with the reference shown below. Your access updates automatically after the verified payment reaches our server."
    : order.status === "PAID"
      ? "Your payment is confirmed. Premium access is now attached to your account."
      : order.status === "REVIEW_REQUIRED"
        ? "This payment needs a manual review. Your account will update only after verification."
        : order.status === "CANCELLED"
          ? "This order was cancelled. You can choose another plan below."
          : "This order has expired. Choose another plan below.";

  return (
    <section className="editorial-panel overflow-hidden" aria-labelledby="payment-status-title">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] p-5 md:p-7">
        <div>
          <p className="editorial-kicker m-0">{pending ? "Complete your transfer" : "Order status"}</p>
          <h2 id="payment-status-title" className="editorial-section-title m-0 mt-1">{pending ? "Pay for Premium" : statusLabels[order.status]}</h2>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(order.status)}`}>
          {statusLabels[order.status]}
        </span>
      </header>
      <div className="p-5 md:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="editorial-kicker m-0">Plan</p><p className="m-0 mt-1 text-sm font-bold">{planLabel(order.durationDays)}</p></div>
          <div><p className="editorial-kicker m-0">Invoice</p><p className="m-0 mt-1 break-all font-mono text-xs font-bold">{order.invoiceNumber}</p></div>
          <div className="sm:text-right"><p className="editorial-kicker m-0">Total</p><p className="m-0 mt-1 text-lg font-black text-[var(--color-accent)]">{money(order.amountVnd)}</p></div>
        </div>
        <p className="m-0 mt-5 max-w-3xl text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
        {pending && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <p className="m-0 text-sm font-black text-[var(--color-accent)]"><Countdown expiresAt={order.expiresAt} /></p>
            {onCancel && <button type="button" className="btn btn-secondary min-h-9 px-3 py-1.5 text-[10px]" disabled={cancelling} onClick={onCancel}>{cancelling ? "Cancelling..." : "Cancel order"}</button>}
          </div>
        )}
        <QrPaymentBlock order={order} />
      </div>
    </section>
  );
}

function PlanCard({ plan, disabled, onChoose }: { plan: BillingPlan; disabled: boolean; onChoose: () => void }) {
  const months = planMonths(plan.durationDays);
  const isBestValue = plan.durationDays === 365;
  return (
    <article className={`editorial-panel flex min-h-[17rem] flex-col p-5 md:p-6 ${isBestValue ? "border-[var(--color-accent)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="editorial-kicker m-0">{isBestValue ? "Best value" : "Premium access"}</p>
          <h3 className="m-0 mt-2 text-xl font-black">{planLabel(plan.durationDays)}</h3>
        </div>
        {isBestValue && <span className="rounded-full bg-[var(--color-accent-muted)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--color-accent)]">Popular</span>}
      </div>
      <p className="m-0 mt-7 font-serif-title text-3xl font-black text-[var(--color-accent)]">{money(plan.amountVnd)}</p>
      <p className="m-0 mt-1 text-sm text-[var(--color-text-secondary)]">About {money(Math.round(plan.amountVnd / months))} per month</p>
      <button className="btn btn-primary mt-auto w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled || !plan.purchasable} onClick={onChoose} type="button">
        {!plan.purchasable ? "Sales paused" : disabled ? "Pay or cancel current order" : "Choose this plan"}
      </button>
    </article>
  );
}

export default function PremiumPage() {
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoice = searchParams.get("invoice");
  const [dismissedInvoice, setDismissedInvoice] = useState<string | null>(null);
  const { data: plans, isLoading: plansLoading, isError: plansError, refetch: refetchPlans } = useBillingPlans();
  const { data: membership } = useMembership(Boolean(auth));
  const { data: history } = usePaymentHistory(Boolean(auth));
  const createOrder = useCreatePaymentOrder();
  const cancelOrder = useCancelPaymentOrder();
  const hideOrder = useHidePaymentOrder();
  const pendingFromHistory = useMemo(
    () => history?.content?.find((item) => item.status === "PENDING" && item.invoiceNumber !== dismissedInvoice),
    [dismissedInvoice, history],
  );
  const trackedInvoice = createOrder.data?.invoiceNumber ?? invoice ?? pendingFromHistory?.invoiceNumber ?? null;
  const { data: liveOrder } = usePaymentOrder(trackedInvoice, Boolean(auth));
  const historyOrder = invoice ? history?.content?.find((item) => item.invoiceNumber === invoice) : undefined;
  const activeOrder = createOrder.data ?? liveOrder ?? historyOrder ?? pendingFromHistory;
  const hasUnpaidOrder = Boolean(activeOrder?.status === "PENDING");

  useEffect(() => {
    if (ready && !auth) router.replace(`/login?next=${encodeURIComponent("/premium")}`);
  }, [auth, ready, router]);

  useEffect(() => {
    if (createOrder.data && !invoice) router.replace(`/premium?invoice=${encodeURIComponent(createOrder.data.invoiceNumber)}`);
  }, [createOrder.data, invoice, router]);

  if (!ready || !auth) return <PublicShell><LoadingBlock label="Initializing session" /></PublicShell>;
  if (plansLoading) return <PublicShell><LoadingBlock label="Loading Premium" /></PublicShell>;
  if (plansError) return <PublicShell><ErrorBlock message="Premium plans are unavailable." onRetry={() => void refetchPlans()} /></PublicShell>;

  const cancel = (invoiceNumber: string) => {
    cancelOrder.mutate(invoiceNumber, {
      onSuccess: () => {
        setDismissedInvoice(invoiceNumber);
        if (invoice === invoiceNumber) router.replace("/premium");
      },
    });
  };

  const startingPrice = Math.min(...(plans ?? []).map((plan) => plan.amountVnd), 0);
  const showCheckout = activeOrder?.status === "PENDING";

  return (
    <PublicShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <header className="editorial-panel relative overflow-hidden p-6 md:p-9">
            <div className="absolute right-[-4rem] top-[-5rem] h-48 w-48 rounded-full border-[22px] border-[var(--color-editorial-glow)]" aria-hidden="true" />
            <div className="relative">
              <p className="editorial-kicker m-0">Football Verse / Premium</p>
              <h1 className="mt-4 max-w-xl font-serif-title text-4xl font-black leading-[1.02] tracking-[-0.04em] md:text-5xl">More signal for every match you follow.</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)] md:text-base">Detailed prediction context, higher follow limits and a clearer way to read the game.</p>
            </div>
          </header>
          <aside className="editorial-panel flex flex-col justify-between bg-[var(--color-editorial-wash)] p-6 md:p-8">
            <div>
              <p className="editorial-kicker m-0">Starting at</p>
              <p className="m-0 mt-3 font-serif-title text-5xl font-black tracking-[-0.04em] text-[var(--color-accent)]">{startingPrice ? money(startingPrice) : "-"}</p>
              <p className="m-0 mt-2 text-sm text-[var(--color-text-secondary)]">One-time payment, no auto-renewal</p>
            </div>
            {membership?.premium && <p className="m-0 mt-8 border-t border-[var(--color-border)] pt-4 text-sm font-bold text-[var(--color-success)]">Active until {dateTime(membership.validUntil)}</p>}
          </aside>
        </section>

        {activeOrder && <OrderStatus order={activeOrder} onCancel={showCheckout ? () => cancel(activeOrder.invoiceNumber) : undefined} cancelling={cancelOrder.isPending} />}
        {cancelOrder.isError && <p className="m-0 -mt-5 text-sm text-[var(--color-danger)]">{apiErrorMessage(cancelOrder.error, "Could not cancel the payment order.")}</p>}

        {!showCheckout && (
          <>
            <section aria-labelledby="premium-plans-title">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border)] pb-4">
                <div><p className="editorial-kicker m-0">Choose access</p><h2 id="premium-plans-title" className="editorial-section-title m-0 mt-1">Premium plans</h2></div>
                <span className="text-xs text-[var(--color-text-secondary)]">Prices shown in VND</span>
              </div>
              {createOrder.isError && <p className="mb-4 text-sm text-[var(--color-danger)]">{apiErrorMessage(createOrder.error, "Could not create the payment order.")}</p>}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(plans ?? []).map((plan) => <PlanCard key={plan.code} plan={plan} disabled={createOrder.isPending || hasUnpaidOrder} onChoose={() => createOrder.mutate(plan.code)} />)}
              </div>
            </section>

            <section aria-labelledby="premium-benefits-title" className="border-y border-[var(--color-border)] py-7">
              <div className="grid gap-5 md:grid-cols-[.7fr_1.3fr] md:gap-10">
                <div><p className="editorial-kicker m-0">Included with Premium</p><h2 id="premium-benefits-title" className="editorial-section-title m-0 mt-1">Fewer limits.</h2></div>
                <ul className="m-0 grid list-none gap-0 p-0 text-sm text-[var(--color-text-secondary)] sm:grid-cols-2">
                  <li className="border-b border-[var(--color-border)] py-3 sm:pr-5">More private prediction leagues.</li>
                  <li className="border-b border-[var(--color-border)] py-3 sm:pl-5">Follow more teams, leagues and players.</li>
                  <li className="border-b border-[var(--color-border)] py-3 sm:pr-5">Detailed model signals and score history.</li>
                  <li className="py-3 sm:pl-5">Priority access to new match intelligence.</li>
                </ul>
              </div>
            </section>
          </>
        )}

        <section className="editorial-panel p-5 md:p-6" aria-labelledby="payment-history-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4"><div><p className="editorial-kicker m-0">Account</p><h2 id="payment-history-title" className="editorial-section-title m-0 mt-1">Payment history</h2></div><Link href="/profile" className="text-xs font-bold text-[var(--color-accent)] hover:underline">Back to profile</Link></div>
          <div className="divide-y divide-[var(--color-border)]">
            {(history?.content ?? []).map((order) => {
              const cancellable = order.status === "PENDING";
              const removable = order.status === "CANCELLED" || order.status === "EXPIRED";
              return (
                <div key={order.id} className="grid gap-3 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-5">
                  <div className="min-w-0"><p className="m-0 truncate font-bold">{planLabel(order.durationDays)}</p><p className="m-0 mt-1 truncate font-mono text-[10px] text-[var(--color-text-secondary)]">{order.invoiceNumber}</p><p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]">{dateTime(order.createdAt)}</p></div>
                  <span className="font-bold">{money(order.amountVnd)}</span>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusClass(order.status)}`}>{cancellable ? <Countdown expiresAt={order.expiresAt} /> : statusLabels[order.status]}</span>
                  <div className="flex gap-3 sm:justify-self-end">
                    {cancellable && <button type="button" className="text-xs font-bold text-[var(--color-accent)] underline-offset-4 hover:underline" disabled={cancelOrder.isPending} onClick={() => cancel(order.invoiceNumber)}>{cancelOrder.isPending ? "Cancelling..." : "Cancel"}</button>}
                    {removable && <button type="button" className="text-xs font-bold text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-danger)] hover:underline" disabled={hideOrder.isPending} onClick={() => hideOrder.mutate(order.invoiceNumber)}>{hideOrder.isPending ? "Hiding..." : "Hide"}</button>}
                  </div>
                </div>
              );
            })}
            {!history?.content?.length && <p className="m-0 py-5 text-sm text-[var(--color-text-secondary)]">No payment orders yet.</p>}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
