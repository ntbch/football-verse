import React from "react";
import "./globals.css";
import { AppProviders } from "@/shared/components/app-providers";
import { ToastProvider } from "@/shared/components/toast";

export const metadata = {
  title: "Football-Verse",
  description: "Stories, Culture, and Community for Football Fans",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AppProviders>
      </body>
    </html>
  );
}
