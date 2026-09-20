"use client";

import { useState } from "react";

import { FormMessage } from "@/components/ui";
import type { PlanId } from "@/lib/stripe";

export type PlanOffer = {
  id: PlanId;
  name: string;
  cadence: string;
  blurb: string;
  price: string;
  savingPercent: number | null;
};

export function PlanPicker({
  offers,
  canCheckout,
}: {
  offers: PlanOffer[];
  canCheckout: boolean;
}) {
  // Default to the discounted plan — it is the better deal and the one the
  // page recommends.
  const [selected, setSelected] = useState<PlanId>("yearly");
  const [pending, setPending] = useState<PlanId | null>(null);
  const [error, setError] = useState<string>();

  async function startCheckout(plan: PlanId) {
    setError(undefined);
    setPending(plan);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Could not start checkout. Try again.");
        setPending(null);
        return;
      }

      if (!payload.url) {
        setError("Stripe did not return a checkout link.");
        setPending(null);
        return;
      }

      // Full navigation, not a client-side route change — this leaves the app
      // for Stripe's hosted page.
      window.location.href = payload.url;
    } catch {
      setError("Could not reach the server. Check your connection.");
      setPending(null);
    }
  }

  return (
    <div className="mt-12">
      <div
        role="radiogroup"
        aria-label="Subscription plan"
        className="grid gap-5 sm:grid-cols-2"
      >
        {offers.map((offer) => {
          const isSelected = selected === offer.id;

          return (
            <button
              key={offer.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(offer.id)}
              className={`ease-out-expo group relative overflow-hidden rounded-2xl border p-7 text-left transition-all duration-500 hover:-translate-y-1 ${
                isSelected
                  ? "border-ember bg-surface shadow-[0_20px_60px_-30px_var(--color-ember)]"
                  : "border-line bg-surface hover:border-line-bright"
              }`}
            >
              {offer.savingPercent ? (
                <span className="bg-ember text-canvas absolute top-5 right-5 rounded-full px-3 py-1 font-mono text-[0.625rem] tracking-wider uppercase">
                  Save {offer.savingPercent}%
                </span>
              ) : null}

              <p className="eyebrow">{offer.name}</p>

              <p className="font-display mt-4 text-5xl tracking-tight">
                {offer.price}
              </p>
              <p className="text-ink-faint mt-1 font-mono text-xs tracking-wide">
                {offer.cadence}
              </p>

              <p className="text-ink-dim mt-5 text-sm leading-relaxed">
                {offer.blurb}
              </p>

              <span
                aria-hidden
                className={`mt-6 flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-300 ${
                  isSelected ? "border-ember" : "border-line-bright"
                }`}
              >
                <span
                  className={`bg-ember h-2.5 w-2.5 rounded-full transition-transform duration-300 ${
                    isSelected ? "scale-100" : "scale-0"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <FormMessage error={error} />

        <button
          type="button"
          disabled={!canCheckout || pending !== null}
          onClick={() => startCheckout(selected)}
          className="group bg-ember text-canvas hover:bg-ember-deep ease-out-expo relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl px-8 py-4 text-base font-semibold transition-[transform,background-color,opacity] duration-300 hover:-translate-y-0.5 active:translate-y-0 active:duration-75 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
          />
          <span className="relative">
            {pending
              ? "Opening Stripe…"
              : canCheckout
                ? `Continue with ${selected === "yearly" ? "yearly" : "monthly"}`
                : "Sign in to subscribe"}
          </span>
        </button>

        <p className="text-ink-faint mt-4 text-xs">
          Secure payment handled by Stripe. Cancel at any time from your
          dashboard.
        </p>
      </div>
    </div>
  );
}
