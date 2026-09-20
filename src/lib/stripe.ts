import Stripe from "stripe";

import type { Database } from "@/types/database.types";

export type PlanId = "monthly" | "yearly";

export const PLANS: Record<
  PlanId,
  { id: PlanId; name: string; cadence: string; blurb: string }
> = {
  monthly: {
    id: "monthly",
    name: "Monthly",
    cadence: "per month",
    blurb: "Roll with it. Cancel whenever you like.",
  },
  yearly: {
    id: "yearly",
    name: "Yearly",
    cadence: "per year",
    blurb: "Twelve months up front, at a lower rate.",
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return value === "monthly" || value === "yearly";
}

/** Stripe Price ID backing each plan, from the environment. */
export function priceIdFor(plan: PlanId) {
  return plan === "monthly"
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_YEARLY;
}

/**
 * True when every Stripe variable needed for checkout is present.
 *
 * The subscribe page uses this to render setup guidance instead of crashing
 * while the keys are still missing.
 */
export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_MONTHLY &&
      process.env.STRIPE_PRICE_YEARLY,
  );
}

let cached: Stripe | null = null;

/**
 * Shared Stripe client.
 *
 * `apiVersion` is deliberately not passed: the installed SDK pins its own
 * (currently `2026-08-26.dahlia`), so the version moves only when the package
 * is upgraded and the types are re-checked, rather than drifting with the
 * account default.
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Add it to .env.local — see .env.example.",
    );
  }
  cached ??= new Stripe(key);
  return cached;
}

/** Absolute origin for Stripe redirect URLs. */
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  // Vercel sets this automatically on preview and production deployments.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

const STRIPE_TO_DB: Record<string, SubscriptionStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "unpaid",
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  paused: "paused",
};

/** Maps a Stripe subscription status onto our `subscription_status` enum. */
export function toDbStatus(status: string): SubscriptionStatus {
  return STRIPE_TO_DB[status] ?? "inactive";
}

/**
 * End of the current billing period, as an ISO timestamp.
 *
 * IMPORTANT: `current_period_end` is **not** a property of the Subscription
 * object in this API version — it moved onto subscription items. Reading
 * `subscription.current_period_end` (the pre-2025 shape) yields `undefined`
 * and would silently store a null renewal date.
 *
 * A subscription can hold several items with different periods; the soonest
 * one is when the member next gets billed.
 */
export function currentPeriodEnd(subscription: Stripe.Subscription) {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");

  if (ends.length === 0) return null;
  return new Date(Math.min(...ends) * 1000).toISOString();
}
