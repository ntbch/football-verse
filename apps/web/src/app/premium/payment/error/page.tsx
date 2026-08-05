import type { Metadata } from "next";
import { Suspense } from "react";
import PremiumPaymentResult from "@/features/premium/payment-result";

export const metadata: Metadata = { title: "Payment status | Football Verse", robots: { index: false, follow: false } };

export default function ErrorPage() {
  return (
    <Suspense fallback={null}>
      <PremiumPaymentResult title="Payment could not be completed" />
    </Suspense>
  );
}
