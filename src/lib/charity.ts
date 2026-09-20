import type { Parsed } from "./scores";

/**
 * Charity contribution rules (PRD §08.1).
 *
 * "Minimum contribution: 10% of subscription fee" and "Users may voluntarily
 * increase their charity percentage". The floor is the constraint that matters
 * — it is what makes the platform's promise true — so it is enforced in the
 * slider bounds, in this parser, and it should also exist as a CHECK constraint
 * on `public.users.charity_percentage`.
 */

export const MIN_CHARITY_PERCENTAGE = 10;
export const MAX_CHARITY_PERCENTAGE = 100;

/** Presets offered as one-tap choices above the slider. */
export const PERCENTAGE_PRESETS = [10, 25, 50, 100] as const;

export function parseCharityPercentage(input: unknown): Parsed<number> {
  const raw = typeof input === "string" ? input.trim() : String(input ?? "");

  if (raw === "") return { ok: false, error: "Choose a contribution amount." };
  if (!/^\d+$/.test(raw)) {
    return { ok: false, error: "Use a whole percentage, with no decimals." };
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    return { ok: false, error: "That is not a valid percentage." };
  }
  if (value < MIN_CHARITY_PERCENTAGE) {
    return {
      ok: false,
      error: `The minimum contribution is ${MIN_CHARITY_PERCENTAGE}% of your subscription.`,
    };
  }
  if (value > MAX_CHARITY_PERCENTAGE) {
    return {
      ok: false,
      error: `You can give at most ${MAX_CHARITY_PERCENTAGE}% of your subscription.`,
    };
  }

  return { ok: true, value };
}

/** Rough monthly value of a contribution, for the "what this means" line. */
export function contributionOf(feeMinorUnits: number, percentage: number) {
  return Math.round(feeMinorUnits * (percentage / 100));
}
