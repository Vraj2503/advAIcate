"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { signIn } from "next-auth/react";

export default function PostAuth() {
  const router = useRouter();

  useEffect(() => {
    const bridge = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        console.error("No session after code exchange");
        router.replace("/auth/signin");
        return;
      }

      const user = data.session.user;

      // Check if the user still needs to set a password
      const needsPassword =
        user.app_metadata?.provider === "email" &&
        !user.user_metadata?.password_set;

      if (needsPassword) {
        router.replace("/auth/set-password");
        return;
      }

      // Bridge Supabase session → NextAuth session
      const result = await signIn("credentials", {
        access_token: data.session.access_token,
        redirect: false,
      });

      if (!result || result.error) {
        console.error("NextAuth bridge failed");
        router.replace("/auth/signin");
        return;
      }

      // Success → go to chat
      router.replace("/chat");
      router.refresh();
    };

    bridge();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Signing you in...</p>
    </div>
  );
}
