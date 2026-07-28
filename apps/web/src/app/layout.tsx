import React from "react";
import "./globals.css";
import { AppProviders } from "@/shared/components/app-providers";

const themeInitScript = `try { var theme = localStorage.getItem("football-verse-theme"); document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light"; } catch (_) { document.documentElement.dataset.theme = "light"; }`;

export const metadata = {
  title: "Football Verse",
  description: "Editorial Football Magazine",
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
