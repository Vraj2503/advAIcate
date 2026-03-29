"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2,
} from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../contexts/ThemeContext";
import { apiFetch } from "@/lib/api";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status?: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  chatTitle: string | null;
  onNewChat: () => void;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string, title: string) => void;
}

export default function Sidebar({
  isOpen,
  onToggle,
  chatTitle,
  onNewChat,
  currentSessionId,
  onSelectSession,
}: SidebarProps) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const isLight = theme === "light";
  const hasUser = !!session?.user;
  const isFetchingRef = useRef(false);

  // Fetch chat sessions from Supabase via backend API
  const fetchSessions = useCallback(async () => {
    if (!hasUser || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoadingSessions(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await apiFetch(`${apiUrl}/api/sessions`);
      const data = await response.json();

      if (response.ok && data.success) {
        setChatSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to fetch chat sessions:", error);
    } finally {
      setIsLoadingSessions(false);
      isFetchingRef.current = false;
    }
  }, [hasUser]);

  // Fetch on mount and refresh when sidebar opens
  useEffect(() => {
    if (hasUser && isOpen) {
      fetchSessions();
    }
  }, [isOpen, hasUser, fetchSessions]);

  // Format relative time for session timestamps
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-3 py-1 chat-scrollbar-minimal">
          <p className={`text-xs font-medium uppercase tracking-wider px-3 mb-2 ${
            isLight ? "text-slate-400" : "text-slate-500"
          }`}>
            Recent
          </p>

          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`w-5 h-5 animate-spin ${
                isLight ? "text-slate-400" : "text-slate-500"
              }`} />
            </div>
          ) : chatSessions.length === 0 && !chatTitle ? (
            <p className={`text-xs px-3 py-4 text-center ${
              isLight ? "text-slate-400" : "text-slate-500"
            }`}>
              No chat history yet
            </p>
          ) : (
            <div className="space-y-1">
              {chatSessions.map((s) => {
                const isActive = s.id === currentSessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectSession(s.id, s.title)}
                    className={`w-full flex items-start space-x-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-150 group ${
                      isActive
                        ? isLight
                          ? "bg-orange-50 text-orange-800 border border-orange-200"
                          : "bg-slate-800 text-slate-100 border border-slate-600"
                        : isLight
                          ? "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                    title={s.title}
                  >
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      isActive
                        ? isLight ? "text-orange-600" : "text-orange-400"
                        : "opacity-50 group-hover:opacity-80"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{s.title}</span>
                      <span className={`text-[11px] mt-0.5 block ${
                        isLight ? "text-slate-400" : "text-slate-500"
                      }`}>
                        {formatRelativeTime(s.updated_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
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
