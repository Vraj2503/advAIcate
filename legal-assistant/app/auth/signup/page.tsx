"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Scale, Zap, Eye, EyeOff, Mail } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeToggle from "../../components/ThemeToggle";

export default function SignUp() {
  const [form, setForm] = useState({ 
    username: "", 
    email: "", 
    password: "", 
    confirmPassword: "" 
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "verification">("details");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      setStep("verification");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          token: otp,
          username: form.username,
          password: form.password, // Pass the password here
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      router.push("/auth/signin?message=Account created successfully");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border outline-none transition-all ${
    isLight
      ? "bg-orange-50 border-orange-200 text-slate-900 focus:border-orange-400"
      : "bg-slate-700 border-slate-600 text-slate-100 focus:border-orange-500"
  }`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      isLight 
        ? "bg-gradient-to-br from-orange-50 to-yellow-50" 
        : "bg-gradient-to-br from-slate-900 to-slate-800"
    }`}>
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isLight ? "bg-orange-600" : "bg-blue-600"
            }`}>
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold ${
              isLight 
                ? "bg-gradient-to-r from-orange-600 to-amber-600 text-transparent bg-clip-text" 
                : "text-slate-100"
            }`}>
              advAIcate
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className={`p-6 rounded-2xl shadow-xl border ${
          isLight 
            ? "bg-white border-orange-100" 
            : "bg-slate-800/90 border-slate-700"
        }`}>
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs mb-4 ${
              isLight 
                ? "bg-orange-100 text-orange-800" 
                : "bg-orange-950/60 text-orange-300"
            }`}>
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered Legal Assistant
            </div>
            
            <h1 className={`text-2xl font-light mb-2 ${
              isLight ? "text-slate-900" : "text-slate-100"
            }`}>
              {step === "details" ? "Create Account" : "Verify Your Email"}
            </h1>
            
            <p className={`text-sm ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}>
              {step === "details" 
                ? "Join thousands using AI for legal guidance"
                : `Enter the 6-digit code sent to ${form.email}`
              }
            </p>
          </div>

          {/* Forms */}
          {step === "details" ? (
            <>
              {/* Registration Form */}
              <form onSubmit={handleSendOTP} className="space-y-4">
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
                
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
                
                {/* Password Input */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
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

                {/* Confirm Password Input */}
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={handleChange}
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

                {error && (
                  <div className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-950/20 p-2 rounded">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    isLight 
                      ? "bg-orange-600 hover:bg-orange-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white disabled:opacity-50`}
                >
                  {isLoading ? "Sending OTP..." : "Send Verification Code"}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-slate-300 dark:border-slate-600" />
                <span className="mx-3 text-xs text-slate-400">or</span>
                <div className="flex-grow border-t border-slate-300 dark:border-slate-600" />
              </div>

              {/* Google Sign Up */}
              <Button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                  isLight
                    ? "bg-white border border-slate-300 text-slate-900 hover:bg-slate-50"
                    : "bg-slate-700 border border-slate-600 text-slate-100 hover:bg-slate-600"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              {/* Sign In Link */}
              <p className={`text-xs text-center mt-4 ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}>
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className={`underline transition-colors ${
                    isLight ? "hover:text-orange-600" : "hover:text-orange-400"
                  }`}
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              {/* OTP Verification Form */}
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length <= 6) setOtp(value);
                    }}
                    required
                    maxLength={6}
                    className={`${inputClass} text-center text-lg tracking-widest font-mono`}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>

                {error && (
                  <div className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-950/20 p-2 rounded">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    isLight 
                      ? "bg-orange-600 hover:bg-orange-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white disabled:opacity-50`}
                >
                  {isLoading ? "Verifying..." : "Verify & Create Account"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setOtp("");
                    setError(null);
                  }}
                  className={`w-full text-sm transition-colors ${
                    isLight 
                      ? "text-slate-600 hover:text-orange-600" 
                      : "text-slate-400 hover:text-orange-400"
                  }`}
                >
                  ← Back to details
                </button>
              </form>

              {/* Resend OTP */}
              <div className="text-center mt-4">
                <button
                  onClick={() => handleSendOTP({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={isLoading}
                  className={`text-xs transition-colors ${
                    isLight 
                      ? "text-slate-500 hover:text-orange-600" 
                      : "text-slate-400 hover:text-orange-400"
                  } disabled:opacity-50`}
                >
                  Didn't receive code? Resend
                </button>
              </div>
            </>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className={`text-sm transition-colors ${
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