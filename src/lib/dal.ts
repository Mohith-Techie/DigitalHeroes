import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import type { Database } from "@/types/database.types";
import { createClient } from "@/utils/supabase/server";

type UserRole = Database["public"]["Enums"]["user_role"];

export type AdminContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
};

/**
 * Data access layer for authorization.
 *
 * Next.js's own guidance is explicit that a layout is NOT an access boundary:
 * layouts do not re-render on client-side navigation, and — more importantly —
 * "a layout also does not control whether the rest of the route renders", so a
 * layout that hides its children does not stop those segments from running or
 * from appearing in the RSC payload. Server Actions are a separate entry point
 * again.
 *
 * So the check lives here, and **every** admin page, and **every** admin
 * Server Action, calls it. `src/proxy.ts` blocking anonymous traffic is only an
 * optimistic pre-filter.
 *
 * `cache()` memoises within a single render pass, so a layout and the page it
 * wraps share one round trip. A Server Action is a fresh pass, so it always
 * re-verifies.
 */
const loadAdminContext = cache(async (): Promise<
  { state: "anonymous" } | { state: "forbidden" } | { state: "ok"; context: AdminContext }
> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { state: "anonymous" };

  // The role is read from the database on every check. It is never taken from
  // a JWT claim or a cookie, so revoking someone's admin rights takes effect
  // immediately rather than when their token happens to expire.
  const { data: profile, error } = await supabase
    .from("users")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    // Fail closed. A readable error here would otherwise become an open door.
    console.error("[dal] could not read role", error);
    return { state: "forbidden" };
  }

  if (!profile || profile.role !== "admin") return { state: "forbidden" };

  return {
    state: "ok",
    context: {
      userId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
    },
  };
});

/**
 * For pages and layouts. Sends anonymous visitors to sign in, and answers 404
 * for everyone else — a 403 would confirm that an admin area exists here.
 */
export async function requireAdminPage(): Promise<AdminContext> {
  const result = await loadAdminContext();

  if (result.state === "anonymous") redirect("/login?redirectTo=%2Fadmin");
  if (result.state === "forbidden") notFound();

  return result.context;
}

/**
 * For Server Actions, which must return a value rather than redirect.
 *
 * Throws a tagged error that each action converts into its own state shape.
 */
export async function requireAdminAction(): Promise<AdminContext> {
  const result = await loadAdminContext();

  if (result.state !== "ok") throw new Error("NOT_ADMIN");

  return result.context;
}

/** True when the caller is an admin. For conditional UI only, never for access. */
export async function isAdmin() {
  return (await loadAdminContext()).state === "ok";
}
