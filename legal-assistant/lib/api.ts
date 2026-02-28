import { getSession } from "next-auth/react";

export async function apiFetch(
  url: string,
  options: RequestInit = {}
) {
  const session = await getSession();

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  if ((session as any)?.supabaseAccessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${(session as any).supabaseAccessToken}`;
  } else {
    console.warn("[apiFetch] No supabaseAccessToken in session:", JSON.stringify(session, null, 2));
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
