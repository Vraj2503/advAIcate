import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ChatWrapper from "./ChatWrapper";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  
  return <ChatWrapper session={session} />;
}