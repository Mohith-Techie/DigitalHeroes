import type { Metadata } from "next";

import { Badge, Card, CardTitle, Field } from "@/components/ui";
import { requireAdminPage } from "@/lib/dal";
import {
  describePayment,
  describeTier,
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/lib/display";
import { WINNER_PROOF_BUCKET } from "@/lib/storage";
import { createClient } from "@/utils/supabase/server";

import { PayoutControls } from "./payout-actions";

export const metadata: Metadata = { title: "Payouts" };

/** Payouts still needing action, newest first. */
const OPEN_STATES = ["pending", "processing"] as const;

export default async function AdminPayoutsPage() {
  // Repeated here on purpose — the layout does not gate this segment.
  await requireAdminPage();

  const supabase = await createClient();

  const { data: winners, error } = await supabase
    .from("winners")
    .select(
      "id, user_id, draw_id, match_tier, prize_amount, charity_amount, payment_status, proof_url, paid_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = winners ?? [];

  // Member details for the rows on screen, in one query.
  const userIds = [...new Set(rows.map((w) => w.user_id))];
  const members = new Map<string, { email: string | null; fullName: string | null }>();

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", userIds);

    for (const user of users ?? []) {
      members.set(user.id, { email: user.email, fullName: user.full_name });
    }
  }

  // Signed URLs for every uploaded proof. The bucket is private, so an admin
  // cannot simply follow a stored path.
  const proofPaths = rows
    .map((w) => w.proof_url)
    .filter((path): path is string => Boolean(path));

  const signedProofs = new Map<string, string>();
  if (proofPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(WINNER_PROOF_BUCKET)
      .createSignedUrls(proofPaths, 600);

    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) signedProofs.set(entry.path, entry.signedUrl);
    }
  }

  const open = rows.filter((w) =>
    (OPEN_STATES as readonly string[]).includes(w.payment_status),
  );
  const settled = rows.filter(
    (w) => !(OPEN_STATES as readonly string[]).includes(w.payment_status),
  );

  const owed = open.reduce(
    (sum, w) => sum + (Number(w.prize_amount) - Number(w.charity_amount)),
    0,
  );
  const awaitingProof = open.filter((w) => !w.proof_url).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10">
        <p className="eyebrow">Winners management</p>
        <h1 className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">
          Verify and pay.
        </h1>
        <p className="text-ink-dim mt-3 max-w-2xl text-sm leading-relaxed">
          Members upload a screenshot of their scores as proof. Approve a payout
          by marking it paid, or reject the proof to ask for another.
        </p>
      </header>

      <Card>
        <CardTitle eyebrow="Outstanding" title="Pending payouts" />

        {error ? (
          <p className="border-blush/40 bg-blush/10 text-blush rounded-xl border px-4 py-3 text-sm">
            Could not load payouts: {error.message}
          </p>
        ) : (
          <>
            <dl className="border-line mb-6 grid grid-cols-2 gap-6 border-b pb-6 sm:grid-cols-3">
              <Field label="Awaiting payment">
                <span className="font-display text-ember text-3xl">
                  {open.length}
                </span>
              </Field>
              <Field label="Net owed">
                <span className="font-display text-3xl">{formatMoney(owed)}</span>
              </Field>
              <Field label="Missing proof">
                <span className="font-display text-blush text-3xl">
                  {awaitingProof}
                </span>
              </Field>
            </dl>

            {open.length === 0 ? (
              <p className="text-ink-dim text-sm">
                Nothing outstanding. Every payout has been settled.
              </p>
            ) : (
              <ul className="divide-line divide-y">
                {open.map((winner) => (
                  <PayoutRow
                    key={winner.id}
                    winner={winner}
                    member={members.get(winner.user_id)}
                    proofUrl={
                      winner.proof_url ? signedProofs.get(winner.proof_url) : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </Card>

      <Card className="mt-6">
        <CardTitle eyebrow="History" title="Settled" />
        {settled.length === 0 ? (
          <p className="text-ink-dim text-sm">No payouts have been settled yet.</p>
        ) : (
          <ul className="divide-line divide-y">
            {settled.map((winner) => {
              const payment = describePayment(winner.payment_status);
              const member = members.get(winner.user_id);
              return (
                <li
                  key={winner.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-medium">
                      {formatMoney(Number(winner.prize_amount))}
                      <span className="text-ink-faint ml-3 text-sm font-normal">
                        {member?.email ?? winner.user_id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="text-ink-dim mt-1 text-xs">
                      {describeTier(winner.match_tier)} ·{" "}
                      {winner.paid_at
                        ? `paid ${formatDateTime(winner.paid_at)}`
                        : formatDate(winner.created_at)}
                    </p>
                  </div>
                  <Badge tone={payment.tone}>{payment.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function PayoutRow({
  winner,
  member,
  proofUrl,
}: {
  winner: {
    id: string;
    user_id: string;
    match_tier: number;
    prize_amount: number;
    charity_amount: number;
    payment_status: string;
    proof_url: string | null;
    created_at: string;
  };
  member?: { email: string | null; fullName: string | null };
  proofUrl?: string;
}) {
  const gross = Number(winner.prize_amount);
  const charity = Number(winner.charity_amount);

  return (
    <li className="py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl">{formatMoney(gross - charity)}</p>
          <p className="text-ink-dim mt-1 text-sm">
            {member?.fullName ?? member?.email ?? winner.user_id.slice(0, 8)} ·{" "}
            {describeTier(winner.match_tier)} · {formatDate(winner.created_at)}
          </p>
          <p className="text-ink-faint mt-1 text-xs">
            {formatMoney(gross)} gross −{" "}
            <span className="text-blush">{formatMoney(charity)}</span> to charity
          </p>
        </div>

        <div className="flex items-center gap-3">
          {winner.proof_url ? (
            <Badge tone="waiting">Proof uploaded</Badge>
          ) : (
            <Badge tone="alert">No proof</Badge>
          )}
        </div>
      </div>

      {proofUrl ? (
        <a
          href={proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-line hover:border-ember group mt-4 block overflow-hidden rounded-xl border transition-colors duration-300"
        >
          {/* Proof screenshots are arbitrary member uploads from a private
              bucket, so they are shown via a plain <img>: next/image would try
              to optimise a short-lived signed URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofUrl}
            alt={`Score proof submitted by ${member?.email ?? "member"}`}
            className="max-h-64 w-full bg-black/40 object-contain"
          />
          <span className="text-ink-dim group-hover:text-ember block px-4 py-2 text-xs transition-colors duration-300">
            Open full size ↗
          </span>
        </a>
      ) : winner.proof_url ? (
        <p className="text-ink-faint mt-3 text-xs">
          A proof is attached but could not be signed for viewing — check the{" "}
          {WINNER_PROOF_BUCKET} bucket policies.
        </p>
      ) : (
        <p className="text-ink-faint mt-3 text-xs">
          Waiting for the member to upload a screenshot of their scores.
        </p>
      )}

      <PayoutControls winnerId={winner.id} hasProof={Boolean(winner.proof_url)} />
    </li>
  );
}
