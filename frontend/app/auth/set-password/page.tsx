"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Scale, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

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

  const inputClass = "w-full px-4 py-3 rounded-xl border outline-none transition-all bg-[var(--onyx-soft)] border-[var(--onyx-muted)] text-[var(--foreground)] focus:border-[var(--sealing-wax)]";

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--background)' }}
    >

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--onyx-soft)' }}>
              <Scale className="w-5 h-5" style={{ color: 'var(--sealing-wax)' }} />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-serif)' }}>
              advAIcate
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl shadow-xl border" style={{ background: 'var(--onyx-soft)', borderColor: 'var(--onyx-muted)' }}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-light mb-2" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-serif)' }}>
              Set Your Password
            </h1>
            <p className="text-sm" style={{ color: 'var(--parchment-muted)' }}>
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
              className="w-full py-3 rounded-xl font-medium transition-all text-white disabled:opacity-50"
              style={{ background: 'var(--sealing-wax)' }}
            >
              {isLoading ? "Saving..." : "Set Password & Continue"}
            </Button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-sm transition-colors font-light"
            style={{ color: 'var(--parchment-muted)' }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
