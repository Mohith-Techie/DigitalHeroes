import type { Database } from "@/types/database.types";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type Tone = "neutral" | "positive" | "waiting" | "alert";

/**
 * Display currency.
 *
 * Every amount in this app ultimately originates from a Stripe price, so this
 * MUST match the currency those prices are created in — otherwise a $10 charge
 * renders as "£10.00". Set `NEXT_PUBLIC_CURRENCY` to the ISO code your Stripe
 * prices use.
 */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY?.toUpperCase() || "GBP";

/**
 * Money columns (`prize_amount`, `charity_amount`, `prize_pool`) are stored as
 * decimal major units — pounds/dollars, not pence/cents. If the schema is ever
 * changed to integer minor units, divide by 100 here and nowhere else.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency = CURRENCY,
) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

/** For values already held in minor units (cents/pence). */
export function formatMinor(minorUnits: number, currency = CURRENCY) {
  return formatMoney(minorUnits / 100, currency);
}

/** `score_date` is a DATE column, so it arrives as a bare "YYYY-MM-DD". */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  // Parse the calendar parts directly. `new Date("2026-03-01")` is parsed as
  // UTC midnight and would display as the previous day west of Greenwich.
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** For timestamptz columns, where the time of day matters. */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

const SUBSCRIPTION: Record<
  SubscriptionStatus,
  { label: string; tone: Tone; active: boolean }
> = {
  active: { label: "Active", tone: "positive", active: true },
  trialing: { label: "Trial", tone: "positive", active: true },
  past_due: { label: "Past due", tone: "alert", active: false },
  unpaid: { label: "Unpaid", tone: "alert", active: false },
  incomplete: { label: "Incomplete", tone: "waiting", active: false },
  incomplete_expired: { label: "Expired", tone: "alert", active: false },
  canceled: { label: "Cancelled", tone: "neutral", active: false },
  paused: { label: "Paused", tone: "waiting", active: false },
  inactive: { label: "Inactive", tone: "neutral", active: false },
};

export function describeSubscription(status: SubscriptionStatus) {
  return SUBSCRIPTION[status] ?? SUBSCRIPTION.inactive;
}

const PAYMENT: Record<PaymentStatus, { label: string; tone: Tone }> = {
  paid: { label: "Paid", tone: "positive" },
  processing: { label: "Processing", tone: "waiting" },
  pending: { label: "Pending", tone: "waiting" },
  failed: { label: "Failed", tone: "alert" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function describePayment(status: PaymentStatus) {
  return PAYMENT[status] ?? PAYMENT.pending;
}

/** PRD §06: draws pay out on 3, 4 or 5 matched numbers. */
export function describeTier(tier: number) {
  return `${tier}-number match`;
}
