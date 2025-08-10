import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Upload } from "lucide-react";
import { FileUploadArea } from "./FileUploadArea";
import { useTheme } from "../../../contexts/ThemeContext";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (files: FileList | null) => void;
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
  isTyping: boolean;
}

export const ChatInput = ({ 
  onSendMessage, 
  onFileUpload, 
  uploadedFiles, 
  onRemoveFile, 
  isTyping 
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
    <div className={`
      p-4 
      
    `}>
      <div className={`
        p-3 rounded-2xl space-y-2
        ${theme === 'light' 
          ? 'bg-white border border-orange-200 shadow-sm' 
          : 'bg-slate-800/90 backdrop-blur-sm border border-slate-600/50'
        }
      `}>
        {/* Text Input */}
        <div className="w-full">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask anything..."
            className={`
              w-full min-h-[48px] max-h-[120px] p-3 rounded-xl resize-none 
              focus:outline-none text-base
              ${theme === 'light' 
                ? 'placeholder:text-slate-500 text-slate-900' 
                : ' placeholder:text-slate-400 text-slate-100'
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
              rounded-full w-12 h-12 p-0 flex-shrink-0
              ${theme === 'light' 
                ? 'hover:bg-orange-50 text-slate-600 hover:text-orange-600' 
                : 'hover:bg-slate-700 text-slate-400 hover:text-orange-400'
              }
            `}
            title="Upload files"
          >
            <Upload className="w-6 h-6" />
          </Button>

          {/* Send Button - Right */}
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isTyping}
            className={`
              rounded-full w-12 h-12 p-0 transition-all duration-200 flex items-center justify-center flex-shrink-0
              ${!inputValue.trim() || isTyping
                ? theme === 'light' 
                  ? 'bg-slate-500 hover:bg-slate-300 text-slate-400' 
                  : 'bg-slate-600 hover:bg-slate-500 text-slate-400'
                : theme === 'light'
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transform hover:scale-105' 
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
              }
            `}
          >
            <Send className="w-6 h-6" />
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
      
      <FileUploadArea 
        uploadedFiles={uploadedFiles}
        onRemoveFile={onRemoveFile}
      />
      
      <p className={`
        text-xs mt-2 text-center
        ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}
      `}>
        Press Enter to send, Shift+Enter for new line • Supports PDF, DOC, DOCX, TXT files up to 10MB
      </p>
    </div>
  );
};