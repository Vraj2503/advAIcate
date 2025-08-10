"use client";
import { useTheme } from "../../contexts/ThemeContext";

export function ChatSkeleton() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex flex-col ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50' 
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    }`}>
      {/* Header Skeleton */}
      <div className={`h-16 border-b ${
        theme === 'light' ? 'bg-white border-orange-100' : 'bg-slate-800 border-slate-700'
      }`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className={`h-8 w-32 rounded ${
            theme === 'light' ? 'bg-orange-100' : 'bg-slate-700'
          } animate-pulse`} />
          <div className={`h-8 w-24 rounded ${
            theme === 'light' ? 'bg-orange-100' : 'bg-slate-700'
          } animate-pulse`} />
        </div>
      </div>

      {/* Chat Container Skeleton */}
      <div className="flex-1 container mx-auto px-4 py-3 max-w-5xl">
        <div className={`rounded-xl shadow-lg flex flex-col h-[600px] ${
          theme === 'light' ? 'bg-white border border-orange-100' : 'bg-slate-800 border-slate-700'
        }`}>
          {/* Messages Area */}
          <div className="flex-1 p-4 space-y-4">
            {/* Bot Message Skeleton */}
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full ${
                theme === 'light' ? 'bg-orange-100' : 'bg-slate-700'
              } animate-pulse`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-3/4 rounded ${
                  theme === 'light' ? 'bg-orange-100' : 'bg-slate-700'
                } animate-pulse`} />
                <div className={`h-4 w-1/2 rounded ${
                  theme === 'light' ? 'bg-orange-100' : 'bg-slate-700'
                } animate-pulse`} />
              </div>
            </div>

            {/* Loading indicator */}
            <div className="flex justify-center">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin ${
                theme === 'light' 
                  ? 'border-orange-300 border-t-orange-600' 
                  : 'border-slate-600 border-t-orange-500'
              }`} />
            </div>
          </div>

          {/* Input Area Skeleton */}
          <div className={`p-4 border-t ${
            theme === 'light' ? 'border-orange-100' : 'border-slate-700'
          }`}>
            <div className={`h-12 rounded-lg ${
              theme === 'light' ? 'bg-orange-50' : 'bg-slate-700'
            } animate-pulse`} />
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className={`h-16 border-t ${
        theme === 'light' ? 'bg-white border-orange-100' : 'bg-slate-800 border-slate-700'
      }`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-center">
          <div className={`h-4 w-48 rounded ${
            theme === 'light' ? 'bg-orange-100' : 'bg-slate-700'
          } animate-pulse`} />
        </div>
      </div>
    </div>
  );
}