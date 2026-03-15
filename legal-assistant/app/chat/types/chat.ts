export interface MessageFile {
  name: string;
  size: number;
}

export interface Message {
  id: string | number;
  role: "user" | "bot";
  content: string;
  timestamp: string;
  isAnimating?: boolean;
  files?: MessageFile[];
}

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}