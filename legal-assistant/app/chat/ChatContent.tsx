"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { ChatMessages } from "./components/Chat/ChatMessages";
import { ChatInput } from "./components/Chat/ChatInput";
import { useFileUpload } from "./hooks/useFileUpload";
import { useTheme } from "../contexts/ThemeContext";
import { Message } from "./types/chat";

/* ==================== COMPONENT ==================== */

const Chat = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { data: session, status } = useSession();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasRedirected = useRef(false);
  
  const loadingAuth = status === "loading";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hello! I'm your Legal AI Assistant. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);

  const { uploadedFiles, handleFileUpload, removeFile } = useFileUpload({
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
        formData.append("user_id", session?.user?.id || "");
        formData.append("user_email", session?.user?.email || "");
        if (sessionId) {
          formData.append("session_id", sessionId);
        }

        const uploadResponse = await fetch(`${apiUrl}/api/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.user?.email}`,
          },
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          console.error(`Failed to upload ${file.name}:`, uploadData.error);
          return false;
        }

        // Store session_id from first upload
        if (uploadData.session_id && !sessionId) {
          setSessionId(uploadData.session_id);
        }

        console.log(`Successfully uploaded ${file.name}:`, uploadData);
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

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.email}`,
        },
        body: JSON.stringify({
          message,
          uploaded_files: uploadedFiles.map(file => ({
            name: file.name,
            size: file.size
          })),
          user_id: session.user.id,
          user_email: session.user.email,
          session_id: sessionId,
      }),

      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
          isAnimating: true,
        },
      ]);
    } catch (err) {
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

  /* ==================== LOADING ==================== */

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading chat…</p>
      </div>
    );
  }

  if (!session) return null;

  const bgClass = `min-h-screen flex flex-col ${
    theme === "light"
      ? "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50"
      : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
  }`;

  return (
    <div className={bgClass}>
      <Header isChat />

      <div className="flex-1 container mx-auto px-4 py-3 max-w-5xl">
        <div className={`rounded-xl shadow-lg flex flex-col h-[600px] chat-scrollbar-minimal border ${
          theme === "light"
            ? "bg-white border-gray-200"
            : "bg-slate-800/90 border-slate-700"
        }`}>
          <ChatMessages
            ref={chatContainerRef}
            messages={messages}
            isTyping={isTyping}
            onAnimationComplete={handleAnimationComplete}
            onCharacterAdded={handleCharacterAdded}
          />
          <ChatInput
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            uploadedFiles={uploadedFiles}
            onRemoveFile={removeFile}
            isTyping={isTyping}
          />
        </div>

        <div className={`mt-6 p-4 rounded-lg border ${
          theme === "light"
            ? "bg-amber-50 border-amber-200"
            : "bg-slate-800/80 border-slate-700"
        }`}>
          <p className={`text-sm ${
            theme === "light" ? "text-amber-800" : "text-amber-300"
          }`}>
            <strong>Disclaimer:</strong> This AI assistant provides general
            information only and is not legal advice. Consult a qualified
            attorney for legal matters.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Chat;
