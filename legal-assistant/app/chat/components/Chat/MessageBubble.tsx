import { Bot, User } from "lucide-react";
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
            <div key={index} className={`
              font-bold mb-2 mt-4 text-base
              ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}
            `}>
              {trimmedLine}
            </div>
          );
        }
        
        if (/^\d+\.\s/.test(trimmedLine)) {
          return (
            <div key={index} className="mb-2 pl-6">
              <span className={`font-semibold ${theme === 'light' ? 'text-orange-600' : 'text-orange-400'}`}>
                {trimmedLine.match(/^\d+\./)?.[0] || ''}
              </span>
              <span className={`ml-2 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                {trimmedLine.substring(trimmedLine.indexOf(' ') + 1)}
              </span>
            </div>
          );
        }
        
        if (trimmedLine.startsWith('•')) {
          return (
            <div key={index} className="mb-2 pl-6 flex">
              <span className={`mr-3 font-bold ${theme === 'light' ? 'text-orange-500' : 'text-orange-400'}`}>•</span>
              <span className={theme === 'light' ? 'text-slate-700' : 'text-slate-300'}>
                {trimmedLine.substring(1).trim()}
              </span>
            </div>
          );
        }
        
        return (
          <div key={index} className={`
            mb-3 leading-relaxed
            ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}
          `}>
            {trimmedLine}
          </div>
        );
      });
  };

  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] p-4 rounded-lg ${
        message.role === "user"
          ? theme === 'light'
            ? "bg-slate-900 text-white"
            : "bg-orange-500 text-white"
          : theme === 'light'
            ? "bg-orange-50 text-slate-800 border border-orange-100"
            : "bg-slate-700/80 text-slate-100 border border-slate-600/50 backdrop-blur-sm"
      }`}>
        <div className="flex items-start space-x-3">
          {message.role === "bot" && (
            <Bot className={`w-5 h-5 mt-1 flex-shrink-0 ${
              theme === 'light' ? 'text-orange-500' : 'text-orange-400'
            }`} />
          )}
          {message.role === "user" && (
            <User className="w-5 h-5 text-white mt-1 flex-shrink-0" />
          )}
          <div className="flex-1">
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
            <p className={`text-xs mt-2 ${
              message.role === "user" 
                ? "text-slate-300" 
                : theme === 'light' 
                  ? "text-slate-500" 
                  : "text-slate-400"
            }`}>
              {message.timestamp}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};