"use client";
import { useState, useRef, useEffect } from "react";
import { Bot, User, FileText, Pencil, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../../types/chat";
import { TypewriterText } from "../../../components/TypewriterText";
import { useTheme } from "../../../contexts/ThemeContext";

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
  const { theme } = useTheme();
  const isLight = theme === "light";
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
        className={`group flex items-start space-x-3 ${
          isUser ? "flex-row-reverse space-x-reverse" : ""
        } max-w-[85%]`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isUser
              ? isLight
                ? "bg-slate-800"
                : "bg-orange-600"
              : isLight
              ? "bg-gradient-to-br from-orange-100 to-amber-100"
              : "bg-slate-700"
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot
              className={`w-4 h-4 ${
                isLight ? "text-orange-600" : "text-orange-400"
              }`}
            />
          )}
        </div>

        {/* Content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? isLight
                ? "bg-slate-800 text-white"
                : "bg-orange-600 text-white"
              : isLight
              ? "bg-white border border-slate-200 shadow-sm"
              : "bg-slate-800/60 border border-slate-700/50"
          }`}
        >
          {/* ---- Editing mode ---- */}
          {isUser && isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={editRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className={`w-full min-h-[60px] max-h-[200px] p-2 rounded-lg resize-none text-sm focus:outline-none ${
                  isLight
                    ? "bg-slate-700 text-white placeholder:text-slate-400"
                    : "bg-orange-700/60 text-white placeholder:text-orange-200"
                }`}
                rows={2}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLight
                      ? "hover:bg-slate-600 text-slate-300"
                      : "hover:bg-orange-700 text-orange-200"
                  }`}
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveEdit}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLight
                      ? "hover:bg-slate-600 text-green-400"
                      : "hover:bg-orange-700 text-green-300"
                  }`}
                  title="Save & resend"
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
                    <div
                      className={`bot-markdown ${
                        isLight ? "light" : "dark"
                      }`}
                    >
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
              className={`flex flex-wrap gap-1.5 mt-2 pt-2 border-t ${
                isLight ? "border-slate-700" : "border-orange-500/40"
              }`}
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
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
                      isLight
                        ? "bg-slate-700/50 text-slate-200"
                        : "bg-orange-700/40 text-orange-100"
                    }`}
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
            className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg self-center flex-shrink-0 ${
              isLight
                ? "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                : "hover:bg-slate-700 text-slate-500 hover:text-slate-300"
            }`}
            title="Edit message"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};