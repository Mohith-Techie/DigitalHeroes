"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/ui";
import { markPayoutPaid, rejectProof, type AdminState } from "../actions";

const INITIAL: AdminState = {};

/**
 * Approve / reject controls for one payout (PRD §09).
 *
 * Marking paid is a two-step confirm: it stamps `paid_at` and is not
 * reversible from this screen.
 */
export function PayoutControls({
  winnerId,
  hasProof,
}: {
  winnerId: string;
  hasProof: boolean;
}) {
  const [payState, payAction, isPaying] = useActionState(markPayoutPaid, INITIAL);
  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectProof,
    INITIAL,
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={payAction}>
          <input type="hidden" name="winner_id" value={winnerId} />
          <button
            type="submit"
            disabled={isPaying || isRejecting}
            className="bg-ember text-canvas hover:bg-ember-deep rounded-lg px-4 py-2 text-xs font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPaying ? "Marking…" : "Mark as paid"}
          </button>
        </form>

        {hasProof ? (
          <form action={rejectAction}>
            <input type="hidden" name="winner_id" value={winnerId} />
            <button
              type="submit"
              disabled={isPaying || isRejecting}
              className="border-blush/50 text-blush hover:bg-blush/10 rounded-lg border px-4 py-2 text-xs font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50"
            >
              {isRejecting ? "Rejecting…" : "Reject proof"}
            </button>
          </form>
        ) : null}
      </div>

      <FormMessage
        error={payState.error ?? rejectState.error}
        notice={payState.notice ?? rejectState.notice}
      />
    </div>
  );
}
