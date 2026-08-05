import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/shared/components/app-providers";

const themeInitScript = `try { var theme = localStorage.getItem("football-verse-theme"); document.documentElement.dataset.theme = theme === "dark" || theme === "light" ? theme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (_) { document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }`;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
if (process.env.APP_ENV === "production" && (!process.env.NEXT_PUBLIC_SITE_URL || /localhost|127\.0\.0\.1/i.test(siteUrl))) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be a public URL in production");
}

export const metadata: Metadata = {
  title: "Football Verse",
  description: "Verified football intelligence: stories, matchday context, predictions and community.",
  metadataBase: new URL(siteUrl),
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Football Verse", url: siteUrl, title: "Football Verse", description: "Verified football intelligence for stories, matchday context and community." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Football Verse",
          url: siteUrl,
          email: "admin@footballverse.com",
        }) }} />
      </head>
      <body className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
