"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

import Sidebar from "./components/Sidebar";
import { ChatMessages } from "./components/Chat/ChatMessages";
import { ChatInput } from "./components/Chat/ChatInput";
import { useFileUpload } from "./hooks/useFileUpload";
import { Message } from "./types/chat";
import { apiFetch } from "@/lib/api";

const Chat = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasRedirected = useRef(false);
  const loadingAuth = status === "loading";

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | null>(null);

  // Rename states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const hasMessages = messages.length > 0;

  // Track whether any bot message is currently animating (for the stop button)
  const isAnyAnimating = messages.some((m) => m.role === "bot" && m.isAnimating && !m.isStopped);

  const { uploadedFiles, handleFileUpload, removeFile, clearFiles } = useFileUpload({
    onSuccess: () => { },
    onError: () => { },
  });

  /* ==================== AUTH ==================== */

  useEffect(() => {
    if (!loadingAuth && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/auth/signin");
    }
  }, [loadingAuth, session, router]);

  /* ==================== SCROLL ==================== */

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  /* ==================== FILE UPLOAD ==================== */

  const [sessionId, setSessionId] = useState<string | null>(null);

  const uploadFilesToBackend = async (files: File[]): Promise<boolean> => {
    if (files.length === 0) return true;

    try {
      const apiUrl = ""; // Uses Next.js rewrites proxy

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        if (sessionId) {
          formData.append("session_id", sessionId);
        }

        const uploadResponse = await apiFetch(`${apiUrl}/api/upload`, {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          console.error(`Failed to upload ${file.name}:`, uploadData.error);
          return false;
        }

        if (uploadData.session_id && !sessionId) {
          setSessionId(uploadData.session_id);
        }
      }

      return true;
    } catch (error) {
      console.error("Error uploading files:", error);
      return false;
    }
  };

  /* ==================== CHAT ==================== */

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !session?.user) return;

    // Upload files before sending message
    if (uploadedFiles.length > 0) {
      const uploadSuccess = await uploadFilesToBackend(uploadedFiles);
      if (!uploadSuccess) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-error-${Date.now()}`,
            role: "bot",
            content: "Failed to upload one or more files. Please try again.",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        return;
      }
    }

    // Set chat title from first message
    if (!chatTitle) {
      const title = message.length > 50 ? message.substring(0, 50) + "…" : message;
      setChatTitle(title);
    }

    // Capture attached files before clearing
    const attachedFiles = uploadedFiles.map((f) => ({ name: f.name, size: f.size }));

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toLocaleTimeString(),
      files: attachedFiles.length > 0 ? attachedFiles : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Clear file previews from the input bar now that they're attached to the message
    if (attachedFiles.length > 0) {
      clearFiles();
    }

    try {
      const apiUrl =
        ""; // Uses Next.js rewrites proxy

      const response = await apiFetch(`${apiUrl}/api/chat`, {
        method: "POST",
        body: JSON.stringify({
          message,
          uploaded_files: uploadedFiles.map((file) => ({
            name: file.name,
            size: file.size,
          })),
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setIsTyping(false);

      // Persist session_id from backend so subsequent messages use the same session
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
          isAnimating: true,
          isStopped: false,
        },
      ]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          role: "bot",
          content:
            "Sorry, something went wrong while contacting the server. Please try again.",
          timestamp: new Date().toLocaleTimeString(),
          isAnimating: true,
          isStopped: false,
        },
      ]);
    }
  };

  const handleAnimationComplete = (messageId: string | number) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isAnimating: false } : m
      )
    );
  };

  const handleCharacterAdded = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  };

  /* ==================== STOP RESPONSE ==================== */

  const handleStopResponse = useCallback(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "bot" && m.isAnimating && !m.isStopped
          ? { ...m, isStopped: true }
          : m
      )
    );
  }, []);

  /* ==================== EDIT MESSAGE ==================== */

  const handleEditMessage = useCallback(
    (messageId: string | number, newContent: string) => {
      // Find the index of the message being edited
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;

      // Remove this message and everything after it
      setMessages((prev) => prev.slice(0, idx));

      // Re-send with the new content (slight delay so state settles)
      setTimeout(() => {
        handleSendMessage(newContent);
      }, 50);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, session, sessionId, chatTitle, uploadedFiles]
  );

  const handleNewChat = () => {
    setMessages([]);
    setChatTitle(null);
    setSessionId(null);
    setSidebarOpen(false);
  };

  const handleSelectSession = async (selectedSessionId: string, title: string) => {
    // If same session, just close sidebar
    if (selectedSessionId === sessionId) {
      setSidebarOpen(false);
      return;
    }

    // Set the selected session
    setSessionId(selectedSessionId);
    setChatTitle(title);
    setMessages([]);
    setSidebarOpen(false);

    // Load messages for this session from the backend
    try {
      const apiUrl = ""; // Uses Next.js rewrites proxy
      const response = await apiFetch(`${apiUrl}/api/sessions/${selectedSessionId}/messages`);
      const data = await response.json();

      if (response.ok && data.messages) {
        const loadedMessages: Message[] = data.messages.map((msg: any, index: number) => ({
          id: msg.id || `loaded-${index}`,
          role: msg.role === "assistant" ? "bot" : msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString(),
          isAnimating: false,
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Failed to load session messages:", error);
    }
  };

  /* ==================== LOADING ==================== */

  if (loadingAuth) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{
            border: "3px solid var(--onyx-soft)",
            borderTopColor: "var(--sealing-wax)",
          }}
        />
      </div>
    );
  }

  /* ==================== RENAME ==================== */

  const handleRenameSubmit = async () => {
    if (!sessionId) return;
    const trimmed = editTitleValue.trim();
    if (!trimmed || trimmed === chatTitle) {
      setIsEditingTitle(false);
      return;
    }

    setIsRenaming(true);
    try {
      const apiUrl = ""; // Uses Next.js rewrites proxy
      const response = await apiFetch(`${apiUrl}/api/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename session");
      }

      setChatTitle(trimmed);
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Error renaming chat:", err);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setIsEditingTitle(false);
    }
  };

  if (!session) return null;

  /* ==================== RENDER ==================== */

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        chatTitle={chatTitle}
        onNewChat={handleNewChat}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top bar with chat title */}
        {hasMessages && (
          <div
            className="flex items-center justify-center py-3 px-4 flex-shrink-0 group"
            style={{ borderBottom: "1px solid var(--onyx-soft)" }}
          >
            <div className="w-10" />
            <div className="flex-1 flex justify-center items-center gap-2 max-w-md">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <input
                    type="text"
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    disabled={isRenaming}
                    className="flex-1 bg-transparent text-sm font-medium text-center focus:outline-none border-b border-white/20 pb-0.5"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "var(--font-typewriter)",
                    }}
                  />
                  {isRenaming ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--parchment-muted)" }} />
                  ) : (
                    <>
                      <button onClick={handleRenameSubmit} className="p-1 hover:bg-white/5 rounded">
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      </button>
                      <button onClick={() => setIsEditingTitle(false)} className="p-1 hover:bg-white/5 rounded">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <h1
                    className="text-sm font-medium truncate text-center"
                    style={{ color: "var(--parchment-muted)", fontFamily: "var(--font-typewriter)" }}
                  >
                    {chatTitle || "New Chat"}
                  </h1>
                  {sessionId && (
                    <button
                      onClick={() => {
                        setEditTitleValue(chatTitle || "");
                        setIsEditingTitle(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded"
                      title="Rename Chat"
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: "var(--parchment-muted)" }} />
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="w-10" />
          </div>
        )}

        {/* Chat area: centered when empty, full-page when active */}
        {!hasMessages ? (
          /* ========== EMPTY STATE ========== */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="max-w-3xl w-full text-center mb-8">
              {/* Scales of Justice SVG */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "var(--onyx-soft)" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sealing-wax)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20" />
                  <path d="M2 7h20" />
                  <path d="M5 7l-2 9h6L7 7" />
                  <path d="M17 7l-2 9h6l-2-9" />
                  <circle cx="12" cy="2" r="1" fill="var(--sealing-wax)" />
                </svg>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-light mb-3"
                style={{ color: "var(--foreground)", fontFamily: "var(--font-serif)" }}
              >
                What can I help with?
              </h1>
              <p
                className="text-base font-light"
                style={{ color: "var(--parchment-muted)", fontFamily: "var(--font-typewriter)" }}
              >
                Ask me anything about legal matters — contracts, compliance, case law, and more.
              </p>
            </div>

            {/* Centered input */}
            <div className="w-full max-w-3xl">
              <ChatInput
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                uploadedFiles={uploadedFiles}
                onRemoveFile={removeFile}
                isTyping={isTyping}
                isAnimating={isAnyAnimating}
                onStopResponse={handleStopResponse}
                centered
              />
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-3xl">
              {[
                "Review my contract terms",
                "Explain tenant rights",
                "What is fair use?",
                "Help draft an NDA",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSendMessage(suggestion)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    background: "var(--onyx-soft)",
                    border: "1px solid var(--onyx-muted)",
                    color: "var(--foreground)",
                    fontFamily: "var(--font-typewriter)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--sealing-wax)";
                    e.currentTarget.style.color = "var(--sealing-wax)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--onyx-muted)";
                    e.currentTarget.style.color = "var(--foreground)";
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <p
              className="text-xs mt-8"
              style={{ color: "var(--parchment-muted)", fontFamily: "var(--font-typewriter)" }}
            >
              This AI provides general information only — not legal advice.
            </p>
          </div>
        ) : (
          /* ========== ACTIVE CHAT — full page ========== */
          <>
            <ChatMessages
              ref={chatContainerRef}
              messages={messages}
              isTyping={isTyping}
              onAnimationComplete={handleAnimationComplete}
              onCharacterAdded={handleCharacterAdded}
              onEditMessage={handleEditMessage}
            />
            <div className="flex-shrink-0">
              <ChatInput
                onSendMessage={handleSendMessage}
                onFileUpload={handleFileUpload}
                uploadedFiles={uploadedFiles}
                onRemoveFile={removeFile}
                isTyping={isTyping}
                isAnimating={isAnyAnimating}
                onStopResponse={handleStopResponse}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
