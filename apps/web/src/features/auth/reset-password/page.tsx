"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { useToast } from "@/shared/components/toast";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [complete, setComplete] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
    window.history.replaceState(null, "", window.location.pathname);
    setToken(value);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      toast({ body: "Passwords do not match.", type: "error" });
      return;
    }
    try {
      await data<void>(http.post("/auth/reset-password", { token, password }));
      setComplete(true);
    } catch (error) {
      toast({ body: apiErrorMessage(error, "This reset link is invalid or expired."), type: "error" });
    }
  };

  return <main className="min-h-screen grid place-items-center p-6">
    <form onSubmit={submit} className="card w-full max-w-md p-6">
      <h1 className="m-0 text-xl font-black">Choose a new password</h1>
      {complete ? <p className="mt-3 text-sm text-[var(--color-text-secondary)]">Password reset. You can now sign in.</p> : token ? <>
        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input mt-4 w-full" placeholder="New password" />
        <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input mt-3 w-full" placeholder="Confirm new password" />
        <button className="btn btn-primary mt-4 w-full" type="submit">Reset password</button>
      </> : <p className="mt-3 text-sm text-[var(--color-text-secondary)]">This reset link is invalid or expired.</p>}
      <Link href="/login" className="mt-4 block text-center text-sm font-bold underline">Go to sign in</Link>
    </form>
  </main>;
}
