"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { PublicShell } from "@/shared/components/public-shell";
import type { AuthResponse } from "@/shared/lib/types";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    defaultValues: { email: "admin@footballverse.local", password: "ChangeMe123!" }
  });

  const submit = async (values: LoginForm) => {
    setError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setError("Email and password are required.");
      return;
    }
    try {
      const auth = await data<AuthResponse>(http.post("/auth/login", parsed.data));
      setAuth(auth);
      router.push(auth.roles.includes("ADMIN") ? "/admin" : "/profile");
    } catch {
      setError("Login failed.");
    }
  };

  return (
    <PublicShell>
      <section className="panel touchline mx-auto max-w-xl p-6">
        <h1 className="display-face text-4xl font-black">Login</h1>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit(submit)}>
          <label className="grid gap-1 font-bold">
            Email
            <input className="input" {...register("email")} />
          </label>
          <label className="grid gap-1 font-bold">
            Password
            <input className="input" type="password" {...register("password")} />
          </label>
          {error ? <p className="font-bold text-red-900">{error}</p> : null}
          <button className="btn" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-sm">
          No account? <Link className="font-bold underline" href="/register">Register</Link>
        </p>
      </section>
    </PublicShell>
  );
}
