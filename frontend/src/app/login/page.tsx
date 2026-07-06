"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { apiErrorMessage, data, http } from "../../shared/lib/api-client";
import { useAuthStore } from "../../shared/lib/auth-store";
import type { AuthResponse } from "../../shared/lib/types";

const COVER_IMAGE_URL = "/images/login_banner.png";

const schema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("admin@footballverse.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = schema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const auth = await data<AuthResponse>(
        http.post("/auth/login", { email, password })
      );
      setAuth(auth);
      if (auth.roles.includes("ADMIN")) {
        router.push("/admin");
      } else if (auth.roles.includes("MODERATOR")) {
        router.push("/moderator");
      } else {
        router.push("/profile");
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Login failed. Please check your credentials."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 text-[var(--fv-ink)] font-sans"
      style={{
        background: "linear-gradient(90deg, rgba(16, 20, 15, 0.04) 1px, transparent 1px), var(--fv-paper)",
        backgroundSize: "28px 28px"
      }}
    >
      <div className="w-full max-w-6xl bg-white border border-[var(--fv-line)] rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 min-h-[650px] transform transition-all duration-300">
        
        {/* Form Section */}
        <div className="p-8 md:p-14 flex flex-col justify-between h-full bg-[#faf9f6]">
          <div>
            <div className="flex items-center gap-2 mb-10">
              <span className="w-8 h-8 rounded-full bg-[var(--fv-clay)] flex items-center justify-center text-white font-serif font-black text-sm tracking-wider">
                F
              </span>
              <span className="font-serif font-black text-xl tracking-tight text-[var(--fv-ink)]">
                Football Verse
              </span>
            </div>

            <div className="mb-10">
              <h2 className="font-serif font-black text-4xl text-[var(--fv-ink)] tracking-tight mb-3">
                Welcome Back
              </h2>
              <p className="text-xs md:text-sm text-[var(--fv-muted)] font-serif italic">
                Sign in to join the predictions and community
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--fv-muted)]">Email Address</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-[var(--fv-line)] bg-white text-[var(--fv-ink)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--fv-clay)] focus:border-[var(--fv-clay)] transition-all-300 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--fv-muted)]">Password</label>
                  <Link href="#" className="text-[10px] font-bold text-[var(--fv-clay)] hover:underline transition-all-300">
                    Forgot Password?
                  </Link>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="w-full px-4 py-3.5 rounded-xl text-sm border border-[var(--fv-line)] bg-white text-[var(--fv-ink)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--fv-clay)] focus:border-[var(--fv-clay)] transition-all-300 font-medium"
                />
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-semibold text-red-700">
                    ⚠️ {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--fv-clay)] text-white hover:opacity-95 disabled:opacity-50 transition-all-300 shadow-md shadow-[var(--fv-clay)]/10 hover:shadow-[var(--fv-clay)]/20 active:scale-[0.98]"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          <div className="mt-10 pt-6 border-t border-[var(--fv-line)] flex items-center justify-between text-xs text-[var(--fv-muted)] font-medium">
            <span>Don't have an account?</span>
            <Link href="/register" className="font-bold text-[var(--fv-clay)] hover:underline transition-all-300">
              Register here
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
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--fv-ink)]/90 via-[var(--fv-ink)]/50 to-transparent"></div>
          <div className="absolute bottom-14 left-14 right-14 z-20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--fv-grass)] mb-3 inline-block">
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

      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-[var(--fv-muted)] font-medium z-10 pointer-events-none">
        By logging in, you agree to our{" "}
        <Link href="#" className="hover:underline pointer-events-auto">Terms of Service</Link> and{" "}
        <Link href="#" className="hover:underline pointer-events-auto">Privacy Policy</Link>.
      </div>

    </div>
  );
}
