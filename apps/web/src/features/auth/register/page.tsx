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
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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

  const handleGoogleLogin = useCallback(async (idToken: string) => {
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
  }, [setAuth, router, toast]);

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
              Create Account
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] font-serif italic">
              Join us to share news, comment, and predict scores
            </p>
          </div>

          {/* Form */}
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary !rounded-xl !py-3.5 !text-xs mt-2 active:scale-[0.98] transition-all"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Bottom Group: OR, Google, Footer */}
        <div className="flex flex-col gap-4 mt-6">
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

          <div className="pt-5 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-medium">
            <span>Already have an account?</span>
            <Link
              href="/login"
              className="font-bold text-[var(--color-accent)] hover:underline"
            >
              Login here
            </Link>
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
