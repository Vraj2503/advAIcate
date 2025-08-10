"use client";
import { useTheme } from "../contexts/ThemeContext";
import { ChatSkeleton } from "./components/ChatSkeleton";

export default function Loading() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50' 
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    }`}>
      <div className="text-center">
        <div className={`w-12 h-12 border-3 rounded-full animate-spin mx-auto mb-4 ${
          theme === 'light' 
            ? 'border-orange-300 border-t-orange-600' 
            : 'border-slate-600 border-t-orange-500'
        }`} />
        <p className={`text-lg font-medium ${
          theme === 'light' ? 'text-slate-700' : 'text-slate-300'
        }`}>
          Loading Chat...
        </p>
        <p className={`text-sm mt-2 ${
          theme === 'light' ? 'text-slate-500' : 'text-slate-400'
        }`}>
          Preparing your AI assistant
        </p>
      </div>
    </div>
  );
}