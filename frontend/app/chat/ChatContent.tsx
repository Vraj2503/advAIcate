"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Scale } from "lucide-react";

import Sidebar from "./components/Sidebar";
import { ChatMessages } from "./components/Chat/ChatMessages";
import { ChatInput } from "./components/Chat/ChatInput";
import { useFileUpload } from "./hooks/useFileUpload";
import { useTheme } from "../contexts/ThemeContext";
import { Message } from "./types/chat";
import { apiFetch } from "@/lib/api";

const Chat = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const isLight = theme === "light";

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasRedirected = useRef(false);
  const loadingAuth = status === "loading";

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | null>(null);

  const hasMessages = messages.length > 0;

  // Track whether any bot message is currently animating (for the stop button)
  const isAnyAnimating = messages.some((m) => m.role === "bot" && m.isAnimating && !m.isStopped);

  const { uploadedFiles, handleFileUpload, removeFile, clearFiles } = useFileUpload({
    onSuccess: () => {},
    onError: () => {},
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
      <div className={`h-screen flex items-center justify-center ${
        isLight
          ? "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50"
          : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      }`}>
        <div className={`w-10 h-10 border-3 rounded-full animate-spin ${
          isLight
            ? "border-orange-200 border-t-orange-600"
            : "border-slate-700 border-t-blue-500"
        }`} />
      </div>
    );
  }

  if (!session) return null;

  /* ==================== RENDER ==================== */

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${
      isLight
        ? "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50"
        : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    }`}>
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
          <div className={`flex items-center justify-center py-3 px-4 flex-shrink-0 ${
            isLight ? "border-b border-slate-100" : "border-b border-slate-800"
          }`}>
            {/* Spacer for sidebar toggle */}
            <div className="w-10" />
            <h1 className={`text-sm font-medium truncate max-w-md text-center flex-1 ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}>
              {chatTitle || "New Chat"}
            </h1>
            <div className="w-10" />
          </div>
        )}

        {/* Chat area: centered when empty, full-page when active */}
        {!hasMessages ? (
          /* ========== EMPTY STATE — centered like Claude ========== */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="max-w-2xl w-full text-center mb-8">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                isLight
                  ? "bg-gradient-to-br from-orange-100 to-amber-100"
                  : "bg-gradient-to-br from-slate-700 to-slate-600"
              }`}>
                <Scale className={`w-7 h-7 ${
                  isLight ? "text-orange-600" : "text-orange-400"
                }`} />
              </div>
              <h1 className={`text-3xl sm:text-4xl font-light mb-3 ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}>
                What can I help with?
              </h1>
              <p className={`text-base font-light ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}>
                Ask me anything about legal matters — contracts, compliance, case law, and more.
              </p>
            </div>

            {/* Centered input */}
            <div className="w-full max-w-2xl">
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
            <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl">
              {[
                "Review my contract terms",
                "Explain tenant rights",
                "What is fair use?",
                "Help draft an NDA",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSendMessage(suggestion)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isLight
                      ? "bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50 shadow-sm"
                      : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100 hover:bg-slate-700/80"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <p className={`text-xs mt-8 ${
              isLight ? "text-slate-400" : "text-slate-500"
            }`}>
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
