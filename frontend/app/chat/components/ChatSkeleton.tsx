"use client";

export function ChatSkeleton() {
  return (
    <div
      className="h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      {/* Icon skeleton */}
      <div
        className="w-16 h-16 rounded-2xl mb-6 animate-pulse"
        style={{ background: "var(--onyx-soft)" }}
      />
      {/* Title skeleton */}
      <div
        className="h-8 w-64 rounded-lg mb-3 animate-pulse"
        style={{ background: "var(--onyx-soft)" }}
      />
      {/* Subtitle skeleton */}
      <div
        className="h-4 w-80 rounded mb-8 animate-pulse"
        style={{ background: "var(--onyx-soft)", opacity: 0.6 }}
      />
      {/* Input skeleton */}
      <div
        className="w-full max-w-3xl h-20 rounded-2xl animate-pulse mx-4"
        style={{
          background: "var(--onyx-soft)",
          border: "1px solid var(--onyx-muted)",
        }}
      />
    </div>
  );
}