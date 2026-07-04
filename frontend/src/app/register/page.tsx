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
  email: z.string().email("Invalid email address format."),
  username: z.string()
    .min(3, "Username must be at least 3 characters long.")
    .max(60, "Username must not exceed 60 characters."),
  password: z.string().min(8, "Password must be at least 8 characters long.")
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<RegisterForm>();

  const submit = async (values: RegisterForm) => {
    setGlobalError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      parsed.error.errors.forEach((err) => {
        const fieldName = err.path[0];
        if (fieldName) {
          setError(fieldName as keyof RegisterForm, {
            type: "manual",
            message: err.message
          });
        }
      });
      return;
    }
    try {
      const auth = await data<AuthResponse>(http.post("/auth/register", parsed.data));
      setAuth(auth);
      router.push("/profile");
    } catch (err) {
      setGlobalError(apiErrorMessage(err, "Register failed."));
    }
  };

  return (
    <PublicShell>
      <section className="panel touchline mx-auto max-w-xl p-6">
        <h1 className="display-face text-4xl font-black">Register</h1>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit(submit)}>
          <label className="grid gap-1 font-bold">
            Email
            <input className={`input ${errors.email ? "border-red-900" : ""}`} {...register("email")} />
            {errors.email && <p className="text-sm font-semibold text-red-900">{errors.email.message}</p>}
          </label>
          <label className="grid gap-1 font-bold">
            Username
            <input className={`input ${errors.username ? "border-red-900" : ""}`} {...register("username")} />
            {errors.username && <p className="text-sm font-semibold text-red-900">{errors.username.message}</p>}
          </label>
          <label className="grid gap-1 font-bold">
            Password
            <input className={`input ${errors.password ? "border-red-900" : ""}`} type="password" {...register("password")} />
            {errors.password && <p className="text-sm font-semibold text-red-900">{errors.password.message}</p>}
          </label>
          {globalError ? <p className="font-bold text-red-900">{globalError}</p> : null}
          <button className="btn" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>
      </section>
    </PublicShell>
  );
}
