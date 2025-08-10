import React, { forwardRef, useEffect } from "react";
import { Bot, User } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { useTheme } from "../../../contexts/ThemeContext";
import { TypewriterText } from "../../../components/TypewriterText";
import { Message } from "../../types/chat";

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  onAnimationComplete: (messageId: string | number) => void;
  onCharacterAdded: () => void;
}

const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, isTyping, onAnimationComplete, onCharacterAdded }, ref) => {
    const { theme } = useTheme();

    useEffect(() => {
      if (ref && typeof ref !== "function" && ref.current) {
        ref.current.scrollTop = ref.current.scrollHeight;
      }
    }, [messages, isTyping]);

    return (
      <div
        ref={ref}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar"
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onAnimationComplete={onAnimationComplete}
            onCharacterAdded={onCharacterAdded}
          />
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className={`p-4 rounded-lg ${
                theme === "light"
                  ? "bg-orange-50 text-slate-800 border border-orange-100"
                  : "bg-slate-700/80 text-slate-100 border border-slate-600/50"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Bot
                  className={`w-5 h-5 ${
                    theme === "light" ? "text-orange-500" : "text-orange-400"
                  }`}
                />
                <div className="flex space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      theme === "light" ? "bg-orange-400" : "bg-orange-500"
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      theme === "light" ? "bg-orange-400" : "bg-orange-500"
                    }`}
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className={`w-2 h-2 rounded-full animate-bounce ${
                      theme === "light" ? "bg-orange-400" : "bg-orange-500"
                    }`}
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span
                  className={`text-sm ${
                    theme === "light" ? "text-orange-600" : "text-orange-300"
                  }`}
                >
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ChatMessages.displayName = "ChatMessages";

// Make sure to export as default
export default ChatMessages;

// Also export as named export for flexibility
export { ChatMessages };