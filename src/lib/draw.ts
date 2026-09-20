/**
 * Draw engine (PRD §06 / §07).
 *
 * Deliberately pure: no Supabase, no Stripe, no clock. Everything here is a
 * function of its arguments, so the whole prize calculation can be unit tested
 * and an admin simulation produces exactly the numbers a real draw would.
 *
 * All money is handled in MINOR units (cents/pence) as integers. Prize splitting
 * divides pools between winners, and doing that in floating-point major units
 * loses fractions — money would quietly appear or vanish. Conversion to the
 * decimal values the database stores happens once, at the edge.
 */

/**
 * Share of monthly subscription revenue that becomes the prize pool.
 * The remainder funds charity contributions and platform costs.
 */
export const PRIZE_POOL_SHARE = 0.5;

/**
 * How the prize pool splits between tiers (PRD §07).
 * Tier 5 is the jackpot and is the only tier that rolls over.
 */
export const TIER_POOL_SHARE = { 5: 0.4, 4: 0.35, 3: 0.25 } as const;

/**
 * What proportion of ranked eligible players each tier takes:
 * the top 5%, then the next 10%, then the next 20%.
 *
 * NOTE: these are floored. With fewer than 20 eligible players the top tier
 * selects nobody and its 40% rolls over to the next draw — correct by the
 * rule, but worth knowing on a small platform.
 */
export const TIER_SELECTION_SHARE = { 5: 0.05, 4: 0.1, 3: 0.2 } as const;

export type TierKey = 5 | 4 | 3;

export const TIER_KEYS: TierKey[] = [5, 4, 3];

/* -------------------------------------------------------------------------- */
/* Revenue                                                                     */
/* -------------------------------------------------------------------------- */

export type RecurringInterval = "day" | "week" | "month" | "year";

const RECURRING_INTERVALS: RecurringInterval[] = ["day", "week", "month", "year"];

/**
 * Narrows Stripe's open-ended `Interval` type.
 *
 * Stripe types the interval as a union plus a catch-all string so the SDK can
 * carry billing periods added after this version. Anything unrecognised must
 * be surfaced rather than silently valued at zero, which would understate the
 * prize pool.
 */
export function isRecurringInterval(value: string): value is RecurringInterval {
  return (RECURRING_INTERVALS as string[]).includes(value);
}

/**
 * Normalises any recurring price to what it contributes in a single month.
 *
 * A yearly plan is not a month's revenue; counting it whole would inflate the
 * pool twelvefold in the month it renews and to zero in the other eleven.
 */
export function monthlyEquivalentMinor(
  unitAmountMinor: number,
  interval: RecurringInterval,
  intervalCount = 1,
): number {
  if (!Number.isFinite(unitAmountMinor) || unitAmountMinor < 0) return 0;
  if (intervalCount <= 0) return 0;

  const perInterval = unitAmountMinor / intervalCount;

  switch (interval) {
    case "month":
      return Math.round(perInterval);
    case "year":
      return Math.round(perInterval / 12);
    case "week":
      return Math.round((perInterval * 52) / 12);
    case "day":
      return Math.round((perInterval * 365) / 12);
    default:
      return 0;
  }
}

/** Prize pool for a month, given that month's normalised revenue. */
export function prizePoolMinor(
  monthlyRevenueMinor: number,
  share = PRIZE_POOL_SHARE,
) {
  if (monthlyRevenueMinor <= 0) return 0;
  return Math.floor(monthlyRevenueMinor * share);
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

export type EligiblePlayer = {
  userId: string;
  /** Mean of the player's retained Stableford scores. */
  averageScore: number;
  scoreCount: number;
  /** ISO timestamp, used only to break ties deterministically. */
  memberSince: string;
  charityId: string | null;
  charityPercentage: number;
};

/**
 * Orders players best-first.
 *
 * Every comparison is total and deterministic — down to the user id — so the
 * same inputs always produce the same winners. A simulation an admin reviews
 * must match the draw they then publish; a ranking that depended on database
 * row order or `Math.random()` could not promise that.
 */
export function rankPlayers(players: EligiblePlayer[]): EligiblePlayer[] {
  return [...players].sort((a, b) => {
    // Stableford: higher is better.
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    // More rounds posted is a stronger record at the same average.
    if (b.scoreCount !== a.scoreCount) return b.scoreCount - a.scoreCount;
    // Longer-standing member first.
    if (a.memberSince !== b.memberSince) {
      return a.memberSince < b.memberSince ? -1 : 1;
    }
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });
}

/** How many players each tier takes, floored, and never more than exist. */
export function allocateTierCounts(eligibleCount: number) {
  if (eligibleCount <= 0) return { 5: 0, 4: 0, 3: 0 } as Record<TierKey, number>;

  const counts = {
    5: Math.floor(eligibleCount * TIER_SELECTION_SHARE[5]),
    4: Math.floor(eligibleCount * TIER_SELECTION_SHARE[4]),
    3: Math.floor(eligibleCount * TIER_SELECTION_SHARE[3]),
  } as Record<TierKey, number>;

  // The three tiers are disjoint slices of one ranked list, so they can never
  // collectively claim more players than exist.
  let remaining = eligibleCount;
  for (const tier of TIER_KEYS) {
    counts[tier] = Math.min(counts[tier], remaining);
    remaining -= counts[tier];
  }

  return counts;
}

/**
 * Divides a pool into `count` shares that sum EXACTLY to the pool.
 *
 * Integer division leaves a remainder of up to `count - 1` minor units. Those
 * are handed out one each from the top, so nothing is lost to rounding and the
 * distribution stays deterministic.
 */
export function splitEvenly(totalMinor: number, count: number): number[] {
  if (count <= 0) return [];
  // An empty pool still owes every winner an explicit zero. Returning `[]`
  // here would leave each winner's share `undefined`, which reaches the
  // database as NaN.
  if (totalMinor <= 0) return Array.from({ length: count }, () => 0);

  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor - base * count;

  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

/* -------------------------------------------------------------------------- */
/* Planning a draw                                                             */
/* -------------------------------------------------------------------------- */

export type PlannedWinner = {
  userId: string;
  tier: TierKey;
  /** Gross prize before the charity share. */
  prizeMinor: number;
  /** Portion of the prize routed to the winner's chosen cause. */
  charityMinor: number;
  charityId: string | null;
  /** What the member actually receives. */
  netMinor: number;
  rank: number;
};

export type DrawPlan = {
  eligibleCount: number;
  prizePoolMinor: number;
  /** Unclaimed jackpot carried in from the previous draw. */
  rolloverInMinor: number;
  tiers: {
    tier: TierKey;
    poolMinor: number;
    winnerCount: number;
    /** Players needed before this tier selects anyone. */
    playersNeeded: number;
  }[];
  winners: PlannedWinner[];
  /** Tier 5 pool when nobody matched — carries to the next draw. */
  rolloverOutMinor: number;
  /**
   * Tier 4/3 pools with no winners. The PRD marks those tiers as non-rolling,
   * so this is simply not paid out this month.
   */
  undistributedMinor: number;
  totalAwardedMinor: number;
  totalCharityMinor: number;
};

/**
 * Builds the complete outcome of a draw without touching the database.
 *
 * `simulateDraw` and `executeDraw` both call this, which is what makes the
 * admin's simulation trustworthy: publishing runs exactly the same arithmetic
 * over exactly the same inputs.
 */
export function planDraw({
  players,
  prizePoolMinor: poolMinor,
  rolloverInMinor = 0,
}: {
  players: EligiblePlayer[];
  prizePoolMinor: number;
  rolloverInMinor?: number;
}): DrawPlan {
  const ranked = rankPlayers(players);
  const counts = allocateTierCounts(ranked.length);

  const winners: PlannedWinner[] = [];
  const tiers: DrawPlan["tiers"] = [];

  let rolloverOutMinor = 0;
  let undistributedMinor = 0;
  let cursor = 0;

  for (const tier of TIER_KEYS) {
    // The jackpot tier also carries any pool left unclaimed last month.
    const basePool = Math.floor(poolMinor * TIER_POOL_SHARE[tier]);
    const tierPool = tier === 5 ? basePool + rolloverInMinor : basePool;

    const winnerCount = counts[tier];
    const slice = ranked.slice(cursor, cursor + winnerCount);
    cursor += winnerCount;

    // How many more players this tier would need to select even one winner.
    const playersNeeded =
      winnerCount > 0
        ? 0
        : Math.ceil(1 / TIER_SELECTION_SHARE[tier]) - ranked.length;

    tiers.push({
      tier,
      poolMinor: tierPool,
      winnerCount,
      playersNeeded: Math.max(playersNeeded, 0),
    });

    if (winnerCount === 0) {
      if (tier === 5) rolloverOutMinor += tierPool;
      else undistributedMinor += tierPool;
      continue;
    }

    const shares = splitEvenly(tierPool, winnerCount);

    slice.forEach((player, index) => {
      // `?? 0` is belt and braces: shares is built to match `slice` exactly,
      // and a missing entry must never become NaN in a money column.
      const prizeMinor = shares[index] ?? 0;
      // Interpretation: `winners.charity_amount` is the slice of a win routed
      // to the winner's chosen cause, at the rate they set themselves.
      const charityMinor = player.charityId
        ? Math.floor(prizeMinor * (player.charityPercentage / 100))
        : 0;

      winners.push({
        userId: player.userId,
        tier,
        prizeMinor,
        charityMinor,
        charityId: player.charityId,
        netMinor: prizeMinor - charityMinor,
        rank: cursor - winnerCount + index + 1,
      });
    });
  }

  const totalAwardedMinor = winners.reduce((sum, w) => sum + w.prizeMinor, 0);
  const totalCharityMinor = winners.reduce((sum, w) => sum + w.charityMinor, 0);

  return {
    eligibleCount: ranked.length,
    prizePoolMinor: poolMinor,
    rolloverInMinor,
    tiers,
    winners,
    rolloverOutMinor,
    undistributedMinor,
    totalAwardedMinor,
    totalCharityMinor,
  };
}

/** Minor units to the decimal major-unit value the database columns hold. */
export function toMajor(minor: number) {
  return Math.round(minor) / 100;
}

/** First day of the month a draw belongs to, as a DATE string. */
export function drawPeriod(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}
