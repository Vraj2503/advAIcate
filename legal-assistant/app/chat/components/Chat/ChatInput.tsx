import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Paperclip } from "lucide-react";
import { FilePreviewBar } from "./FilePreviewBar";
import { useTheme } from "../../../contexts/ThemeContext";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (files: FileList | null) => void;
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
  isTyping: boolean;
  /** When true, renders the larger centered variant (empty state) */
  centered?: boolean;
}

export const ChatInput = ({ 
  onSendMessage, 
  onFileUpload, 
  uploadedFiles, 
  onRemoveFile, 
  isTyping,
  centered = false,
}: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  const acceptedExtensions = ['.pdf', '.doc', '.docx', '.txt'];

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue("");
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

  return (
    <div className={centered ? "" : "px-4 pb-4 pt-2 max-w-3xl mx-auto w-full"}>
      {/* File preview cards — above the input like Claude / GPT */}
      {uploadedFiles.length > 0 && (
        <div className="mb-2">
          <FilePreviewBar
            uploadedFiles={uploadedFiles}
            onRemoveFile={onRemoveFile}
          />
        </div>
      )}

      <div className={`
        p-3 rounded-2xl space-y-2
        ${theme === 'light' 
          ? 'bg-white border border-slate-200 shadow-md' 
          : 'bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 shadow-lg'
        }
      `}>
        {/* Text Input */}
        <div className="w-full">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything…"
            className={`
              w-full p-3 rounded-xl resize-none 
              focus:outline-none bg-transparent
              ${centered ? "min-h-[56px] max-h-[160px] text-base" : "min-h-[44px] max-h-[120px] text-sm"}
              ${theme === 'light' 
                ? 'placeholder:text-slate-400 text-slate-900' 
                : 'placeholder:text-slate-500 text-slate-100'
              }
            `}
            rows={1}
            disabled={isTyping}
            style={{ 
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          />
        </div>

        {/* Bottom Row - Upload and Send Buttons */}
        <div className="flex justify-between items-center">
          {/* Upload Button - Left */}
          <Button
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isTyping}
            className={`
              rounded-full w-11 h-11 p-0 flex-shrink-0
              ${theme === 'light' 
                ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-700' 
                : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
              }
            `}
            title="Upload files"
          >
            <Paperclip className="w-[22px] h-[22px]" />
          </Button>

          {/* Send Button - Right */}
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isTyping}
            className={`
              rounded-full w-11 h-11 p-0 transition-all duration-200 flex items-center justify-center flex-shrink-0
              ${!inputValue.trim() || isTyping
                ? theme === 'light' 
                  ? 'bg-slate-100 text-slate-400' 
                  : 'bg-slate-700 text-slate-500'
                : theme === 'light'
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md' 
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-md'
              }
            `}
          >
            <Send className="w-[22px] h-[22px]" />
          </Button>
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