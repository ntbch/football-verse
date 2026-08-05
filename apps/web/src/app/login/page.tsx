import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in | Football Verse", robots: { index: false, follow: false } };
export { default } from "@/features/auth/login/page";
