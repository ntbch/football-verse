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
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ email, password });
    if (!result.success) {
      toast({ body: result.error.errors[0].message, type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const auth = await data<AuthResponse>(http.post("/auth/login", { email, password }));
      setAuth(auth);
      if (auth.roles.includes("ADMIN")) {
        router.push("/admin");
      } else if (auth.roles.includes("MODERATOR")) {
        router.push("/moderator");
      } else {
        router.push("/");
      }
    } catch (err) {
      toast({ body: apiErrorMessage(err, "Login failed. Please check your credentials."), type: "error" });
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
        if (auth.roles.includes("ADMIN")) {
          router.push("/admin");
        } else if (auth.roles.includes("MODERATOR")) {
          router.push("/moderator");
        } else {
          router.push("/");
        }
      } catch (err) {
        toast({ body: apiErrorMessage(err, "Google sign-in failed."), type: "error" });
      } finally {
        setIsLoading(false);
      }
    },
    [setAuth, router, toast]
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 text-[var(--color-text-primary)] font-sans relative overflow-hidden">
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

      {/* Main Spacious High-Craft Card Container */}
      <div className="w-full max-w-[460px] sm:max-w-[480px] card bg-[var(--color-background-surface)] p-8 sm:p-10 md:p-11 flex flex-col justify-between z-10 relative overflow-hidden shadow-[0_25px_60px_rgba(16,20,15,0.09)] border border-[var(--color-border)] rounded-2xl">
        {/* Top Decorative Clay Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-accent)]" />

        <div>
          {/* Header Brand Badge */}
          <div className="text-center mb-7 mt-1">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)] block mb-2">
              PREDICT THE MATCH // MASTER THE TACTICS
            </span>
            <div className="w-full h-px bg-[var(--color-border)] opacity-50" />
          </div>

          {/* Logo Branding */}
          <Link href="/" className="flex items-center justify-center gap-2.5 mb-7 group">
            <img
              src="/logo.png"
              alt="Football Verse Logo"
              className="w-7 h-7 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-serif font-black text-sm uppercase tracking-wider text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-200">
              Football Verse
            </span>
          </Link>

          {/* Title Header */}
          <div className="mb-8 text-center">
            <h1 className="font-serif font-black text-3xl sm:text-4xl text-[var(--color-text-primary)] tracking-tight mb-2.5">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-[13px] text-[var(--color-text-secondary)] font-serif italic">
              Sign in to join match predictions and community tactics
            </p>
          </div>

          {/* Login Form with Generous Spacing */}
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            {/* Email Address */}
            <div className="flex flex-col gap-2 w-full">
              <label htmlFor="login-email" className="text-[10.5px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Email Address
              </label>
              <div className="relative flex items-center group">
                <span className="absolute left-4 pointer-events-none text-[var(--color-text-secondary)] opacity-50 group-focus-within:opacity-100 group-focus-within:text-[var(--color-accent)] transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] text-xs font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/40 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all shadow-xs"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2 w-full">
              <div className="flex justify-between items-center mb-0.5">
                <label htmlFor="login-password" className="text-[10.5px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[10.5px] font-bold text-[var(--color-accent)] hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center group">
                <span className="absolute left-4 pointer-events-none text-[var(--color-text-secondary)] opacity-50 group-focus-within:opacity-100 group-focus-within:text-[var(--color-accent)] transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-12 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] text-xs font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/40 focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] transition-all shadow-xs"
                  autoComplete="current-password"
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
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary h-12 !rounded-xl !py-3.5 !text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>
        </div>

        {/* Bottom Social Auth & Redirects */}
        <div className="flex flex-col gap-5 mt-7">
          <GoogleSignIn
            buttonId="google-signin-button"
            label="Sign in with Google"
            buttonText="signin_with"
            disabled={isLoading}
            onCredential={handleGoogleLogin}
            onUnavailable={() =>
              toast({
                body: "Google Sign-In is not configured.",
                type: "error",
              })
            }
          />

          <div className="pt-6 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
            <span>New to Football Verse?</span>
            <Link href="/register" className="font-bold text-[var(--color-accent)] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Legal Terms */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] sm:text-[11px] text-[var(--color-text-secondary)] font-medium z-10 pointer-events-none">
        By signing in, you agree to Football Verse&apos;s{" "}
        <Link href="/terms" className="hover:underline pointer-events-auto font-semibold text-[var(--color-text-primary)]">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:underline pointer-events-auto font-semibold text-[var(--color-text-primary)]">
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
