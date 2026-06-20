"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, User, FileText, Pencil, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../../types/chat";
import { TypewriterText } from "../../../components/TypewriterText";

interface MessageBubbleProps {
  message: Message;
  onAnimationComplete: (messageId: string | number) => void;
  onCharacterAdded: () => void;
  onEditMessage?: (messageId: string | number, newContent: string) => void;
}

export const MessageBubble = ({
  message,
  onAnimationComplete,
  onCharacterAdded,
  onEditMessage,
}: MessageBubbleProps) => {
  const isUser = message.role === "user";

  // ---- Edit state ----
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      setEditText(message.content);
      return;
    }
    onEditMessage?.(message.id, trimmed);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.content);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`group flex items-start gap-4 ${
          isUser ? "flex-row-reverse" : ""
        } max-w-[90%]`}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
          style={{
            background: isUser ? "var(--sealing-wax)" : "var(--parchment)",
            border: isUser ? "none" : "1px solid var(--doc-border)",
          }}
        >
          {isUser ? (
            /* Quill pen SVG for user */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 2C15 7 9 9 4 21c3-1 6-1 9-1 3-5 5-9 7-18Z" />
              <path d="M4 21c3-2 8-4 12-7" />
            </svg>
          ) : (
            /* Scales of justice SVG for bot */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sealing-wax)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20" />
              <path d="M2 7h20" />
              <path d="M5 7l-2 9h6L7 7" />
              <path d="M17 7l-2 9h6l-2-9" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: isUser ? "var(--sealing-wax)" : "rgba(230, 215, 195, 0.9)",
            color: isUser ? "#fff" : "var(--parchment-text)",
            border: isUser ? "none" : "1px solid var(--doc-border)",
            boxShadow: isUser
              ? "0 2px 12px var(--sealing-wax-glow)"
              : "0 2px 12px rgba(0,0,0,0.2)",
            fontFamily: "var(--font-typewriter)",
          }}
        >
          {/* ---- Editing mode ---- */}
          {isUser && isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={editRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full min-h-[60px] max-h-[200px] p-3 rounded-lg resize-none text-sm focus:outline-none"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  color: "#fff",
                }}
                rows={2}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "#86efac" }}
                  title="Save &amp; resend"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ---- Bot message: animating ---- */}
              {message.role === "bot" && message.isAnimating ? (
                <TypewriterText
                  text={message.content}
                  speed={5}
                  onComplete={() => onAnimationComplete(message.id)}
                  onCharacterAdded={onCharacterAdded}
                  isStopped={message.isStopped}
                  className="text-sm leading-relaxed"
                />
              ) : (
                <div className="text-sm leading-relaxed">
                  {message.role === "bot" ? (
                    /* Formatted markdown for completed bot messages */
                    <div className="bot-markdown light">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-line">
                      {message.content}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* File attachments on user messages */}
          {isUser && message.files && message.files.length > 0 && (
            <div
              className="flex flex-wrap gap-1.5 mt-3 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}
            >
              {message.files.map((f, i) => {
                const ext = f.name.split(".").pop()?.toUpperCase() || "";
                const sizeStr =
                  f.size < 1024 * 1024
                    ? `${(f.size / 1024).toFixed(0)} KB`
                    : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                    style={{ background: "rgba(0,0,0,0.2)", color: "#fff" }}
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <span className="opacity-60">
                      {sizeStr} &middot; {ext}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- Edit button (user messages, on hover) ---- */}
        {isUser && !isEditing && !message.isAnimating && (
          <button
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg self-center flex-shrink-0"
            style={{ color: "var(--parchment-muted)" }}
            title="Edit message"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};