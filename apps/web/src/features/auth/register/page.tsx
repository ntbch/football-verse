"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { AuthResponse } from "../types";
import { useToast } from "@/shared/components/toast";
import { GoogleSignIn } from "../components/google-sign-in";

const schema = z.object({
  email: z.string().email("Invalid email address format."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long.")
    .max(60, "Username must not exceed 60 characters."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; username?: string; password?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);

    const parsed = schema.safeParse({ email, username, password });
    if (!parsed.success) {
      const fieldErrors: { email?: string; username?: string; password?: string } = {};
      parsed.error.errors.forEach((err) => {
        const fieldName = err.path[0] as "email" | "username" | "password";
        fieldErrors[fieldName] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const auth = await data<AuthResponse>(http.post("/auth/register", parsed.data));
      setAuth(auth);
      router.push("/");
    } catch (err) {
      toast({ body: apiErrorMessage(err, "Registration failed."), type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(
    async (idToken: string) => {
      setIsLoading(true);
      try {
        const auth = await data<AuthResponse>(http.post("/auth/google", { idToken }));
        setAuth(auth);
        router.push("/");
      } catch (err) {
        toast({ body: apiErrorMessage(err, "Google sign-in failed."), type: "error" });
      } finally {
        setIsLoading(false);
      }
    },
    [setAuth, router, toast]
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-6 px-4 text-[var(--color-text-primary)] font-sans relative overflow-hidden">
      {/* Background Grid & Pitch Overlay */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden bg-[var(--color-background-body)]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(16, 20, 15, 0.04) 1px, transparent 1px),
              linear-gradient(180deg, rgba(16, 20, 15, 0.04) 1px, transparent 1px)
            `,
            backgroundSize: "36px 36px",
          }}
        />
        <svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] max-w-[1400px] aspect-[16/9] opacity-35 text-[var(--color-text-secondary)]"
          viewBox="0 0 1600 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="100" y="100" width="1400" height="700" rx="16" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <line x1="800" y1="100" x2="800" y2="800" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <circle cx="800" cy="450" r="120" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <rect x="100" y="275" width="220" height="350" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <rect x="1280" y="275" width="220" height="350" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
        </svg>
      </div>

      {/* Compact Perfectly-Proportioned Card Container */}
      <div className="w-full max-w-[440px] sm:max-w-[460px] card bg-[var(--color-background-surface)] p-6 sm:p-8 md:px-9 md:py-7 flex flex-col justify-between z-10 relative overflow-hidden shadow-[0_25px_60px_rgba(16,20,15,0.09)] border border-[var(--color-border)] rounded-2xl">
        {/* Top Decorative Clay Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-accent)]" />

        <div>
          {/* Header Brand Badge */}
          <div className="text-center mb-4 mt-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)] block mb-1.5">
              PREDICT THE MATCH // MASTER THE TACTICS
            </span>
            <div className="w-full h-px bg-[var(--color-border)] opacity-50" />
          </div>

          {/* Logo Branding */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-4 group">
            <img
              src="/logo.png"
              alt="Football Verse Logo"
              className="w-7 h-7 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform duration-200 shrink-0"
            />
            <span className="font-serif font-black text-xs sm:text-sm uppercase tracking-wider text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-200">
              Football Verse
            </span>
          </Link>

          {/* Title Header */}
          <div className="mb-5 text-center">
            <h1 className="font-serif font-black text-2xl sm:text-3xl text-[var(--color-text-primary)] tracking-tight mb-1.5">
              Create Account
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">
              Join us to share news, comment, and predict scores
            </p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleRegister} className="flex flex-col gap-3.5 sm:gap-4">
            {/* Email Address */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="register-email" className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Email Address
              </label>
              <div className="relative flex items-center group">
                <span className="absolute left-3.5 pointer-events-none text-[var(--color-text-secondary)] opacity-50 group-focus-within:opacity-100 group-focus-within:text-[var(--color-accent)] transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </span>
                <input
                  id="register-email"
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors?.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`w-full h-11 pl-10 pr-4 py-2.5 rounded-xl border ${
                    errors?.email ? "border-red-500 focus:ring-red-500" : "border-[var(--color-border)]"
                  } bg-[var(--color-background-surface)] text-xs font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/40 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all shadow-xs`}
                  autoComplete="email"
                  required
                />
              </div>
              {errors?.email && (
                <span className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                  <span>{errors.email}</span>
                </span>
              )}
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="register-username" className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Username
              </label>
              <div className="relative flex items-center group">
                <span className="absolute left-3.5 pointer-events-none text-[var(--color-text-secondary)] opacity-50 group-focus-within:opacity-100 group-focus-within:text-[var(--color-accent)] transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </span>
                <input
                  id="register-username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors?.username) setErrors({ ...errors, username: undefined });
                  }}
                  className={`w-full h-11 pl-10 pr-4 py-2.5 rounded-xl border ${
                    errors?.username ? "border-red-500 focus:ring-red-500" : "border-[var(--color-border)]"
                  } bg-[var(--color-background-surface)] text-xs font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/40 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all shadow-xs`}
                  autoComplete="username"
                  required
                />
              </div>
              {errors?.username && (
                <span className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                  <span>{errors.username}</span>
                </span>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="register-password" className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Password
              </label>
              <div className="relative flex items-center group">
                <span className="absolute left-3.5 pointer-events-none text-[var(--color-text-secondary)] opacity-50 group-focus-within:opacity-100 group-focus-within:text-[var(--color-accent)] transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                </span>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors?.password) setErrors({ ...errors, password: undefined });
                  }}
                  className={`w-full h-11 pl-10 pr-11 py-2.5 rounded-xl border ${
                    errors?.password ? "border-red-500 focus:ring-red-500" : "border-[var(--color-border)]"
                  } bg-[var(--color-background-surface)] text-xs font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/40 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all shadow-xs`}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 z-20 p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors?.password && (
                <span className="text-[10px] text-red-600 font-bold mt-0.5 flex items-center gap-1">
                  <span>{errors.password}</span>
                </span>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary h-11 !rounded-xl !py-3 !text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-1.5"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                "CREATE ACCOUNT"
              )}
            </button>
          </form>
        </div>

        {/* Bottom Social Auth & Redirects */}
        <div className="flex flex-col gap-4 mt-5">
          <GoogleSignIn
            buttonId="google-signup-button"
            label="Sign up with Google"
            buttonText="signup_with"
            disabled={isLoading}
            onCredential={handleGoogleLogin}
            onUnavailable={() =>
              toast({
                body: "Google Sign-In is not configured.",
                type: "error",
              })
            }
          />

          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
            <span>Already have an account?</span>
            <Link href="/login" className="font-bold text-[var(--color-accent)] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Legal Terms */}
      <div className="mt-4 sm:mt-5 text-center text-[10px] sm:text-[11px] text-[var(--color-text-secondary)] font-medium z-10">
        By registering, you agree to Football Verse&apos;s{" "}
        <a href="#terms" className="hover:underline font-semibold text-[var(--color-text-primary)]">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#privacy" className="hover:underline font-semibold text-[var(--color-text-primary)]">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
