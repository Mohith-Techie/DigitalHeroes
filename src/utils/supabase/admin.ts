import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client. **Server-only — never import this into a
 * Client Component.**
 *
 * The secret key bypasses Row Level Security entirely, so this exists for one
 * job: the Stripe webhook. A webhook request carries no user session, so the
 * normal cookie-based client has no identity to act as and every write would be
 * refused by RLS.
 *
 * Every caller must therefore scope its own queries — there is no policy
 * safety net behind this client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or NEXT_PUBLIC_SUPABASE_URL). The Stripe " +
        "webhook cannot update subscriptions without the service-role key. " +
        "See .env.example.",
    );
  }

  return createSupabaseClient<Database>(url, secretKey, {
    auth: {
      // No session to persist or refresh: this client is never a "user".
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
