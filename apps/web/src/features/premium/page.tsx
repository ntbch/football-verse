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
    <article className={`relative overflow-hidden border-b border-[var(--color-border)] first:border-t ${isBestValue ? "bg-[#121b27] text-[#f7f5ef]" : "bg-transparent"}`}>
      {isBestValue && <span className="absolute right-5 top-5 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text-inverse)]">Best value</span>}
      <button
        className="grid w-full cursor-pointer gap-4 px-5 py-6 text-left transition-colors duration-200 hover:bg-[var(--color-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50 sm:grid-cols-[4rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6 sm:px-7"
        disabled={disabled || !plan.purchasable}
        onClick={onChoose}
        type="button"
        aria-label={`Choose ${planLabel(plan.durationDays)}`}
      >
        <span className={`text-4xl font-black tracking-[-0.08em] ${isBestValue ? "text-[var(--color-accent)]" : "text-[var(--color-border)]"}`}>{String(months).padStart(2, "0")}</span>
        <span><span className={`block text-xl font-black tracking-[-0.04em] ${isBestValue ? "text-[#f7f5ef]" : "text-[var(--color-text-primary)]"}`}>{months} {months === 1 ? "month" : "months"}</span><span className={`mt-1 block text-sm ${isBestValue ? "text-[#d1d5db]" : "text-[var(--color-text-secondary)]"}`}>{plan.durationDays} days of access</span></span>
        <span className="sm:text-right"><span className={`block text-2xl font-black tracking-[-0.06em] ${isBestValue ? "text-[#f7f5ef]" : "text-[var(--color-text-primary)]"}`}>{money(plan.amountVnd)}</span><span className={`mt-1 block text-xs ${isBestValue ? "text-[#d1d5db]" : "text-[var(--color-text-secondary)]"}`}>{money(Math.round(plan.amountVnd / months))} / month</span></span>
        <span className={`grid h-10 w-10 place-items-center rounded-full border transition-transform duration-200 ${isBestValue ? "border-white/25 text-[#f7f5ef]" : "border-[var(--color-border)] text-[var(--color-text-primary)]"}`} aria-hidden="true"><svg className="h-5 w-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10m-4-4 4 4-4 4" /></svg></span>
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

  const annualPlan = plans?.find((plan) => plan.durationDays === 365);
  const showCheckout = activeOrder?.status === "PENDING";

  return (
    <PublicShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 pb-6">
        <section className="relative isolate grid gap-10 overflow-hidden rounded-[2rem] bg-[#121b27] px-6 py-10 text-[#f7f5ef] md:px-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.62fr)] lg:items-end">
          <svg aria-hidden="true" className="absolute inset-y-0 right-0 h-full w-[58%] text-white/10" viewBox="0 0 640 440" fill="none"><circle cx="464" cy="220" r="146" stroke="currentColor" strokeWidth="1" /><circle cx="464" cy="220" r="62" stroke="currentColor" strokeWidth="1" /><path d="M315 0v440M640 0v440M315 145h325M315 295h325" stroke="currentColor" strokeWidth="1" /></svg>
          <div className="pointer-events-none absolute -right-5 -top-16 select-none text-[15rem] font-black leading-none tracking-[-.12em] text-white/[.035] md:text-[22rem]" aria-hidden="true">90</div>
          <header className="relative max-w-2xl">
            <p className="m-0 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-accent)]">Football Verse / Premium</p>
            <h1 className="m-0 mt-5 text-5xl font-black leading-[.9] tracking-[-0.075em] md:text-7xl">Make matchday yours.</h1>
            <p className="m-0 mt-6 max-w-xl text-base leading-relaxed text-[#c9d0db]">A quieter place to follow the signals, clubs and competitions that matter to you.</p>
          </header>
          <aside className="relative border-l border-white/15 pl-6 md:pl-8">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-[#c9d0db]">The full season</p>
            <p className="m-0 mt-3 text-4xl font-black tracking-[-0.07em] md:text-5xl">{annualPlan ? money(annualPlan.amountVnd) : "-"}</p>
            <p className="m-0 mt-2 text-sm text-[#c9d0db]">{annualPlan ? `${money(Math.round(annualPlan.amountVnd / 12))} per month` : "Annual access"}</p>
            {!showCheckout && annualPlan && <button className="mt-7 min-h-12 w-full cursor-pointer rounded-full bg-[var(--color-accent)] px-5 text-sm font-black text-[var(--color-text-inverse)] transition-transform duration-200 hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50" disabled={createOrder.isPending || hasUnpaidOrder || !annualPlan.purchasable} onClick={() => createOrder.mutate(annualPlan.code)} type="button">{!annualPlan.purchasable ? "Sales paused" : hasUnpaidOrder ? "Pay or cancel current order" : "Start with annual"}</button>}
            <p className="m-0 mt-4 text-xs font-bold text-[#c9d0db]">One payment. No auto-renewal.</p>
            {membership?.premium && <p className="m-0 mt-5 border-t border-white/15 pt-4 text-xs font-bold text-[var(--color-accent)]">Active until {dateTime(membership.validUntil)}</p>}
          </aside>
        </section>

        {activeOrder && <OrderStatus order={activeOrder} onCancel={showCheckout ? () => cancel(activeOrder.invoiceNumber) : undefined} cancelling={cancelOrder.isPending} />}
        {cancelOrder.isError && <p className="m-0 -mt-5 text-sm text-[var(--color-danger)]">{apiErrorMessage(cancelOrder.error, "Could not cancel the payment order.")}</p>}

        {!showCheckout && (
          <>
            <section aria-labelledby="premium-plans-title">
              <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                <div><p className="m-0 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-accent)]">Choose your pass</p><h2 id="premium-plans-title" className="m-0 mt-3 text-4xl font-black tracking-[-0.06em]">Time on your side.</h2></div>
                <span className="text-xs text-[var(--color-text-secondary)]">All prices are one-time payments in VND</span>
              </div>
              {createOrder.isError && <p className="mb-4 text-sm text-[var(--color-danger)]">{apiErrorMessage(createOrder.error, "Could not create the payment order.")}</p>}
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
                {(plans ?? []).map((plan) => <PlanCard key={plan.code} plan={plan} disabled={createOrder.isPending || hasUnpaidOrder} onChoose={() => createOrder.mutate(plan.code)} />)}
              </div>
            </section>

            <section aria-labelledby="premium-benefits-title" className="grid gap-8 border-y border-[var(--color-border)] py-10 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)]">
              <div><p className="m-0 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-accent)]">What changes</p><h2 id="premium-benefits-title" className="m-0 mt-3 text-3xl font-black tracking-[-0.04em]">More of the signal you came for.</h2></div>
              <ul className="m-0 grid list-none gap-x-8 divide-y divide-[var(--color-border)] p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <li className="py-4 sm:pr-6"><strong className="block text-base">Detailed model signals</strong><small className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">Read deeper match context and score history.</small></li>
                <li className="py-4 sm:pl-6"><strong className="block text-base">More follows</strong><small className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">Keep closer tabs on more teams, leagues and players.</small></li>
                <li className="py-4 sm:pr-6"><strong className="block text-base">Private leagues</strong><small className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">Create more spaces for your prediction groups.</small></li>
                <li className="py-4 sm:pl-6"><strong className="block text-base">Early access</strong><small className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">Try new match intelligence as it lands.</small></li>
              </ul>
            </section>
          </>
        )}

        <details className="border-y border-[var(--color-border)] py-4" aria-labelledby="payment-history-title">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[var(--color-accent)] marker:hidden"><span id="payment-history-title">View payment history</span><span aria-hidden="true">→</span></summary>
          <div className="mt-4 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
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
        </details>
      </div>
    </PublicShell>
  );
}
