"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ChatMessages } from "./components/Chat/ChatMessages";
import { ChatInput } from "./components/Chat/ChatInput";
import { useFileUpload } from "./hooks/useFileUpload";
import { useTheme } from "../contexts/ThemeContext";
import { Message } from "./types/chat";

// Alternative approach with useRef
const Chat = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasRedirected = useRef(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hello! I'm your Legal AI Assistant. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const { uploadedFiles, handleFileUpload, removeFile } = useFileUpload({
    onSuccess: () => {},
    onError: () => {}
  });

  // Handle authentication redirect with ref to prevent multiple redirects
  useEffect(() => {
    if (status === "unauthenticated" && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !session?.user?.id) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Use environment variable for API URL with proper fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      console.log('Making request to:', `${apiUrl}/api/chat`); // Debug log
      
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          uploaded_files: uploadedFiles.map(file => ({ name: file.name, size: file.size })),
          user_id: session.user.id
        }),
      });

      console.log('Response status:', response.status); // Debug log

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to get AI response`);
      }

      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        role: "bot",
        content: data.response,
        timestamp: new Date().toLocaleTimeString(),
        isAnimating: true
      }]);

    } catch (error: any) {
      console.error("Chat API Error:", error);
      setIsTyping(false);
      
      // Better error handling
      let errorMessage = "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.";
      
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        errorMessage = "Cannot connect to the backend server. Please ensure the backend is running on http://localhost:8000";
      } else if (error.message.includes('NetworkError')) {
        errorMessage = "Network error occurred. Please check your connection.";
      } else if (error.message.includes('CORS')) {
        errorMessage = "CORS error. Please check backend CORS configuration.";
      }
      
      setMessages(prev => [...prev, {
        id: `bot-error-${Date.now()}`,
        role: "bot",
        content: errorMessage,
        timestamp: new Date().toLocaleTimeString(),
        isAnimating: true
      }]);
    }
  };

  const handleAnimationComplete = (messageId: string | number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isAnimating: false } : msg
    ));
  };

  const handleCharacterAdded = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const bgClass = `min-h-screen flex flex-col ${theme === 'light' 
    ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50' 
    : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'}`;

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className={bgClass}>
        <div className="flex-1 flex items-center justify-center">
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
          </div>
        </div>
      </div>
    );
  }

  // Return null if not authenticated (redirect is handled in useEffect)
  if (status === "unauthenticated") {
    return null;
  }
  
  return (
    <div className={bgClass}>
      <Header isChat={true} />
      
      <div className="flex-1 container mx-auto px-4 py-3 max-w-5xl">
        {theme === 'light' ? (
          <div className="rounded-xl shadow-lg flex flex-col h-[600px] chat-scrollbar-minimal bg-white border border-orange-100">
            <ChatMessages ref={chatContainerRef} messages={messages} isTyping={isTyping} onAnimationComplete={handleAnimationComplete} onCharacterAdded={handleCharacterAdded} />
            <ChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} uploadedFiles={uploadedFiles} onRemoveFile={removeFile} isTyping={isTyping} />
          </div>
        ) : (
          <div className="flex flex-col h-[600px] space-y-4 chat-scrollbar-minimal">
            <ChatMessages ref={chatContainerRef} messages={messages} isTyping={isTyping} onAnimationComplete={handleAnimationComplete} onCharacterAdded={handleCharacterAdded} />
            <ChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} uploadedFiles={uploadedFiles} onRemoveFile={removeFile} isTyping={isTyping} />
          </div>
        )}
        
        <div className={`mt-6 p-4 rounded-lg ${theme === 'light' ? 'bg-amber-50 border border-amber-200' : 'bg-orange-900/20 border border-orange-700/30 backdrop-blur-sm'}`}>
          <p className={`text-sm ${theme === 'light' ? 'text-amber-800' : 'text-orange-200'}`}>
            <strong>Disclaimer:</strong> This AI assistant provides general information only and should not be considered as legal advice. For specific legal matters, please consult with a qualified attorney.
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Chat;