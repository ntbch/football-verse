import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify email | Football Verse", robots: { index: false, follow: false } };
export { default } from "@/features/auth/verify-email/page";
