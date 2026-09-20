/**
 * Public Supabase connection details, read once and validated.
 *
 * `process.env.NEXT_PUBLIC_*` is inlined by the bundler at build time, so the
 * lookups below must stay as literal property accesses — a dynamic
 * `process.env[name]` would be `undefined` in the browser bundle.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example), " +
        "then restart `next dev`.",
    );
  }

  return { url, key };
}
