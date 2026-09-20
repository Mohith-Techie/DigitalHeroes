import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge, Card, CardTitle, Field } from "@/components/ui";
import {
  describePayment,
  describeSubscription,
  describeTier,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/lib/display";
import { MAX_STORED_SCORES, addDaysISO, todayISO } from "@/lib/scores";
import { WINNER_PROOF_BUCKET } from "@/lib/storage";
import { createClient } from "@/utils/supabase/server";

import { ProofUpload } from "./proof-upload";
import { ScoreForm } from "./score-form";
import { ScoreHistory } from "./score-history";

export const metadata: Metadata = { title: "Dashboard" };

/** A query that failed — surfaced rather than silently rendering an empty module. */
function QueryError({ what, message }: { what: string; message: string }) {
  return (
    <p className="border-blush/40 bg-blush/10 text-blush rounded-xl border px-4 py-3 text-sm">
      Could not load {what}: {message}
    </p>
  );
}

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const justPaid = (await searchParams).checkout === "success";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `src/proxy.ts` already blocks anonymous visitors; this is the authoritative
  // check, next to the data it protects.
  if (!user) redirect("/login");

  const today = todayISO();
  // One day of slack, so a player in a timezone ahead of the server can still
  // log "today". `addScore` applies the same grace server-side.
  const latestAllowed = addDaysISO(today, 1);

  // Independent queries — run them together rather than in series.
  const [profileResult, scoresResult, winnersResult] = await Promise.all([
    supabase
      .from("users")
      .select(
        "full_name, email, charity_id, charity_percentage, subscription_status, subscription_current_period_end",
      )
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("scores")
      .select("id, score, score_date")
      // PRD §05: most recent first. `created_at` breaks ties when two entries
      // somehow share a date.
      .eq("user_id", user.id)
      .order("score_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(MAX_STORED_SCORES),

    supabase
      .from("winners")
      .select(
        "id, prize_amount, charity_amount, match_tier, payment_status, paid_at, proof_url, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data;
  const scores = scoresResult.data ?? [];
  const winners = winnersResult.data ?? [];

  // Chosen charity. Fetched separately rather than as an embedded select: the
  // `users` table carries two foreign keys, and an unqualified embed is
  // ambiguous.
  let charityName: string | null = null;
  if (profile?.charity_id) {
    const { data: charity } = await supabase
      .from("charities")
      .select("name")
      .eq("id", profile.charity_id)
      .maybeSingle();
    charityName = charity?.name ?? null;
  }

  // Short-lived signed URLs for proofs already uploaded. The bucket is private,
  // so there is no public URL to fall back on.
  const proofPaths = winners
    .map((w) => w.proof_url)
    .filter((path): path is string => Boolean(path));

  const signedProofs = new Map<string, string>();
  if (proofPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(WINNER_PROOF_BUCKET)
      .createSignedUrls(proofPaths, 600);

    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) {
        signedProofs.set(entry.path, entry.signedUrl);
      }
    }
  }

  const subscription = describeSubscription(
    profile?.subscription_status ?? "inactive",
  );

  const totalWon = winners.reduce((sum, w) => sum + Number(w.prize_amount ?? 0), 0);
  const totalPaid = winners
    .filter((w) => w.payment_status === "paid")
    .reduce((sum, w) => sum + Number(w.prize_amount ?? 0), 0);
  const awaitingProof = winners.filter(
    (w) => w.payment_status === "pending" && !w.proof_url,
  ).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <p className="eyebrow">Your account</p>
        <h1 className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">
          {profile?.full_name
            ? `Welcome back, ${profile.full_name.split(" ")[0]}.`
            : "Welcome back."}
        </h1>
        <p className="text-ink-dim mt-3 text-sm">
          {profile?.email ?? user.email}
        </p>
      </header>

      {justPaid ? (
        <div className="border-iris/40 bg-iris/10 mb-8 rounded-xl border px-5 py-4">
          <p className="text-iris text-sm">
            Payment received — thank you.{" "}
            {subscription.active
              ? "Your subscription is active and you are entered into the next draw."
              : "Your subscription is activating; this page updates as soon as Stripe confirms it, usually within a few seconds."}
          </p>
        </div>
      ) : null}

      {!profile ? (
        <div className="border-ember/40 bg-ember/10 mb-8 rounded-xl border px-5 py-4">
          <p className="text-ember text-sm">
            We could not find your member profile. If this is a brand new
            account, the `public.users` row may not have been created — check
            the sign-up trigger on `auth.users`.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Subscription (PRD §10) ─────────────────────────────────────── */}
        <Card>
          <CardTitle
            eyebrow="Membership"
            title="Subscription"
            action={<Badge tone={subscription.tone}>{subscription.label}</Badge>}
          />

          {profileResult.error ? (
            <QueryError what="your membership" message={profileResult.error.message} />
          ) : (
            <dl className="grid grid-cols-2 gap-6">
              <Field label={subscription.active ? "Renews" : "Ended"}>
                {formatDateTime(profile?.subscription_current_period_end)}
              </Field>
              <Field label="Plan status">{subscription.label}</Field>
            </dl>
          )}

          {!subscription.active ? (
            <Link
              href="/subscribe"
              className="bg-ember text-canvas hover:bg-ember-deep mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200"
            >
              Reactivate subscription
            </Link>
          ) : null}
        </Card>

        {/* ── Charity (PRD §08) ──────────────────────────────────────────── */}
        <Card>
          <CardTitle eyebrow="Giving" title="Your charity" />

          <dl className="grid grid-cols-2 gap-6">
            <Field label="Chosen cause">
              {charityName ?? (
                <span className="text-ink-faint">Not selected yet</span>
              )}
            </Field>
            <Field label="Contribution">
              <span className="text-blush font-display text-3xl">
                {profile?.charity_percentage ?? 0}%
              </span>
            </Field>
          </dl>

          <p className="text-ink-faint mt-5 text-xs leading-relaxed">
            A minimum of 10% of every payment goes to your chosen cause. You can
            raise it at any time.
          </p>

          <Link
            href="/charities"
            className="border-line hover:border-ember hover:text-ember mt-5 inline-flex rounded-full border px-5 py-2.5 text-sm font-medium transition-colors duration-200"
          >
            {charityName ? "Change charity" : "Choose a charity"}
          </Link>
        </Card>
      </div>

      {/* ── Winnings (PRD §10) ───────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardTitle
          eyebrow="Rewards"
          title="Winnings"
          action={
            awaitingProof > 0 ? (
              <Badge tone="waiting">
                {awaitingProof} awaiting proof
              </Badge>
            ) : undefined
          }
        />

        {winnersResult.error ? (
          <QueryError what="your winnings" message={winnersResult.error.message} />
        ) : (
          <>
            <dl className="border-line mb-6 grid grid-cols-2 gap-6 border-b pb-6 sm:grid-cols-3">
              <Field label="Total won">
                <span className="font-display text-ember text-3xl">
                  {formatMoney(totalWon)}
                </span>
              </Field>
              <Field label="Paid out">
                <span className="font-display text-iris text-3xl">
                  {formatMoney(totalPaid)}
                </span>
              </Field>
              <Field label="Wins">
                <span className="font-display text-3xl">{winners.length}</span>
              </Field>
            </dl>

            {winners.length === 0 ? (
              <p className="text-ink-dim text-sm">
                No wins yet. Every active subscriber is entered into the monthly
                draw automatically.
              </p>
            ) : (
              <ul className="divide-line divide-y">
                {winners.map((win) => {
                  const payment = describePayment(win.payment_status);
                  const signedUrl = win.proof_url
                    ? signedProofs.get(win.proof_url)
                    : undefined;
                  // PRD §09: proof is requested while a payout is pending.
                  const needsProof = win.payment_status === "pending";

                  return (
                    <li key={win.id} className="py-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-2xl">
                            {formatMoney(win.prize_amount)}
                          </p>
                          <p className="text-ink-dim mt-1 text-sm">
                            {describeTier(win.match_tier)} ·{" "}
                            {formatDate(win.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {win.paid_at ? (
                            <span className="text-ink-faint text-xs">
                              Paid {formatDate(win.paid_at)}
                            </span>
                          ) : null}
                          <Badge tone={payment.tone}>{payment.label}</Badge>
                        </div>
                      </div>

                      {Number(win.charity_amount) > 0 ? (
                        <p className="text-blush mt-2 text-xs">
                          {formatMoney(win.charity_amount)} of this went to your
                          charity.
                        </p>
                      ) : null}

                      {signedUrl ? (
                        <a
                          href={signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ember hover:text-ember-deep mt-3 inline-flex text-xs underline underline-offset-4 transition-colors duration-200"
                        >
                          View uploaded proof
                        </a>
                      ) : null}

                      {needsProof ? (
                        <ProofUpload
                          winnerId={win.id}
                          userId={user.id}
                          hasProof={Boolean(win.proof_url)}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Card>

      {/* ── Scores (PRD §05) ─────────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardTitle
          eyebrow="Performance"
          title="Add a score"
          action={
            <span className="text-ink-faint font-mono text-xs">
              {scores.length}/{MAX_STORED_SCORES} kept
            </span>
          }
        />

        <ScoreForm
          today={today}
          latestAllowed={latestAllowed}
          disabled={!profile}
        />

        <div className="border-line mt-8 border-t pt-6">
          <p className="eyebrow mb-2">Recent rounds</p>
          {scoresResult.error ? (
            <QueryError what="your scores" message={scoresResult.error.message} />
          ) : (
            <ScoreHistory scores={scores} latestAllowed={latestAllowed} />
          )}
          <p className="text-ink-faint mt-4 text-xs">
            Only your {MAX_STORED_SCORES} most recent rounds are kept — adding a
            sixth replaces the oldest automatically.
          </p>
        </div>
      </Card>
    </div>
  );
}
