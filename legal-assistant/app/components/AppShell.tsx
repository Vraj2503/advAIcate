"use client";
import PageTransition from "@/components/PageTransition";
import { SessionProvider } from "next-auth/react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return(
    <>
    <SessionProvider> 
      <PageTransition>{children}</PageTransition>
    </SessionProvider>
    </>);
}