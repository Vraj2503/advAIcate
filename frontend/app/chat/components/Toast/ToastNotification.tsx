import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { Toast } from "../../types/chat";

interface ToastNotificationProps {
  toast: Toast;
  onRemove: (id: number) => void;
}

export const ToastNotification = ({ toast, onRemove }: ToastNotificationProps) => {
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className={`max-w-sm p-4 rounded-lg shadow-lg border backdrop-blur-sm transform transition-all duration-300 ease-in-out ${getToastStyles()} animate-in slide-in-from-right`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{toast.title}</p>
          <p className="text-xs mt-1 opacity-90">{toast.message}</p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};