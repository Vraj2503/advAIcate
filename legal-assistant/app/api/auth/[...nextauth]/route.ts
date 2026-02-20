import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import { NextAuthOptions } from "next-auth";

// ─── NextAuth is ONLY a session mirror ───────────────────────
// Supabase handles all authentication.
// This CredentialsProvider simply verifies a Supabase access_token
// and copies the identity into a NextAuth JWT session.
// ──────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "SupabaseBridge",
      credentials: {
        access_token: { label: "Access Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.access_token) return null;

        // Verify the Supabase token
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase.auth.getUser(
          credentials.access_token
        );

        if (error || !data?.user) return null;

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email,
          image: data.user.user_metadata?.avatar_url || null,
          supabaseAccessToken: credentials.access_token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.sub = user.id;
        token.supabaseAccessToken = (user as any).supabaseAccessToken;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.sub;
        session.supabaseAccessToken = token.supabaseAccessToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      const productionUrl = process.env.NEXTAUTH_URL;
      if (productionUrl && url.startsWith(productionUrl)) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  // In NextAuth v4 set NEXTAUTH_URL env var to trust the host in production
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };