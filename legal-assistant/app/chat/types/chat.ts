export interface Message {
  id: string | number;
  role: "user" | "bot";
  content: string;
  timestamp: string;
  isAnimating?: boolean;
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}