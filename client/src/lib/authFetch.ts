// client/src/lib/authFetch.ts
import { getSupabase } from "@/lib/supabaseClient";

type FetchInput = RequestInfo | URL;

function getAccessTokenFromLocalStorage(): string | null {
  try {
    // Supabase stores sessions under keys like:
    // sb-<project-ref>-auth-token
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;

      const raw = localStorage.getItem(k);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      // Most common shapes:
      // { access_token: "..." }
      // OR { currentSession: { access_token: "..." } }
      const token =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token;

      if (typeof token === "string" && token.length > 20) {
        return token;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function authFetch(input: FetchInput, init: RequestInit = {}) {
  // Merge headers safely (do NOT overwrite caller headers)
  const headers = new Headers(init.headers || {});

  // If caller already set Authorization, keep it
  const hasAuth =
    headers.has("authorization") || headers.has("Authorization");

  if (!hasAuth) {
    // 1) Prefer Supabase client session (clean way)
    try {
      const supabase = await getSupabase();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      } else {
        // 2) Fallback: read token directly from localStorage
        const lsToken = getAccessTokenFromLocalStorage();
        if (lsToken) headers.set("Authorization", `Bearer ${lsToken}`);
      }
    } catch {
      // 3) Last resort: localStorage only
      const lsToken = getAccessTokenFromLocalStorage();
      if (lsToken) headers.set("Authorization", `Bearer ${lsToken}`);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
