import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { currentPeriodEnd, getStripe, toDbStatus } from "@/lib/stripe";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Stripe webhook — the only thing that may change a member's subscription
 * state (PRD §04: "Handles renewal, cancellation, and lapsed-subscription
 * states").
 *
 * Checkout's success redirect is NOT trusted for this: a member can close the
 * tab before it fires, and the URL can be visited directly. Stripe's signed
 * webhook is the source of truth.
 *
 * Writes go through the service-role client because a webhook request carries
 * no user session for RLS to act on.
 */

/** Events that can change subscription state. */
const HANDLED = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // The signature is computed over the exact bytes Stripe sent, so the body
  // must be read raw. Parsing it as JSON first and re-serialising would change
  // key order and whitespace, and verification would fail.
  const payload = await request.text();

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    // Async variant: verifies via SubtleCrypto, so it works unchanged if this
    // route is ever moved to the edge runtime.
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    // A verification failure means the request did not come from Stripe.
    console.error("[stripe webhook] signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) {
    // Acknowledge anything else, or Stripe will retry it indefinitely.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    await applyEvent(stripe, event);
  } catch (error) {
    console.error(`[stripe webhook] failed to apply ${event.type}`, error);
    // A 500 tells Stripe to retry with backoff, which is what we want for a
    // transient database problem.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function applyEvent(stripe: Stripe, event: Stripe.Event) {
  const subscriptionId = subscriptionIdFrom(event);
  if (!subscriptionId) return;

  // Always re-read the subscription rather than trusting the event body.
  // Webhooks can arrive out of order and can be redelivered, so an "updated"
  // event from ten minutes ago must not overwrite newer state. Retrieving it
  // here makes every event converge on Stripe's current truth, which also
  // makes the handler naturally idempotent.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const userId = await resolveUserId(subscription);
  if (!userId) {
    console.error(
      `[stripe webhook] no member matches subscription ${subscription.id}`,
    );
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({
      subscription_status: toDbStatus(subscription.status),
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      subscription_current_period_end: currentPeriodEnd(subscription),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

function subscriptionIdFrom(event: Stripe.Event): string | null {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return null;
    return typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);
  }

  const subscription = event.data.object as Stripe.Subscription;
  return subscription.id ?? null;
}

/**
 * Finds the member behind a subscription.
 *
 * Checkout stamps `supabase_user_id` onto the subscription's metadata, so that
 * is the direct route. The `stripe_customer_id` lookup is the fallback for
 * subscriptions created outside this app — for instance by an admin in the
 * Stripe dashboard.
 */
async function resolveUserId(subscription: Stripe.Subscription) {
  const fromMetadata = subscription.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.id ?? null;
}
