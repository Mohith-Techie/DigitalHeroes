"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export type AuthState = {
  error?: string;
  /** Non-error feedback, e.g. "check your inbox to confirm". */
  notice?: string;
};

/** Where to land after a successful sign-in. */
const DEFAULT_DESTINATION = "/dashboard";

/**
 * Only ever redirect to a path on this site.
 *
 * `redirectTo` arrives from the query string, so without this an attacker could
 * link to `/login?redirectTo=https://evil.example` and use our domain to bounce
 * a freshly authenticated user off-site.
 */
function safeDestination(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return DEFAULT_DESTINATION;
  // Must be a single-slash relative path: rejects "https://…" and "//evil.com".
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_DESTINATION;
  return value;
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

/**
 * Handles both sign-in and sign-up from a single form.
 *
 * The submitting button carries `name="intent"`, so whichever one the user
 * pressed decides the branch — one `useActionState` hook, one pending state.
 */
export async function authenticate(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const destination = safeDestination(formData.get("redirectTo"));
  const isSignUp = formData.get("intent") === "signup";

  if (!email || !password) {
    return { error: "Enter both your email and your password." };
  }
  if (isSignUp && password.length < 8) {
    return { error: "Choose a password of at least 8 characters." };
  }

  const supabase = await createClient();

  if (isSignUp) {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return { error: error.message };

    // With "Confirm email" enabled in Supabase Auth, no session is issued until
    // the user clicks the link, so there is nothing to redirect to yet.
    if (!data.session) {
      return {
        notice: `Almost there — we sent a confirmation link to ${email}.`,
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Supabase deliberately returns the same message for an unknown email and a
    // wrong password; passing it straight through avoids leaking which it was.
    if (error) return { error: error.message };
  }

  // Drop cached Server Component output rendered for the signed-out visitor.
  revalidatePath("/", "layout");
  redirect(destination);
}

/** Ends the session and returns the user to the landing page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
