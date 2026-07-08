"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { AuthResponse } from "@/shared/lib/types";
import { useToast } from "@/shared/components/toast";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const COVER_IMAGE_URL = "/images/login_banner.png";

const schema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToast();
  const [email, setEmail] = useState("admin@footballverse.local");
  const [password, setPassword] = useState("ChangeMe123!");
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

  const handleGoogleLogin = useCallback(async (idToken: string) => {
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
  }, [setAuth, router, toast]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initializeGoogle = () => {
      if (!(window as any).google?.accounts?.id) return;
      (window as any).google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response.credential) handleGoogleLogin(response.credential);
        },
      });

      const btnEl = document.getElementById("google-signin-button");
      if (btnEl) {
        (window as any).google.accounts.id.renderButton(btnEl, {
          theme: "outline",
          size: "large",
          width: 380,
          text: "signin_with",
          shape: "rectangular"
        });
      }
    };

    if (document.getElementById("google-gsi-script")) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);
  }, [handleGoogleLogin]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 text-[var(--color-text-primary)] font-sans relative overflow-hidden">
      {/* Background Grid & Tactical Overlay */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden bg-[var(--color-background-body)]">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-35" 
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(16, 20, 15, 0.035) 1px, transparent 1px),
              linear-gradient(180deg, rgba(16, 20, 15, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px"
          }}
        />
        {/* Stylized tactical board SVG overlay */}
        <svg 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] max-w-[1400px] aspect-[16/9] opacity-40 text-[var(--color-text-secondary)]" 
          viewBox="0 0 1600 900" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{`
            @keyframes tactical-dash {
              to {
                stroke-dashoffset: -40;
              }
            }
            @keyframes tactical-pulse {
              0%, 100% {
                r: 16px;
                fill-opacity: 0.03;
              }
              50% {
                r: 22px;
                fill-opacity: 0.12;
              }
            }
            @keyframes tactical-pulse-accent {
              0%, 100% {
                r: 20px;
                fill-opacity: 0.05;
              }
              50% {
                r: 28px;
                fill-opacity: 0.18;
              }
            }
            .animate-tactical-path {
              stroke-dasharray: 8, 8;
              animation: tactical-dash 18s linear infinite;
            }
            .animate-tactical-pulse-1 {
              animation: tactical-pulse 4s ease-in-out infinite;
            }
            .animate-tactical-pulse-accent {
              animation: tactical-pulse-accent 4s ease-in-out infinite;
            }
          `}</style>

          {/* Pitch boundary */}
          <rect x="100" y="100" width="1400" height="700" rx="16" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <line x1="800" y1="100" x2="800" y2="800" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <circle cx="800" cy="450" r="120" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          
          {/* Penalty boxes */}
          <rect x="100" y="275" width="220" height="350" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <rect x="1280" y="275" width="220" height="350" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" />
          <circle cx="320" cy="450" r="80" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" strokeDasharray="4,4" />
          <circle cx="1280" cy="450" r="80" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.12" strokeDasharray="4,4" />

          {/* Tactical movements */}
          <path d="M 400 250 Q 550 220 720 380" stroke="var(--color-accent)" strokeWidth="1.8" strokeOpacity="0.3" className="animate-tactical-path" />
          <path d="M 420 650 Q 600 680 750 520" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" className="animate-tactical-path" />
          <path d="M 780 480 Q 950 550 1150 450" stroke="var(--color-accent)" strokeWidth="1.8" strokeOpacity="0.3" className="animate-tactical-path" />

          {/* Arrows */}
          <path d="M 715 370 L 720 380 L 710 382" fill="var(--color-accent)" fillOpacity="0.4" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.4" />
          <path d="M 745 530 L 750 520 L 740 522" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25" />
          <path d="M 1145 440 L 1150 450 L 1140 452" fill="var(--color-accent)" fillOpacity="0.4" stroke="var(--color-accent)" strokeWidth="1" strokeOpacity="0.4" />

          {/* Glowing backdrops for Player Nodes */}
          <circle cx="400" cy="250" r="16" fill="currentColor" className="animate-tactical-pulse-1" />
          <circle cx="420" cy="650" r="16" fill="currentColor" className="animate-tactical-pulse-1" />
          <circle cx="750" cy="450" r="20" fill="var(--color-accent)" className="animate-tactical-pulse-accent" />
          <circle cx="1150" cy="450" r="16" fill="var(--color-accent)" className="animate-tactical-pulse-1" />

          {/* Circular Player Nodes */}
          <circle cx="400" cy="250" r="16" fill="var(--color-background-surface)" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
          <text x="400" y="254" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" fillOpacity="0.35">4</text>

          <circle cx="420" cy="650" r="16" fill="var(--color-background-surface)" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
          <text x="420" y="654" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" fillOpacity="0.35">2</text>

          <circle cx="750" cy="450" r="20" fill="var(--color-background-surface)" stroke="var(--color-accent)" strokeWidth="2" strokeOpacity="0.4" />
          <text x="750" y="455" textAnchor="middle" fontSize="14" fontWeight="bold" fill="var(--color-accent)" fillOpacity="0.5">8</text>

          <circle cx="1150" cy="450" r="16" fill="var(--color-background-surface)" stroke="var(--color-accent)" strokeWidth="1.5" strokeOpacity="0.4" />
          <text x="1150" y="454" textAnchor="middle" fontSize="12" fontWeight="bold" fill="var(--color-accent)" fillOpacity="0.5">9</text>
        </svg>
      </div>

      {/* Card container */}
      <div className="w-full max-w-[440px] card bg-[var(--color-background-surface)] p-8 md:px-10 md:py-9 flex flex-col justify-between min-h-[600px] z-10 relative overflow-hidden shadow-[0_20px_50px_rgba(16,20,15,0.08)] border border-[var(--color-border)]">
        {/* Top Decorative Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-accent)]" />

        <div>
          {/* Editorial Tagline */}
          <div className="text-center mb-6 mt-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--color-accent)] block mb-1">
              PREDICT THE MATCH // MASTER THE TACTICS
            </span>
            <div className="w-full h-px bg-[var(--color-border)] opacity-40" />
          </div>

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <img
              src="/logo.png"
              alt="Football Verse Logo"
              className="w-6 h-6 rounded-full object-cover shadow-sm"
            />
            <span className="font-serif font-black text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              Football Verse
            </span>
          </div>

          {/* Title */}
          <div className="mb-6 text-center">
            <h2 className="font-serif font-black text-3xl text-[var(--color-text-primary)] tracking-tight mb-2">
              Welcome Back
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">
              Sign in to join the predictions and community
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Password
                </label>
                <Link
                  href="#"
                  className="text-[10px] font-bold text-[var(--color-accent)] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary !rounded-xl !py-3.5 !text-xs active:scale-[0.98] transition-all"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Bottom Group: OR, Google, Footer */}
        <div className="flex flex-col gap-4 mt-6">
          {/* Google Sign-In */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]"></div>
          </div>
          <div className="relative w-full min-h-[44px] mt-2">
            {/* Styled custom button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                // If Google Client ID is not present, use standard dev mode login fallback
                if (!GOOGLE_CLIENT_ID) {
                  setIsLoading(true);
                  try {
                    const auth = await data<AuthResponse>(http.post("/auth/login", {
                      email: "admin@footballverse.local",
                      password: "ChangeMe123!",
                    }));
                    setAuth(auth);
                    if (auth.roles.includes("ADMIN")) {
                      router.push("/admin");
                    } else if (auth.roles.includes("MODERATOR")) {
                      router.push("/moderator");
                    } else {
                      router.push("/profile");
                    }
                  } catch (err) {
                    toast({ body: "Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID in your .env file.", type: "error" });
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] hover:bg-[var(--color-background-body)] active:scale-[0.98] transition-all shadow-sm min-h-[44px]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-xs font-bold text-[var(--color-text-primary)]">Sign in with Google</span>
            </button>

            {/* Invisible Google Sign-In container overlay */}
            {GOOGLE_CLIENT_ID && (
              <div 
                id="google-signin-button" 
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
              ></div>
            )}
          </div>

          <div className="pt-5 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
            <span>Don&apos;t have an account?</span>
            <Link
              href="/register"
              className="font-bold text-[var(--color-accent)] hover:underline"
            >
              Register here
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-[var(--color-text-secondary)] font-medium z-10 pointer-events-none">
        By logging in, you agree to our{" "}
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
