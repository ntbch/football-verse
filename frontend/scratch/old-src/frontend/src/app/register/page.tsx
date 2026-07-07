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
      const auth = await data<AuthResponse>(
        http.post("/auth/register", parsed.data)
      );
      setAuth(auth);
      router.push("/profile");
    } catch (err) {
      setGlobalError(apiErrorMessage(err, "Registration failed."));
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
            <div className="flex items-center gap-2 mb-8">
              <span className="w-8 h-8 rounded-full bg-[var(--fv-clay)] flex items-center justify-center text-white font-serif font-black text-sm tracking-wider">
                F
              </span>
              <span className="font-serif font-black text-xl tracking-tight text-[var(--fv-ink)]">
                Football Verse
              </span>
            </div>

            <div className="mb-8">
              <h2 className="font-serif font-black text-4xl text-[var(--fv-ink)] tracking-tight mb-2">
                Create Account
              </h2>
              <p className="text-xs md:text-sm text-[var(--fv-muted)] font-serif italic">
                Join us to share news, comment, and predict scores
              </p>
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--fv-muted)]">Email Address</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors?.email) setErrors({ ...errors, email: undefined });
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-sm border bg-white text-[var(--fv-ink)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--fv-clay)] focus:border-[var(--fv-clay)] transition-all-300 font-medium ${
                    errors?.email ? "border-red-400" : "border-[var(--fv-line)]"
                  }`}
                />
                {errors?.email && (
                  <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.email}</span>
                )}
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--fv-muted)]">Username</label>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errors?.username) setErrors({ ...errors, username: undefined });
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-sm border bg-white text-[var(--fv-ink)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--fv-clay)] focus:border-[var(--fv-clay)] transition-all-300 font-medium ${
                    errors?.username ? "border-red-400" : "border-[var(--fv-line)]"
                  }`}
                />
                {errors?.username && (
                  <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.username}</span>
                )}
              </div>

              <div className="flex flex-col gap-1 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--fv-muted)]">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors?.password) setErrors({ ...errors, password: undefined });
                  }}
                  className={`w-full px-4 py-3 rounded-xl text-sm border bg-white text-[var(--fv-ink)] placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--fv-clay)] focus:border-[var(--fv-clay)] transition-all-300 font-medium ${
                    errors?.password ? "border-red-400" : "border-[var(--fv-line)]"
                  }`}
                />
                {errors?.password && (
                  <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.password}</span>
                )}
              </div>

              {globalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-semibold text-red-700">
                    ⚠️ {globalError}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--fv-clay)] text-white hover:opacity-95 disabled:opacity-50 transition-all-300 shadow-md shadow-[var(--fv-clay)]/10 hover:shadow-[var(--fv-clay)]/20 active:scale-[0.98] mt-2"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--fv-line)] flex items-center justify-between text-xs text-[var(--fv-muted)] font-medium">
            <span>Already have an account?</span>
            <Link href="/login" className="font-bold text-[var(--fv-clay)] hover:underline transition-all-300">
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
        By registering, you agree to our{" "}
        <Link href="#" className="hover:underline pointer-events-auto">Terms of Service</Link> and{" "}
        <Link href="#" className="hover:underline pointer-events-auto">Privacy Policy</Link>.
      </div>

    </div>
  );
}
