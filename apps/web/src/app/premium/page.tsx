import type { Metadata } from "next";
import { Suspense } from "react";
import PremiumPage from "@/features/premium/page";

export const metadata: Metadata = { title: "Premium | Football Verse", robots: { index: false, follow: false } };

export default function PremiumRoute() {
  return (
    <Suspense fallback={null}>
      <PremiumPage />
    </Suspense>
  );
}
