import { useState, useRef, useEffect } from "react";
import { Plus, ArrowUp, Square } from "lucide-react";
import { FilePreviewBar } from "./FilePreviewBar";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (files: FileList | null) => void;
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
  isTyping: boolean;
  /** True when a bot response is being animated (typewriter running) */
  isAnimating?: boolean;
  /** Called when the user clicks the Stop button */
  onStopResponse?: () => void;
  /** When true, renders the larger centered variant (empty state) */
  centered?: boolean;
}

export const ChatInput = ({
  onSendMessage,
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
  isTyping,
  isAnimating = false,
  onStopResponse,
  centered = false,
}: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const acceptedExtensions = ['.pdf', '.doc', '.docx', '.txt'];

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileUpload(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const showStop = isAnimating && !isTyping;
  const isDisabled = !inputValue.trim() || isTyping;

  // ==========================================
  // PRE-FIRST-MESSAGE STATE (CENTERED)
  // ==========================================
  if (centered) {
    return (
      <div className="w-full">
        {uploadedFiles.length > 0 && (
          <div className="mb-2">
            <FilePreviewBar
              uploadedFiles={uploadedFiles}
              onRemoveFile={onRemoveFile}
            />
          </div>
        )}
        <div
          className="p-3 rounded-2xl space-y-2"
          style={{
            background: "var(--onyx-soft)",
            border: "1px solid var(--onyx-muted)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          {/* Text Input */}
          <div className="w-full">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything…"
              className="w-full p-3 rounded-xl resize-none focus:outline-none bg-transparent min-h-[56px] max-h-[160px] text-base"
              style={{
                color: "var(--foreground)",
                fontFamily: "var(--font-typewriter)",
                scrollbarWidth: 'none',
                msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
              }}
              rows={1}
              disabled={isTyping}
            />
          </div>

          {/* Bottom Row - Upload and Send/Stop Buttons */}
          <div className="flex justify-between items-center">
            {/* Upload Button - Left */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isAnimating}
              className="rounded-full w-11 h-11 p-0 flex-shrink-0 transition-colors flex items-center justify-center hover:bg-white/10"
              style={{ color: "var(--parchment-muted)" }}
              title="Upload files"
            >
              <Plus size={24} strokeWidth={2} />
            </button>

            {/* Send or Stop Button - Right */}
            {showStop ? (
              <button
                onClick={onStopResponse}
                className="rounded-full w-11 h-11 p-0 transition-all duration-200 flex items-center justify-center flex-shrink-0 bg-red-600 hover:bg-red-700 text-white shadow-md"
                title="Stop response"
              >
                <Square fill="currentColor" size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isDisabled}
                className={`rounded-full w-11 h-11 p-0 transition-all duration-200 flex items-center justify-center flex-shrink-0 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
                style={{
                  background: isDisabled ? "var(--onyx-muted)" : "var(--sealing-wax)",
                  color: "#fff",
                  boxShadow: isDisabled ? "none" : "0 0 16px var(--sealing-wax-glow)",
                }}
                title="Send message"
              >
                <ArrowUp size={24} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedExtensions.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    );
  }

  // ==========================================
  // POST-FIRST-MESSAGE STATE (!CENTERED)
  // ChatGPT-style pill input
  // ==========================================
  return (
    <div className="px-4 pb-4 pt-2 max-w-4xl mx-auto w-full">
      {/* File preview cards — above the input */}
      {uploadedFiles.length > 0 && (
        <div className="mb-2">
          <FilePreviewBar
            uploadedFiles={uploadedFiles}
            onRemoveFile={onRemoveFile}
          />
        </div>
      )}

      {/* The Pill */}
      <div
        className="flex items-end w-full"
        style={{
          background: "var(--onyx-soft)",
          border: "1px solid var(--onyx-muted)",
          borderRadius: "32px", // True pill shape for resting state
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          minHeight: "56px",
          padding: "8px 8px 8px 16px"
        }}
      >
        {/* Upload Button - Left */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isTyping || isAnimating}
          className="flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center transition-colors hover:bg-white/10 self-end mb-0.5"
          style={{ color: "var(--parchment-muted)" }}
          title="Upload files"
        >
          <Plus size={20} strokeWidth={2} />
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask anything…"
          className="flex-1 mx-3 py-2 resize-none focus:outline-none bg-transparent text-sm self-center"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-typewriter)",
            scrollbarWidth: 'none',
            msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
            maxHeight: '160px',
            minHeight: '24px' // Enough height for the text
          }}
          rows={1}
          disabled={isTyping}
        />

        {/* Send / Stop Button - Right */}
        <div className="flex-shrink-0 self-end mb-0.5">
          {showStop ? (
            <button
              onClick={onStopResponse}
              className="w-[36px] h-[36px] rounded-full transition-all duration-200 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md"
              title="Stop response"
            >
              <Square fill="currentColor" size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              className={`w-[36px] h-[36px] rounded-full transition-all duration-200 flex items-center justify-center ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110'}`}
              style={{
                background: isDisabled ? "var(--onyx-muted)" : "var(--sealing-wax)",
                color: "#fff",
              }}
              title="Send message"
            >
              <ArrowUp size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedExtensions.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};