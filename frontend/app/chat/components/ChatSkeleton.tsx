"use client";
import { useTheme } from "../../contexts/ThemeContext";

export function ChatSkeleton() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`h-screen flex flex-col items-center justify-center ${
      isLight
        ? "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50"
        : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    }`}>
      {/* Icon skeleton */}
      <div className={`w-14 h-14 rounded-2xl mb-6 animate-pulse ${
        isLight ? "bg-orange-100" : "bg-slate-700"
      }`} />
      {/* Title skeleton */}
      <div className={`h-8 w-64 rounded-lg mb-3 animate-pulse ${
        isLight ? "bg-orange-100/70" : "bg-slate-700/50"
      }`} />
      {/* Subtitle skeleton */}
      <div className={`h-4 w-80 rounded mb-8 animate-pulse ${
        isLight ? "bg-orange-100/50" : "bg-slate-700/30"
      }`} />
      {/* Input skeleton */}
      <div className={`w-full max-w-2xl h-20 rounded-2xl animate-pulse mx-4 ${
        isLight ? "bg-white/80 border border-slate-200" : "bg-slate-800/60 border border-slate-700"
      }`} />
    </div>
  );
}