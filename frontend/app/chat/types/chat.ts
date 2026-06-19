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
  isStopped?: boolean;
  files?: MessageFile[];
}