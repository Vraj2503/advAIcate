import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Server-side exchange succeeded; redirect to client page
      // that will bridge Supabase session → NextAuth
      return NextResponse.redirect(`${origin}/auth/post-auth`);
    }

    console.error("Code exchange failed:", error.message);
  }

  // If something went wrong, send back to sign-in
  const { origin: o } = new URL(request.url);
  return NextResponse.redirect(`${o}/auth/signin`);
}
