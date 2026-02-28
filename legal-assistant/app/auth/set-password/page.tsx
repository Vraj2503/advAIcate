"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Scale, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Guard: redirect if no Supabase session or password already set
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/auth/signin");
        return;
      }
      if (data.session.user.user_metadata?.password_set === true) {
        // Already has a password → bridge and go to chat
        await signIn("credentials", {
          access_token: data.session.access_token,
          redirect: false,
        });
        router.replace("/chat");
        return;
      }
      setChecking(false);
    };
    check();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password and mark password_set
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.refreshSession();

      // Refresh session to get updated metadata
      const { data: refreshed } = await supabase.auth.getSession();
      if (!refreshed.session) {
        setError("Session lost. Please sign in again.");
        router.replace("/auth/signin");
        return;
      }

      // Bridge Supabase → NextAuth
      await signIn("credentials", {
        access_token: refreshed.session.access_token,
        redirect: false,
      });

      router.replace("/chat");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none transition-all ${
    isLight
      ? "bg-orange-50 border-orange-200 text-slate-900 focus:border-orange-400"
      : "bg-slate-700 border-slate-600 text-slate-100 focus:border-orange-500"
  }`;

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        isLight
          ? "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50"
          : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      }`}
    >
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isLight ? "bg-orange-600" : "bg-blue-600"
              }`}
            >
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span
              className={`text-xl font-bold ${
                isLight
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-transparent bg-clip-text"
                  : "text-slate-100"
              }`}
            >
              advAIcate
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          className={`p-8 rounded-2xl shadow-xl border ${
            isLight
              ? "bg-white border-orange-100"
              : "bg-slate-800/90 backdrop-blur-sm border-slate-700"
          }`}
        >
          <div className="text-center mb-6">
            <h1
              className={`text-2xl font-light mb-2 ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}
            >
              Set Your Password
            </h1>
            <p
              className={`text-sm ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}
            >
              Create a password so you can sign in with email &amp; password
              next time.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-3 rounded-lg text-sm text-center mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                isLight
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white disabled:opacity-50`}
            >
              {isLoading ? "Saving..." : "Set Password & Continue"}
            </Button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className={`text-sm transition-colors font-light ${
              isLight
                ? "text-slate-500 hover:text-orange-600"
                : "text-slate-400 hover:text-orange-400"
            }`}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
