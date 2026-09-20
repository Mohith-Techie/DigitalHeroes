"use server";

import { revalidatePath } from "next/cache";

import { parseCharityPercentage } from "@/lib/charity";
import { createClient } from "@/utils/supabase/server";

export type CharityState = {
  error?: string;
  notice?: string;
};

/**
 * Sets the member's chosen cause and their contribution share (PRD §08.1).
 *
 * The 10% floor is enforced here, not only in the slider: the slider's `min`
 * is a convenience, and a crafted POST would otherwise be able to set 0%.
 */
export async function selectCharity(
  _previous: CharityState,
  formData: FormData,
): Promise<CharityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to choose a charity." };
  }

  const charityId = String(formData.get("charity_id") ?? "");
  if (!charityId) {
    return { error: "Choose a charity first." };
  }

  const percentage = parseCharityPercentage(formData.get("charity_percentage"));
  if (!percentage.ok) {
    return { error: percentage.error };
  }

  // Confirm the charity exists and is still listed, rather than writing
  // whatever id arrived in the form.
  const { data: charity, error: lookupError } = await supabase
    .from("charities")
    .select("id, name, is_active")
    .eq("id", charityId)
    .maybeSingle();

  if (lookupError) {
    return { error: "Could not verify that charity. Try again." };
  }
  if (!charity || !charity.is_active) {
    return { error: "That charity is no longer accepting contributions." };
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      charity_id: charity.id,
      charity_percentage: percentage.value,
    })
    .eq("id", user.id)
    .select("id");

  if (error) {
    // 23514 is a CHECK constraint — most likely a percentage floor in the
    // schema that disagrees with the one above.
    if (error.code === "23514") {
      return { error: "That contribution amount is not allowed." };
    }
    return { error: "Could not save your choice. Try again." };
  }

  if (!data || data.length === 0) {
    return {
      error:
        "We could not find your member profile, so the choice was not saved.",
    };
  }

  // The dashboard shows the chosen charity and percentage.
  revalidatePath("/dashboard");
  revalidatePath("/charities");

  return {
    notice: `${percentage.value}% of your subscription now goes to ${charity.name}.`,
  };
}
