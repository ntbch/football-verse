"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { data, http } from "@/shared/lib/api-client";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setMessage("Verification link is invalid or expired.");
      return;
    }
    data(http.post("/auth/verify-email", { token }))
      .then(() => setMessage("Email verified. You can now sign in."))
      .catch(() => setMessage("Verification link is invalid or expired."));
  }, []);

  return <main className="min-h-screen grid place-items-center p-6 text-center">
    <div className="card max-w-md p-6">
      <h1 className="m-0 text-xl font-black">Email verification</h1>
      <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{message}</p>
      <Link href="/login" className="btn btn-primary mt-4 inline-flex">Go to sign in</Link>
    </div>
  </main>;
}
