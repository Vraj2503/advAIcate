"use client";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import Chat from "./ChatContent";
import ChatLoading from "./loading";

export default function ChatWrapper({ session }: { session: any }) {
  return (
    <SessionProvider session={session}>
      <Suspense fallback={<ChatLoading />}>
        <Chat />
      </Suspense>
    </SessionProvider>
  );
}