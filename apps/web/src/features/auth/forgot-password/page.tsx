"use client";

import Link from "next/link";
import { useState } from "react";
import { apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { useToast } from "@/shared/components/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await data<void>(http.post("/auth/forgot-password", { email }));
      setSent(true);
    } catch (error) {
      toast({ body: apiErrorMessage(error, "Unable to request a reset email."), type: "error" });
    }
  };

  return <main className="min-h-screen grid place-items-center p-6">
    <form onSubmit={submit} className="card w-full max-w-md p-6">
      <h1 className="m-0 text-xl font-black">Reset password</h1>
      <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{sent ? "If eligible, a reset link will arrive shortly." : "Enter your account email."}</p>
      {!sent && <><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-4 w-full" placeholder="name@example.com" />
        <button className="btn btn-primary mt-4 w-full" type="submit">Send reset link</button></>}
      <Link href="/login" className="mt-4 block text-center text-sm font-bold underline">Back to sign in</Link>
    </form>
  </main>;
}
