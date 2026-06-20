import React, { forwardRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { Message } from "../../types/chat";

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  onAnimationComplete: (messageId: string | number) => void;
  onCharacterAdded: () => void;
  onEditMessage?: (messageId: string | number, newContent: string) => void;
}

const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  ({ messages, isTyping, onAnimationComplete, onCharacterAdded, onEditMessage }, ref) => {

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
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onAnimationComplete={onAnimationComplete}
              onCharacterAdded={onCharacterAdded}
              onEditMessage={onEditMessage}
            />
          ))}

          {isTyping && (
            <div className="flex items-start gap-4">
              {/* Bot avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--parchment)",
                  border: "1px solid var(--doc-border)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sealing-wax)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20" />
                  <path d="M2 7h20" />
                  <path d="M5 7l-2 9h6L7 7" />
                  <path d="M17 7l-2 9h6l-2-9" />
                </svg>
              </div>
              {/* Typing indicator */}
              <div
                className="flex items-center gap-2 px-5 py-4 rounded-2xl"
                style={{
                  background: "var(--parchment)",
                  border: "1px solid var(--doc-border)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                }}
              >
                <div className="flex space-x-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-bounce"
                    style={{ background: "var(--sealing-wax)" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-bounce"
                    style={{ background: "var(--sealing-wax)", animationDelay: "0.15s" }}
                  />
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-bounce"
                    style={{ background: "var(--sealing-wax)", animationDelay: "0.3s" }}
                  />
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