import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * A fresh client is created per request — never hoist this into a module-level
 * singleton, or one visitor's session would leak into another's response.
 *
 * `cookies()` is async in Next.js 16, so this function is async too.
 */
export async function createClient() {
  const { url, key } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. This is expected and safe:
          // `src/proxy.ts` refreshes the session on every request and writes the
          // rotated tokens (plus the required no-store cache headers) itself.
          //
          // Writes from Server Actions and Route Handlers do land, so sign-in
          // and sign-out work normally.
        }
      },
    },
  });
}
