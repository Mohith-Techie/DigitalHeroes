"use server";

import { revalidatePath } from "next/cache";

import { parseScore, parseScoreDate } from "@/lib/scores";
import { WINNER_PROOF_BUCKET } from "@/lib/storage";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  error?: string;
  notice?: string;
};

/**
 * Resolves the caller from the auth server rather than trusting the cookie.
 *
 * Every action below is scoped to the id this returns, and each query also
 * filters on `user_id` explicitly. RLS is the real boundary; the extra filter
 * means a policy regression degrades to "no rows" instead of "everyone's rows".
 */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("NOT_AUTHENTICATED");
  return { supabase, userId: user.id };
}

/** Turns a Postgres error into something a player can act on. */
function describeDbError(
  error: { code?: string; message: string },
  fallback: string,
) {
  switch (error.code) {
    case "23505": // unique_violation
      return "You already have a score for that date. Edit that entry instead.";
    case "23514": // check_violation
      return "That score is outside the allowed range of 1 to 45.";
    case "42501": // insufficient_privilege
      return "Your account does not have permission to do that.";
    case "23503": // foreign_key_violation
      return "That record no longer exists.";
    default:
      return fallback;
  }
}

function guardAuth(error: unknown): ActionState {
  if (error instanceof Error && error.message === "NOT_AUTHENTICATED") {
    return { error: "Your session has expired. Sign in again." };
  }
  throw error;
}

/* -------------------------------------------------------------------------- */
/* Scores                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Adds a score.
 *
 * The rolling five-entry window (PRD §05) is enforced by a database trigger, so
 * this deliberately does not prune old rows — doing it here as well would race
 * with the trigger.
 */
export async function addScore(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireUser();

    const score = parseScore(formData.get("score"));
    if (!score.ok) return { error: score.error };

    const scoreDate = parseScoreDate(formData.get("score_date"));
    if (!scoreDate.ok) return { error: scoreDate.error };

    // PRD §05: one entry per date. Checked here so the common case gets a clear
    // message; the unique-violation branch below still covers the race where
    // two tabs submit the same date at once.
    const { data: clash, error: clashError } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", userId)
      .eq("score_date", scoreDate.value)
      .maybeSingle();

    if (clashError) {
      return { error: describeDbError(clashError, "Could not check your existing scores.") };
    }
    if (clash) {
      return {
        error: "You already have a score for that date. Edit that entry instead.",
      };
    }

    const { error } = await supabase.from("scores").insert({
      user_id: userId,
      score: score.value,
      score_date: scoreDate.value,
    });

    if (error) return { error: describeDbError(error, "Could not save that score.") };

    revalidatePath("/dashboard");
    return { notice: `Score of ${score.value} recorded.` };
  } catch (error) {
    return guardAuth(error);
  }
}

/** Edits an existing entry's score and/or date. */
export async function updateScore(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireUser();

    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "That score could not be identified." };

    const score = parseScore(formData.get("score"));
    if (!score.ok) return { error: score.error };

    const scoreDate = parseScoreDate(formData.get("score_date"));
    if (!scoreDate.ok) return { error: scoreDate.error };

    // Same one-per-date rule, ignoring the row being edited.
    const { data: clash, error: clashError } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", userId)
      .eq("score_date", scoreDate.value)
      .neq("id", id)
      .maybeSingle();

    if (clashError) {
      return { error: describeDbError(clashError, "Could not check your existing scores.") };
    }
    if (clash) {
      return { error: "Another entry already uses that date." };
    }

    const { data, error } = await supabase
      .from("scores")
      .update({ score: score.value, score_date: scoreDate.value })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) return { error: describeDbError(error, "Could not update that score.") };
    if (!data || data.length === 0) {
      return { error: "That score no longer exists." };
    }

    revalidatePath("/dashboard");
    return { notice: "Score updated." };
  } catch (error) {
    return guardAuth(error);
  }
}

export async function deleteScore(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireUser();

    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "That score could not be identified." };

    const { data, error } = await supabase
      .from("scores")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");

    if (error) return { error: describeDbError(error, "Could not delete that score.") };
    if (!data || data.length === 0) {
      return { error: "That score no longer exists." };
    }

    revalidatePath("/dashboard");
    return { notice: "Score deleted." };
  } catch (error) {
    return guardAuth(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Winner verification (PRD §09)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Records a proof that the browser has already uploaded to storage.
 *
 * The file itself goes straight from the browser to Supabase Storage rather
 * than through this action: Server Actions cap request bodies at 1 MB by
 * default, which a phone screenshot clears easily.
 *
 * This still verifies that the winner row belongs to the caller before saving
 * the path, and deletes the orphaned object if it does not.
 */
export async function attachProof(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireUser();

    const winnerId = String(formData.get("winner_id") ?? "");
    const objectPath = String(formData.get("object_path") ?? "");

    if (!winnerId || !objectPath) {
      return { error: "That upload could not be matched to a win." };
    }

    // Never trust a path from the browser: it must sit inside this user's
    // folder, or someone could point their record at another member's file.
    if (!objectPath.startsWith(`${userId}/`)) {
      return { error: "That file path is not valid for your account." };
    }

    // Remember any previous upload so it can be cleaned up once it is replaced.
    const { data: existing } = await supabase
      .from("winners")
      .select("proof_url")
      .eq("id", winnerId)
      .eq("user_id", userId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("winners")
      .update({ proof_url: objectPath })
      .eq("id", winnerId)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      return { error: describeDbError(error, "Could not attach that proof.") };
    }

    if (!data || data.length === 0) {
      // The row was not ours (or vanished) — do not leave the file behind.
      await supabase.storage.from(WINNER_PROOF_BUCKET).remove([objectPath]);
      return { error: "That win could not be found on your account." };
    }

    // Uploads are written under a fresh timestamped key, so replacing a proof
    // would otherwise leave the superseded image sitting in the bucket forever.
    const superseded = existing?.proof_url;
    if (superseded && superseded !== objectPath) {
      await supabase.storage.from(WINNER_PROOF_BUCKET).remove([superseded]);
    }

    revalidatePath("/dashboard");
    return { notice: "Proof uploaded. An admin will review it shortly." };
  } catch (error) {
    return guardAuth(error);
  }
}
