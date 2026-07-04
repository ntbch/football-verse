"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { PublicShell } from "@/shared/components/public-shell";
import type { AuthResponse } from "@/shared/lib/types";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(60),
  password: z.string().min(8)
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterForm>();

  const submit = async (values: RegisterForm) => {
    setError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setError("Check email, username, and password.");
      return;
    }
    try {
      const auth = await data<AuthResponse>(http.post("/auth/register", parsed.data));
      setAuth(auth);
      router.push("/profile");
    } catch (error) {
      setError(apiErrorMessage(error, "Register failed."));
    }
  };

  return (
    <PublicShell>
      <section className="panel touchline mx-auto max-w-xl p-6">
        <h1 className="display-face text-4xl font-black">Register</h1>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit(submit)}>
          <label className="grid gap-1 font-bold">
            Email
            <input className="input" {...register("email")} />
          </label>
          <label className="grid gap-1 font-bold">
            Username
            <input className="input" {...register("username")} />
          </label>
          <label className="grid gap-1 font-bold">
            Password
            <input className="input" type="password" {...register("password")} />
          </label>
          {error ? <p className="font-bold text-red-900">{error}</p> : null}
          <button className="btn" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>
      </section>
    </PublicShell>
  );
}
