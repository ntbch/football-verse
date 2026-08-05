import type { PageResponse } from "@/shared/lib/api-types";

export type BillingPlan = {
  code: string;
  name: string;
  durationDays: number;
  amountVnd: number;
  currency: string;
  purchasable: boolean;
};

export type Membership = {
  premium: boolean;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | null;
  validFrom: string | null;
  validUntil: string | null;
  renewalMode: string;
};

export type CheckoutField = { name: string; value: string };

export type QrPayment = {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amountVnd: number;
  transferContent: string;
  imageUrl: string;
};

export type PaymentOrder = {
  id: string;
  invoiceNumber: string;
  planCode: string;
  amountVnd: number;
  durationDays: number;
  currency: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REVIEW_REQUIRED" | "REFUNDED";
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  checkoutUrl: string | null;
  checkoutFields: CheckoutField[];
  qrPayment: QrPayment | null;
};

export type PaymentHistory = PageResponse<PaymentOrder>;
