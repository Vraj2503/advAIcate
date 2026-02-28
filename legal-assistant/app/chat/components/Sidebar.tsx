"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  MessageSquare,
  User,
  LogOut,
  Home,
  Scale,
} from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../contexts/ThemeContext";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatTitle: string | null;
  onNewChat: () => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  chatTitle,
  onNewChat,
}: SidebarProps) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);

  const isLight = theme === "light";

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Toggle button (always visible when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className={`fixed top-4 left-4 z-50 p-2 rounded-lg transition-all duration-200
            ${isLight
              ? "bg-white/80 hover:bg-orange-50 text-slate-600 shadow-sm border border-slate-200"
              : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 shadow-sm border border-slate-700"
            } backdrop-blur-sm`}
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 ease-in-out
          w-72
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isLight
            ? "bg-white/95 border-r border-slate-200"
            : "bg-slate-900/95 border-r border-slate-700/60"
          } backdrop-blur-xl`}
      >
        {/* Top section */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isLight ? "border-slate-100" : "border-slate-800"
        }`}>
          <Link href="/" className="flex items-center space-x-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? "bg-orange-600" : "bg-blue-600"}`}>
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className={`text-base font-mono font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>
              advAIcate
            </span>
          </Link>
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight
                ? "hover:bg-slate-100 text-slate-500"
                : "hover:bg-slate-800 text-slate-400"
            }`}
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
              ${isLight
                ? "bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat history (placeholder for future) */}
        <div className="flex-1 overflow-y-auto px-3 py-1">
          <p className={`text-xs font-medium uppercase tracking-wider px-3 mb-2 ${
            isLight ? "text-slate-400" : "text-slate-500"
          }`}>
            Recent
          </p>
          {chatTitle && (
            <div className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm ${
              isLight
                ? "bg-orange-50/60 text-slate-700"
                : "bg-slate-800/60 text-slate-300"
            }`}>
              <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
              <span className="truncate">{chatTitle}</span>
            </div>
          )}
        </div>

        {/* Bottom section - User info and Theme toggle */}
        <div className={`p-3 border-t space-y-2 ${
          isLight ? "border-slate-100" : "border-slate-800"
        }`}>
          {/* Home link */}
          <Link
            href="/"
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isLight
                ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>

          {/* Theme toggle row */}
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
            isLight ? "text-slate-600" : "text-slate-400"
          }`}>
            <span className="text-sm font-medium">Theme</span>
            <ThemeToggle />
          </div>

          {/* User info */}
          {session?.user && (
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
              isLight ? "bg-slate-50" : "bg-slate-800/60"
            }`}>
              <div className="flex items-center space-x-3 min-w-0">
                {session.user.image && !imageError ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={28}
                    height={28}
                    className="rounded-full flex-shrink-0"
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isLight ? "bg-orange-600" : "bg-blue-600"
                  }`}>
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <span className={`text-sm font-medium truncate ${
                  isLight ? "text-slate-700" : "text-slate-300"
                }`}>
                  {session.user.name?.split(" ")[0] || "User"}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  isLight
                    ? "hover:bg-slate-200 text-slate-500"
                    : "hover:bg-slate-700 text-slate-400"
                }`}
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
