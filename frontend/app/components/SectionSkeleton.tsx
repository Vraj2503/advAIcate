"use client";
import { useTheme } from "../contexts/ThemeContext";

interface SectionSkeletonProps {
  height?: string;
}

/** A generic section placeholder skeleton for lazy-loaded sections */
export default function SectionSkeleton({ height = "400px" }: SectionSkeletonProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{ minHeight: height }}
      className={`flex items-center justify-center ${
        theme === "light" ? "bg-orange-50/30" : "bg-slate-800/20"
      }`}
    >
      <div className="space-y-4 w-full max-w-4xl mx-auto px-4">
        <div
          className={`h-8 w-1/3 mx-auto rounded-lg animate-pulse ${
            theme === "light" ? "bg-orange-100" : "bg-slate-700/50"
          }`}
        />
        <div
          className={`h-4 w-2/3 mx-auto rounded animate-pulse ${
            theme === "light" ? "bg-orange-100/70" : "bg-slate-700/30"
          }`}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`h-32 rounded-xl animate-pulse ${
                theme === "light" ? "bg-orange-100/50" : "bg-slate-700/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
