"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
  const [imageError, setImageError] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

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

  // Delete a chat session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Don't trigger the select handler
    if (deletingSessionId) return; // Already deleting

    setDeletingSessionId(sessionId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await apiFetch(`${apiUrl}/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from local state
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
        // If the deleted session was the current one, start a new chat
        if (sessionId === currentSessionId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setDeletingSessionId(null);
    }
  };

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
          className="fixed top-4 left-4 z-50 p-2.5 rounded-lg transition-all duration-200 backdrop-blur-sm hover:brightness-125"
          style={{
            background: "var(--onyx-soft)",
            border: "1px solid var(--onyx-muted)",
            color: "var(--foreground)",
          }}
          aria-label="Open sidebar"
        >
          {/* Hamburger menu SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 ease-in-out
          w-72
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          backdrop-blur-xl`}
        style={{
          background: "var(--background)",
          borderRight: "1px solid var(--onyx-soft)",
        }}
      >
        {/* Top section */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--onyx-soft)" }}
        >
          <Link href="/?home=true" className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--onyx-soft)" }}
            >
              {/* Scales SVG */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sealing-wax)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M2 7h20" />
                <path d="M5 7l-2 9h6L7 7" />
                <path d="M17 7l-2 9h6l-2-9" />
              </svg>
            </div>
            <span
              className="text-base font-bold"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-serif)" }}
            >
              advAIcate
            </span>
          </Link>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg transition-all duration-200 hover:bg-[var(--onyx-soft)]"
            style={{ color: "var(--parchment-muted)" }}
            aria-label="Close sidebar"
          >
            {/* Close X SVG */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* New Chat button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:brightness-125 hover:shadow-md"
            style={{
              background: "var(--onyx-soft)",
              border: "1px solid var(--onyx-muted)",
              color: "var(--foreground)",
              fontFamily: "var(--font-typewriter)",
            }}
          >
            {/* Plus SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat history */}
        <div className="flex-1 overflow-y-auto px-3 py-1 chat-scrollbar-minimal">
          <p
            className="text-xs font-medium uppercase tracking-wider px-3 mb-2"
            style={{ color: "var(--parchment-muted)", fontFamily: "var(--font-typewriter)" }}
          >
            Recent
          </p>

          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2
                className="w-5 h-5 animate-spin"
                style={{ color: "var(--parchment-muted)" }}
              />
            </div>
          ) : chatSessions.length === 0 && !chatTitle ? (
            <p
              className="text-xs px-3 py-4 text-center"
              style={{ color: "var(--parchment-muted)", fontFamily: "var(--font-typewriter)" }}
            >
              No chat history yet
            </p>
          ) : (
            <div className="space-y-1">
              {chatSessions.map((s) => {
                const isActive = s.id === currentSessionId;
                const isDeleting = s.id === deletingSessionId;
                return (
                  <div
                    key={s.id}
                    className="relative group"
                  >
                    <button
                      onClick={() => onSelectSession(s.id, s.title)}
                      className="w-full flex items-start space-x-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150"
                      style={{
                        background: isActive ? "var(--onyx-soft)" : "transparent",
                        border: isActive ? "1px solid var(--onyx-muted)" : "1px solid transparent",
                        color: isActive ? "var(--sealing-wax)" : "var(--parchment-muted)",
                        fontFamily: "var(--font-typewriter)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "var(--onyx-soft)";
                          e.currentTarget.style.borderColor = "var(--onyx-muted)";
                          e.currentTarget.style.color = "var(--foreground)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "transparent";
                          e.currentTarget.style.color = "var(--parchment-muted)";
                        }
                      }}
                      title={s.title}
                    >
                      {/* Message icon SVG */}
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke={isActive ? "var(--sealing-wax)" : "currentColor"}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="flex-shrink-0 mt-0.5"
                        style={{ opacity: isActive ? 1 : 0.5 }}
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0 pr-6">
                        <span className="truncate block">{s.title}</span>
                        <span
                          className="text-[11px] mt-0.5 block"
                          style={{ color: "var(--parchment-muted)" }}
                        >
                          {formatRelativeTime(s.updated_at)}
                        </span>
                      </div>
                    </button>
                    {/* Delete button — appears on hover */}
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-150 opacity-0 group-hover:opacity-100"
                      style={{
                        color: "var(--parchment-muted)",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#ef4444";
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--parchment-muted)";
                        e.currentTarget.style.background = "transparent";
                      }}
                      aria-label={`Delete chat: ${s.title}`}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom section - User info */}
        <div
          className="p-3 space-y-2"
          style={{ borderTop: "1px solid var(--onyx-soft)" }}
        >
          {/* Home link */}
          <Link
            href="/?home=true"
            className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ color: "var(--parchment-muted)", fontFamily: "var(--font-typewriter)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--onyx-soft)";
              e.currentTarget.style.color = "var(--foreground)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--parchment-muted)";
            }}
          >
            {/* Home SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </Link>

          {/* User info */}
          {session?.user && (
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-lg"
              style={{ background: "var(--onyx-soft)" }}
            >
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
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--sealing-wax)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  {session.user.name?.split(" ")[0] || "User"}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="p-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
                style={{ color: "var(--parchment-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ef4444";
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--parchment-muted)";
                  e.currentTarget.style.background = "transparent";
                }}
                aria-label="Sign out"
              >
                {/* Logout SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
