import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Client Components (browser).
 *
 * Auth state is persisted in cookies rather than localStorage so that the
 * server, the proxy, and the browser all read the same session.
 *
 * Safe to call repeatedly — `createBrowserClient` memoises the underlying
 * client per set of arguments, so components each get the same instance.
 */
export function createClient() {
  const { url, key } = getSupabaseEnv();

  return createBrowserClient<Database>(url, key);
}
