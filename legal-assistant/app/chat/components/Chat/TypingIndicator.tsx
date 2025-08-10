import { Bot } from "lucide-react";

export const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-orange-50 text-slate-800 border border-orange-100 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <Bot className="w-5 h-5 text-orange-500" />
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-sm text-orange-600">AI is thinking...</span>
        </div>
      </div>
    </div>
  );
};