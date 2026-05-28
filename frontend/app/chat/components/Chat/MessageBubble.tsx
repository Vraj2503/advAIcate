import { Bot, User, FileText } from "lucide-react";
import { Message } from "../../types/chat";
import { TypewriterText } from '../../../components/TypewriterText';
import { useTheme } from "../../../contexts/ThemeContext";

interface MessageBubbleProps {
  message: Message;
  onAnimationComplete: (messageId: string | number) => void;
  onCharacterAdded: () => void;
}

export const MessageBubble = ({ message, onAnimationComplete, onCharacterAdded }: MessageBubbleProps) => {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isUser = message.role === "user";

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .split('\n')
      .map((line, index) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '') {
          return <div key={index} className="h-3" />;
        }
        
        if (trimmedLine.endsWith(':')) {
          return (
            <div key={index} className={`font-semibold mb-2 mt-4 text-[15px] ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}>
              {trimmedLine}
            </div>
          );
        }
        
        if (/^\d+\.\s/.test(trimmedLine)) {
          return (
            <div key={index} className="mb-2 pl-4">
              <span className={`font-semibold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>
                {trimmedLine.match(/^\d+\./)?.[0] || ''}
              </span>
              <span className={`ml-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {trimmedLine.substring(trimmedLine.indexOf(' ') + 1)}
              </span>
            </div>
          );
        }
        
        if (trimmedLine.startsWith('•')) {
          return (
            <div key={index} className="mb-2 pl-4 flex">
              <span className={`mr-2 ${isLight ? 'text-orange-500' : 'text-orange-400'}`}>•</span>
              <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                {trimmedLine.substring(1).trim()}
              </span>
            </div>
          );
        }
        
        return (
          <div key={index} className={`mb-2 leading-relaxed ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}>
            {trimmedLine}
          </div>
        );
      });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""} max-w-[85%]`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser
            ? isLight ? "bg-slate-800" : "bg-orange-600"
            : isLight ? "bg-gradient-to-br from-orange-100 to-amber-100" : "bg-slate-700"
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className={`w-4 h-4 ${isLight ? "text-orange-600" : "text-orange-400"}`} />
          )}
        </div>

        {/* Content */}
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? isLight
              ? "bg-slate-800 text-white"
              : "bg-orange-600 text-white"
            : isLight
              ? "bg-white border border-slate-200 shadow-sm"
              : "bg-slate-800/60 border border-slate-700/50"
        }`}>
          {message.role === "bot" && message.isAnimating ? (
            <TypewriterText
              text={message.content}
              speed={5}
              onComplete={() => onAnimationComplete(message.id)}
              onCharacterAdded={onCharacterAdded}
              className="text-sm leading-relaxed"
            />
          ) : (
            <div className="text-sm leading-relaxed">
              {message.role === "bot" ? formatMessage(message.content) : (
                <div className="whitespace-pre-line">
                  {message.content}
                </div>
              )}
            </div>
          )}

          {/* File attachments on user messages */}
          {isUser && message.files && message.files.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 mt-2 pt-2 border-t ${
              isLight ? "border-slate-700" : "border-orange-500/40"
            }`}>
              {message.files.map((f, i) => {
                const ext = f.name.split(".").pop()?.toUpperCase() || "";
                const sizeStr = f.size < 1024 * 1024
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
                    <span className="opacity-60">{sizeStr} &middot; {ext}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};