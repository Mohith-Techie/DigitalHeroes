import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "@/utils/supabase/env";

/**
 * Route protection + Supabase session refresh.
 *
 * NOTE ON THE FILENAME: Next.js 16 renamed the `middleware` file convention to
 * `proxy`. The behaviour is identical; `middleware.ts` still works but is
 * deprecated. This file sits next to `app/`, i.e. `src/proxy.ts`.
 *
 * Two jobs, in this order:
 *
 *  1. Refresh the Supabase session. Server Components cannot write cookies, so
 *     rotated access/refresh tokens would otherwise be dropped and users would
 *     be logged out at random. This runs on every matched request.
 *
 *  2. Gate `/dashboard` and `/admin` on *authentication only*.
 *
 * Deliberately no database lookups here. Proxy runs on every request including
 * prefetches, so a per-request query would be a real latency cost. That means
 * the `admin` role check is NOT done here — enforce it in the `/admin` layout
 * (a Server Component that can query `users.role`) and, authoritatively, in
 * Row Level Security policies. Treat this file as an optimistic filter.
 */

/** Path prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = ["/dashboard", "/admin"] as const;

/** Where a signed-in user gets sent if they land on an auth-only page. */
const AFTER_LOGIN = "/dashboard";

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { url, key } = getSupabaseEnv();

  // Mutable: `setAll` replaces it so refreshed cookies reach both the upstream
  // render and the browser. Always return *this* object (or copy its cookies
  // onto whatever you return instead) — returning a fresh response silently
  // discards the rotated session.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Write to the request so the page render sees the new session...
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        // ...and to the response so the browser stores it.
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must never be cached by a CDN, or one
        // user's tokens could be served to another.
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Do not put code between client creation and this call. `getClaims()`
  // verifies the JWT and triggers the refresh that populates `setAll` above.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Send them back where they were headed once they authenticate.
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    return withCookies(NextResponse.redirect(loginUrl), response);
  }

  if (isSignedIn && pathname === "/login") {
    // Honour a pending `redirectTo` (e.g. a stale tab reloaded after signing in
    // elsewhere), but only when it is a path on this site — never an absolute
    // URL, which would turn this route into an open redirect.
    const pending = request.nextUrl.searchParams.get("redirectTo");
    const safe =
      pending && pending.startsWith("/") && !pending.startsWith("//")
        ? pending
        : AFTER_LOGIN;

    // `new URL(path, origin)` keeps any query string on `path` intact.
    const target = new URL(safe, request.nextUrl.origin);
    return withCookies(NextResponse.redirect(target), response);
  }

  return response;
}

/** Carries refreshed auth cookies from `source` onto a redirect response. */
function withCookies(redirect: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  /**
   * Run on everything except static assets and the Stripe webhook.
   *
   * Without a matcher this would also intercept `_next/static`, images and
   * fonts, adding an auth round-trip to every asset request.
   *
   * `api/webhook` is excluded deliberately: it is authenticated by Stripe's
   * signature, never by a session cookie, so running the session refresh on it
   * would only add latency to every payment event.
   */
  matcher: [
    "/((?!api/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
