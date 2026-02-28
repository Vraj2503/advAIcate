import React, { forwardRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { useTheme } from "../../../contexts/ThemeContext";
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
        className="flex-1 overflow-y-auto chat-scrollbar-minimal"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onAnimationComplete={onAnimationComplete}
              onCharacterAdded={onCharacterAdded}
            />
          ))}

          {isTyping && (
            <div className="flex items-start space-x-3">
              <div className={`flex items-center space-x-2 px-4 py-3 rounded-2xl ${
                theme === "light"
                  ? "bg-white border border-slate-200 text-slate-600"
                  : "bg-slate-800/80 border border-slate-700 text-slate-300"
              }`}>
                <div className="flex space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    theme === "light" ? "bg-orange-400" : "bg-orange-500"
                  }`} />
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    theme === "light" ? "bg-orange-400" : "bg-orange-500"
                  }`} style={{ animationDelay: "0.15s" }} />
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    theme === "light" ? "bg-orange-400" : "bg-orange-500"
                  }`} style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatMessages.displayName = "ChatMessages";

export default ChatMessages;
export { ChatMessages };