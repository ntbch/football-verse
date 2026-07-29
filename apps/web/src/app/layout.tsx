import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/shared/components/app-providers";

const themeInitScript = `try { var theme = localStorage.getItem("football-verse-theme"); document.documentElement.dataset.theme = theme === "dark" || theme === "light" ? theme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (_) { document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }`;

export const metadata: Metadata = {
  title: "Football Verse",
  description: "Editorial Football Magazine",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
