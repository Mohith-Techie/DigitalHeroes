"use server";

import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/lib/dal";
import {
  type DrawPlan,
  type EligiblePlayer,
  TIER_POOL_SHARE,
  drawPeriod,
  isRecurringInterval,
  monthlyEquivalentMinor,
  planDraw,
  prizePoolMinor,
  toMajor,
} from "@/lib/draw";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export type AdminState = {
  error?: string;
  notice?: string;
};

export type SimulationResult = AdminState & {
  plan?: DrawPlan;
  period?: string;
  monthlyRevenueMinor?: number;
  charityPoolMinor?: number;
  /** True when a draw has already been published for this period. */
  alreadyDrawn?: boolean;
};

/** How far back to look when accumulating unclaimed jackpots. */
const ROLLOVER_LOOKBACK = 24;

/** Subscription states that count as a paying, entered member. */
const ACTIVE_STATES = ["active", "trialing"] as const;

function adminError(error: unknown): AdminState {
  if (error instanceof Error && error.message === "NOT_ADMIN") {
    return { error: "You do not have permission to do that." };
  }
  // Surface the real reason — an admin debugging a failed draw needs it, and
  // this page is already behind an admin check.
  const message = error instanceof Error ? error.message : String(error);
  return { error: message };
}

/**
 * Translates an RLS refusal into something actionable.
 *
 * The draw reads every member and writes winner rows for other people, which
 * only works if the schema has admin policies. Without them PostgREST simply
 * returns "permission denied", which is easy to misread as a bug in the draw.
 */
function describeDbError(
  error: { code?: string; message: string },
  what: string,
) {
  if (error.code === "42501" || /permission denied|row-level security/i.test(error.message)) {
    return (
      `Database refused to ${what}. The admin role needs RLS policies covering ` +
      `other members' rows — see supabase/admin-policies.sql. (${error.message})`
    );
  }
  return `Could not ${what}: ${error.message}`;
}

/* -------------------------------------------------------------------------- */
/* Gathering inputs                                                            */
/* -------------------------------------------------------------------------- */

type DrawInputs = {
  players: EligiblePlayer[];
  monthlyRevenueMinor: number;
  charityPoolMinor: number;
};

/**
 * Monthly recurring revenue, read from Stripe rather than inferred.
 *
 * Stripe is the only place that knows what members are actually charged, so
 * the prize pool is derived from it directly. Each subscription is normalised
 * to a monthly figure — a yearly plan contributes a twelfth per month, not its
 * whole value in the month it renews.
 */
async function loadRevenue() {
  const stripe = getStripe();

  let totalMinor = 0;
  const perUserMinor = new Map<string, number>();

  for (const status of ACTIVE_STATES) {
    // Auto-pagination: iterates past the 100-per-page limit.
    for await (const subscription of stripe.subscriptions.list({
      status,
      limit: 100,
    })) {
      let subscriptionMinor = 0;

      for (const item of subscription.items.data) {
        const price = item.price;
        if (!price.recurring) continue;

        const { interval, interval_count } = price.recurring;

        // Stripe's interval type is open-ended. Counting an unrecognised one
        // as zero would quietly shrink the prize pool, so refuse the draw
        // instead of publishing a number nobody can reconcile.
        if (!isRecurringInterval(interval)) {
          throw new Error(
            `Subscription ${subscription.id} uses an unsupported billing interval ` +
              `"${interval}". Revenue cannot be calculated, so the draw was not run.`,
          );
        }

        subscriptionMinor +=
          monthlyEquivalentMinor(
            price.unit_amount ?? 0,
            interval,
            interval_count ?? 1,
          ) * (item.quantity ?? 1);
      }

      totalMinor += subscriptionMinor;

      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        perUserMinor.set(userId, (perUserMinor.get(userId) ?? 0) + subscriptionMinor);
      }
    }
  }

  return { totalMinor, perUserMinor };
}

async function loadDrawInputs(): Promise<DrawInputs> {
  if (!isStripeConfigured()) {
    throw new Error(
      "Stripe is not configured, so subscription revenue cannot be calculated. " +
        "Set STRIPE_SECRET_KEY and the two price ids in .env.local.",
    );
  }

  const supabase = await createClient();

  const { data: members, error: membersError } = await supabase
    .from("users")
    .select("id, created_at, charity_id, charity_percentage, subscription_status")
    .in("subscription_status", [...ACTIVE_STATES]);

  if (membersError) {
    throw new Error(describeDbError(membersError, "read the member list"));
  }

  const memberIds = (members ?? []).map((m) => m.id);

  // Scores for those members only. A draw ranks on the retained rolling five,
  // which is exactly what the table holds.
  let scoresByUser = new Map<string, number[]>();
  if (memberIds.length > 0) {
    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select("user_id, score")
      .in("user_id", memberIds);

    if (scoresError) {
      throw new Error(describeDbError(scoresError, "read member scores"));
    }

    scoresByUser = (scores ?? []).reduce((map, row) => {
      const list = map.get(row.user_id) ?? [];
      list.push(row.score);
      map.set(row.user_id, list);
      return map;
    }, new Map<string, number[]>());
  }

  const { totalMinor, perUserMinor } = await loadRevenue();

  // Charity pool: what each paying member directs to their cause this month.
  let charityPoolMinor = 0;
  for (const member of members ?? []) {
    const fee = perUserMinor.get(member.id) ?? 0;
    charityPoolMinor += Math.floor(fee * (member.charity_percentage / 100));
  }

  // Eligible = paying AND has posted at least one score. Ranking players with
  // no rounds would be ranking them on nothing.
  const players: EligiblePlayer[] = [];
  for (const member of members ?? []) {
    const scores = scoresByUser.get(member.id) ?? [];
    if (scores.length === 0) continue;

    const total = scores.reduce((sum, value) => sum + value, 0);
    players.push({
      userId: member.id,
      averageScore: total / scores.length,
      scoreCount: scores.length,
      memberSince: member.created_at,
      charityId: member.charity_id,
      charityPercentage: member.charity_percentage,
    });
  }

  return { players, monthlyRevenueMinor: totalMinor, charityPoolMinor };
}

/**
 * Unclaimed jackpots carried forward (PRD §07: "5-match jackpot carries
 * forward if unclaimed").
 *
 * Walks back through consecutive published draws, adding each one's jackpot
 * share until it reaches a draw that did have a top-tier winner.
 */
async function loadRolloverMinor(period: string) {
  const supabase = await createClient();

  const { data: previous, error } = await supabase
    .from("draws")
    .select("id, draw_date, prize_pool")
    .lt("draw_date", period)
    .in("status", ["drawn", "settled"])
    .order("draw_date", { ascending: false })
    .limit(ROLLOVER_LOOKBACK);

  if (error) throw new Error(describeDbError(error, "read previous draws"));
  if (!previous || previous.length === 0) return 0;

  // One query for every top-tier winner across those draws, rather than one
  // query per draw.
  const { data: jackpotWinners, error: winnersError } = await supabase
    .from("winners")
    .select("draw_id")
    .eq("match_tier", 5)
    .in(
      "draw_id",
      previous.map((d) => d.id),
    );

  if (winnersError) {
    throw new Error(describeDbError(winnersError, "read previous winners"));
  }

  const claimed = new Set((jackpotWinners ?? []).map((w) => w.draw_id));

  let rollover = 0;
  for (const draw of previous) {
    if (claimed.has(draw.id)) break; // jackpot was won; the chain stops here
    rollover += Math.round(Number(draw.prize_pool) * 100 * TIER_POOL_SHARE[5]);
  }

  return rollover;
}

async function buildPlan(period: string) {
  const inputs = await loadDrawInputs();
  const rolloverInMinor = await loadRolloverMinor(period);

  const plan = planDraw({
    players: inputs.players,
    prizePoolMinor: prizePoolMinor(inputs.monthlyRevenueMinor),
    rolloverInMinor,
  });

  return { plan, inputs };
}

async function existingDrawFor(period: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("draws")
    .select("id, status")
    .eq("draw_date", period)
    .maybeSingle();

  if (error) throw new Error(describeDbError(error, "check for an existing draw"));
  return data;
}

/* -------------------------------------------------------------------------- */
/* Simulation (PRD §06: "Simulation before publish")                           */
/* -------------------------------------------------------------------------- */

/**
 * Computes a draw without writing anything.
 *
 * Runs the same `planDraw` over the same inputs as `executeDraw`, so what the
 * admin reviews here is what publishing will record.
 */
export async function simulateDraw(): Promise<SimulationResult> {
  try {
    await requireAdminAction();

    const period = drawPeriod();
    const existing = await existingDrawFor(period);
    const { plan, inputs } = await buildPlan(period);

    return {
      plan,
      period,
      monthlyRevenueMinor: inputs.monthlyRevenueMinor,
      charityPoolMinor: inputs.charityPoolMinor,
      alreadyDrawn: Boolean(existing && existing.status !== "cancelled"),
      notice: "Simulation only — nothing has been saved.",
    };
  } catch (error) {
    return adminError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Execution                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Publishes the draw for the current month.
 *
 * PostgREST gives no multi-statement transaction, so this writes in an order
 * where a failure cannot leave a half-published draw visible: the draw row is
 * created `closed`, the winners are inserted, and only then is it promoted to
 * `drawn`. If the winner insert fails, the draw row is deleted again.
 */
export async function executeDraw(): Promise<AdminState> {
  try {
    await requireAdminAction();

    const supabase = await createClient();
    const period = drawPeriod();

    // Guard 1: one published draw per month (PRD §06: monthly cadence).
    const existing = await existingDrawFor(period);
    if (existing && existing.status !== "cancelled") {
      return {
        error: `A draw for ${period} already exists (status: ${existing.status}). Only one draw may be published per month.`,
      };
    }

    const { plan, inputs } = await buildPlan(period);

    // Guard 2: nothing to draw.
    if (plan.eligibleCount === 0) {
      return {
        error:
          "No eligible players. A member must have an active subscription and at least one posted score.",
      };
    }

    // Guard 3: the arithmetic must balance before anything is written.
    const accounted =
      plan.totalAwardedMinor + plan.rolloverOutMinor + plan.undistributedMinor;
    const expected =
      Math.floor(plan.prizePoolMinor * TIER_POOL_SHARE[5]) +
      Math.floor(plan.prizePoolMinor * TIER_POOL_SHARE[4]) +
      Math.floor(plan.prizePoolMinor * TIER_POOL_SHARE[3]) +
      plan.rolloverInMinor;

    if (accounted !== expected) {
      return {
        error: `Refusing to publish: prize arithmetic does not balance (${accounted} vs ${expected} minor units). No changes made.`,
      };
    }

    // Step 1 — create the draw, not yet published.
    const { data: draw, error: drawError } = await supabase
      .from("draws")
      .insert({
        draw_date: period,
        status: "closed",
        entries_count: plan.eligibleCount,
        total_pool: toMajor(inputs.monthlyRevenueMinor),
        prize_pool: toMajor(plan.prizePoolMinor),
        charity_pool: toMajor(inputs.charityPoolMinor),
        // Algorithmic draw (PRD §06): winners are ranked on scores, so there
        // are no drawn numbers to record.
        winning_numbers: null,
      })
      .select("id")
      .single();

    if (drawError || !draw) {
      return {
        error: describeDbError(
          drawError ?? { message: "no row returned" },
          "create the draw",
        ),
      };
    }

    // Step 2 — the winners.
    if (plan.winners.length > 0) {
      const { error: winnersError } = await supabase.from("winners").insert(
        plan.winners.map((winner) => ({
          draw_id: draw.id,
          user_id: winner.userId,
          match_tier: winner.tier,
          prize_amount: toMajor(winner.prizeMinor),
          charity_amount: toMajor(winner.charityMinor),
          charity_id: winner.charityId,
          payment_status: "pending" as const,
          matched_numbers: null,
        })),
      );

      if (winnersError) {
        // Compensating delete: never leave a draw row with no winners behind.
        await supabase.from("draws").delete().eq("id", draw.id);
        return {
          error: describeDbError(winnersError, "record the winners") +
            " The draw was rolled back.",
        };
      }
    }

    // Step 3 — publish.
    const { error: publishError } = await supabase
      .from("draws")
      .update({ status: "drawn", drawn_at: new Date().toISOString() })
      .eq("id", draw.id);

    if (publishError) {
      return {
        error:
          describeDbError(publishError, "publish the draw") +
          " The winners were recorded but the draw is still marked closed.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/payouts");
    revalidatePath("/dashboard");

    return {
      notice:
        plan.winners.length > 0
          ? `Draw published for ${period}: ${plan.winners.length} winner(s).`
          : `Draw published for ${period}. No tier reached its threshold, so the jackpot rolls over.`,
    };
  } catch (error) {
    return adminError(error);
  }
}

/* -------------------------------------------------------------------------- */
/* Payouts (PRD §09 / §11.04)                                                  */
/* -------------------------------------------------------------------------- */

export async function markPayoutPaid(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  try {
    await requireAdminAction();

    const winnerId = String(formData.get("winner_id") ?? "");
    if (!winnerId) return { error: "No payout selected." };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("winners")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", winnerId)
      // Only a pending or processing payout can be settled — this stops a
      // double click from re-stamping an already-paid record.
      .in("payment_status", ["pending", "processing"])
      .select("id");

    if (error) return { error: describeDbError(error, "mark the payout paid") };
    if (!data || data.length === 0) {
      return { error: "That payout is no longer pending." };
    }

    revalidatePath("/admin/payouts");
    revalidatePath("/dashboard");
    return { notice: "Payout marked as paid." };
  } catch (error) {
    return adminError(error);
  }
}

/**
 * Rejects an uploaded proof (PRD §09: "ADMIN REVIEW — approve or reject").
 *
 * Clears `proof_url` and leaves the payout pending, which puts the upload
 * control back in front of the member on their dashboard.
 */
export async function rejectProof(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  try {
    await requireAdminAction();

    const winnerId = String(formData.get("winner_id") ?? "");
    if (!winnerId) return { error: "No payout selected." };

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("winners")
      .update({ proof_url: null, payment_status: "pending" })
      .eq("id", winnerId)
      .select("id");

    if (error) return { error: describeDbError(error, "reject the proof") };
    if (!data || data.length === 0) return { error: "That payout no longer exists." };

    revalidatePath("/admin/payouts");
    revalidatePath("/dashboard");
    return { notice: "Proof rejected — the member can upload a new one." };
  } catch (error) {
    return adminError(error);
  }
}
