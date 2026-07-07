"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { AuthResponse } from "@/shared/lib/types";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const COVER_IMAGE_URL = "/images/login_banner.png";

const schema = z.object({
  email: z.string().email("Invalid email address format."),
  username: z.string()
    .min(3, "Username must be at least 3 characters long.")
    .max(60, "Username must not exceed 60 characters."),
  password: z.string().min(8, "Password must be at least 8 characters long.")
});

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{ email?: string; username?: string; password?: string } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);
    setGlobalError(null);

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
      router.push("/profile");
    } catch (err) {
      setGlobalError(apiErrorMessage(err, "Registration failed."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useCallback(async (idToken: string) => {
    setGlobalError(null);
    setIsLoading(true);
    try {
      const auth = await data<AuthResponse>(http.post("/auth/google", { idToken }));
      setAuth(auth);
      router.push("/profile");
    } catch (err) {
      setGlobalError(apiErrorMessage(err, "Google sign-in failed."));
    } finally {
      setIsLoading(false);
    }
  }, [setAuth, router]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      (window as any).google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response.credential) handleGoogleLogin(response.credential);
        },
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [handleGoogleLogin]);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 text-[var(--color-text-primary)] font-sans relative"
      style={{
        background: "linear-gradient(90deg, rgba(16, 20, 15, 0.03) 1px, transparent 1px), var(--color-background-body)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="w-full max-w-6xl bg-white border border-[var(--color-border)] rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 min-h-[650px] transform transition-all duration-300">
        {/* Form Section */}
        <div className="p-8 md:p-14 flex flex-col justify-between h-full bg-[#faf9f6]">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <img
                src="/logo.png"
                alt="Football Verse Logo"
                className="w-8 h-8 rounded-full object-cover shadow-sm"
              />
              <span className="font-serif font-black text-xl tracking-tight text-[var(--color-text-primary)]">
                Football Verse
              </span>
            </div>

            <div className="mb-8">
              <h2 className="font-serif font-black text-4xl text-[var(--color-text-primary)] tracking-tight mb-2">
                Create Account
              </h2>
              <p className="text-xs md:text-sm text-[var(--color-text-secondary)] font-serif italic">
                Join us to share news, comment, and predict scores
              </p>
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors?.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`input ${errors?.email ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
                />
                {errors?.email && (
                  <span className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{errors.email}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors?.username) setErrors({ ...errors, username: undefined });
                  }}
                  className={`input ${errors?.username ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
                />
                {errors?.username && (
                  <span className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{errors.username}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors?.password) setErrors({ ...errors, password: undefined });
                  }}
                  className={`input ${errors?.password ? "border-red-400 focus:border-red-400 focus:ring-red-400" : ""}`}
                />
                {errors?.password && (
                  <span className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{errors.password}</span>
                  </span>
                )}
              </div>

              {globalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-semibold text-red-700 m-0">{globalError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary !rounded-xl !py-3.5 !text-xs mt-2 active:scale-[0.98] transition-all"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {/* Google Sign-In */}
            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-px bg-[var(--color-border)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">or</span>
              <div className="flex-1 h-px bg-[var(--color-border)]"></div>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                if ((window as any).google?.accounts?.id) {
                  (window as any).google.accounts.id.prompt();
                } else {
                  setGlobalError("Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID.");
                }
              }}
              className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-white hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-xs font-bold text-gray-700">Sign up with Google</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
            <span>Already have an account?</span>
            <Link
              href="/login"
              className="font-bold text-[var(--color-accent)] hover:underline"
            >
              Login here
            </Link>
          </div>
        </div>

        {/* Cover Image Section */}
        <div className="hidden md:block relative h-full min-h-[650px] overflow-hidden">
          <img
            src={COVER_IMAGE_URL}
            alt="Football Stadium lights"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-text-primary)]/90 via-[var(--color-text-primary)]/50 to-transparent"></div>
          <div className="absolute bottom-14 left-14 right-14 z-20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] mb-3 inline-block">
              Arena Predictor
            </span>
            <h3 className="font-serif font-black text-4xl text-white leading-tight mb-4">
              "Predict the game. Follow the verse."
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed max-w-sm font-medium">
              Participate in weekly leaderboards, compete with fellow football fans, and read high-fidelity analytical reporting.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-[var(--color-text-secondary)] font-medium z-10 pointer-events-none">
        By registering, you agree to our{" "}
        <Link href="#" className="hover:underline pointer-events-auto">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="#" className="hover:underline pointer-events-auto">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
