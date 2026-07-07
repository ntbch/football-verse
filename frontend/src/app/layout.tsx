import React from "react";
import "./globals.css";
import { AppProviders } from "@/shared/components/app-providers";

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
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-background-body)] text-[var(--color-text-primary)] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
