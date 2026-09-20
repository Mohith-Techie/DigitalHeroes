import { NextResponse } from "next/server";

import { getStripe, isPlanId, priceIdFor, siteUrl } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

/**
 * Creates a Stripe Checkout Session for the signed-in member (PRD §04).
 *
 * POST { plan: "monthly" | "yearly" } -> { url }
 *
 * The browser never sends a price or an amount — only a plan name, which is
 * resolved to a Price ID server-side. Accepting a client-supplied price would
 * let anyone subscribe at a price of their choosing.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let plan: unknown;
  try {
    ({ plan } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const priceId = priceIdFor(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for the ${plan} plan.` },
      { status: 500 },
    );
  }

  const stripe = getStripe();

  // Reuse the member's Stripe customer so their billing history stays on one
  // record across renewals and plan changes.
  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      name: profile?.full_name ?? undefined,
      // Lets us recover the member from a Stripe-side event even if our own
      // row is missing the customer id.
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    // Best effort: if this write fails the webhook still resolves the member
    // via the metadata above, and the next checkout reuses the same customer.
    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const origin = siteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // `client_reference_id` survives on the session; the metadata below rides
    // on the subscription itself, which is what later `customer.subscription.*`
    // events carry.
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, plan },
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan },
    },
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/subscribe?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
