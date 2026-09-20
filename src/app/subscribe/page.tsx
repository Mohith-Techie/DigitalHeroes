import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui";
import { MIN_CHARITY_PERCENTAGE } from "@/lib/charity";
import { PLANS, getStripe, isStripeConfigured, priceIdFor } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

import { PlanPicker, type PlanOffer } from "./plan-picker";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "Choose a monthly or yearly plan. A minimum of 10% of every payment goes to the charity you pick.",
};

function formatAmount(minorUnits: number | null, currency: string) {
  if (minorUnits === null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    // Whole-pound prices read better without ".00"
    minimumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
  }).format(minorUnits / 100);
}

/**
 * Reads both plan prices from Stripe so the page can never disagree with what
 * the member is actually charged. Returns null if Stripe is unreachable or
 * misconfigured, and the page renders setup guidance instead.
 */
async function loadOffers(): Promise<PlanOffer[] | null> {
  if (!isStripeConfigured()) return null;

  try {
    const stripe = getStripe();
    const [monthly, yearly] = await Promise.all([
      stripe.prices.retrieve(priceIdFor("monthly")!),
      stripe.prices.retrieve(priceIdFor("yearly")!),
    ]);

    // How much the yearly plan saves against paying monthly for a year.
    let savingPercent: number | null = null;
    if (monthly.unit_amount && yearly.unit_amount) {
      const twelveMonths = monthly.unit_amount * 12;
      if (yearly.unit_amount < twelveMonths) {
        savingPercent = Math.round(
          ((twelveMonths - yearly.unit_amount) / twelveMonths) * 100,
        );
      }
    }

    return [
      {
        ...PLANS.monthly,
        price: formatAmount(monthly.unit_amount, monthly.currency),
        savingPercent: null,
      },
      {
        ...PLANS.yearly,
        price: formatAmount(yearly.unit_amount, yearly.currency),
        savingPercent,
      },
    ];
  } catch (error) {
    console.error("[subscribe] could not load Stripe prices", error);
    return null;
  }
}

export default async function SubscribePage({
  searchParams,
}: PageProps<"/subscribe">) {
  const params = await searchParams;
  const wasCancelled = params.checkout === "cancelled";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const offers = await loadOffers();

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-ember/12 animate-drift pointer-events-none absolute -top-48 left-1/2 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[130px]"
      />

      <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="group text-ink-dim hover:text-ink mb-12 inline-flex items-center gap-2 text-sm transition-colors duration-200"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          Back to Digital Heroes
        </Link>

        <p className="eyebrow">Membership</p>
        <h1 className="font-display mt-4 text-4xl tracking-tight text-balance sm:text-6xl">
          Choose how you give.
        </h1>
        <p className="text-ink-dim mt-6 max-w-xl text-lg leading-relaxed text-balance">
          Both plans enter you into every monthly draw. Both send at least{" "}
          {MIN_CHARITY_PERCENTAGE}% of what you pay to the cause you choose. The
          only difference is how often you are billed.
        </p>

        {wasCancelled ? (
          <div className="border-line bg-surface mt-10 rounded-xl border px-5 py-4">
            <p className="text-ink-dim text-sm">
              Checkout was cancelled — nothing has been charged. Pick a plan
              whenever you are ready.
            </p>
          </div>
        ) : null}

        {!user ? (
          <div className="border-ember/40 bg-ember/10 mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4">
            <p className="text-ember text-sm">
              Sign in first so we can attach the subscription to your account.
            </p>
            <Link
              href="/login?redirectTo=%2Fsubscribe"
              className="bg-ember text-canvas hover:bg-ember-deep rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200"
            >
              Sign in
            </Link>
          </div>
        ) : null}

        {offers ? (
          <PlanPicker offers={offers} canCheckout={Boolean(user)} />
        ) : (
          <StripeSetupNotice />
        )}

        <div className="border-line mt-16 border-t pt-10">
          <p className="eyebrow">What happens next</p>
          <ol className="text-ink-dim mt-5 grid gap-4 text-sm sm:grid-cols-3">
            {[
              "Stripe takes the payment securely — card details never touch our servers.",
              "Your subscription activates and you are entered into the next monthly draw.",
              "Pick your charity from the directory, and raise your share above the minimum whenever you like.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="text-ember/60 font-mono text-xs">
                  0{index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}

/** Shown until the Stripe keys are in place, instead of a broken page. */
function StripeSetupNotice() {
  return (
    <div className="border-line bg-surface mt-12 rounded-2xl border p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Not connected yet</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Stripe needs configuring
          </h2>
        </div>
        <Badge tone="waiting">Setup</Badge>
      </div>

      <p className="text-ink-dim mt-5 text-sm leading-relaxed">
        Add these to <code className="text-ember">.env.local</code> and restart
        the dev server. Create the two recurring prices in the Stripe dashboard
        first — one monthly, one yearly at a discount.
      </p>

      <ul className="text-ink-dim mt-5 space-y-2 font-mono text-xs">
        {[
          "STRIPE_SECRET_KEY",
          "STRIPE_PRICE_MONTHLY",
          "STRIPE_PRICE_YEARLY",
          "STRIPE_WEBHOOK_SECRET",
        ].map((key) => (
          <li key={key} className="border-line border-b pb-2">
            {key}
          </li>
        ))}
      </ul>
    </div>
  );
}
