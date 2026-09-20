"use client";

import { useState, useTransition } from "react";

import { Badge, FormMessage } from "@/components/ui";
import { formatMinor } from "@/lib/display";
import type { DrawPlan } from "@/lib/draw";

import { executeDraw, simulateDraw, type SimulationResult } from "./actions";

/**
 * Simulate-then-publish control (PRD §06: "Simulation before publish").
 *
 * Publishing is deliberately two-step and cannot be reached without first
 * running a simulation: a draw moves real money and cannot be undone from this
 * UI, so the admin sees the exact figures before committing to them.
 */
export function DrawRunner({ periodLabel }: { periodLabel: string }) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [publishState, setPublishState] = useState<{
    error?: string;
    notice?: string;
  }>({});
  const [confirming, setConfirming] = useState(false);
  const [isSimulating, startSimulate] = useTransition();
  const [isPublishing, startPublish] = useTransition();

  function runSimulation() {
    setPublishState({});
    setConfirming(false);
    startSimulate(async () => {
      setResult(await simulateDraw());
    });
  }

  function publish() {
    startPublish(async () => {
      const outcome = await executeDraw();
      setPublishState(outcome);
      setConfirming(false);
      if (outcome.notice) setResult(null); // force a fresh simulation next time
    });
  }

  const plan = result?.plan;
  const blocked = result?.alreadyDrawn === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runSimulation}
          disabled={isSimulating || isPublishing}
          className="border-line hover:border-ember hover:text-ember rounded-xl border px-6 py-3 text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSimulating ? "Calculating…" : "Run simulation"}
        </button>

        {plan && !blocked ? (
          confirming ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-ink-dim text-sm">
                Publish this draw? It cannot be undone here.
              </span>
              <button
                type="button"
                onClick={publish}
                disabled={isPublishing}
                className="bg-ember text-canvas hover:bg-ember-deep rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50"
              >
                {isPublishing ? "Publishing…" : "Yes, publish"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="border-line hover:border-line-bright rounded-xl border px-4 py-2.5 text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="bg-ember text-canvas hover:bg-ember-deep rounded-xl px-6 py-3 text-sm font-semibold transition-colors duration-200"
            >
              Publish draw for {periodLabel}
            </button>
          )
        ) : null}
      </div>

      <FormMessage error={result?.error ?? publishState.error} notice={publishState.notice} />

      {blocked ? (
        <p className="border-ember/40 bg-ember/10 text-ember rounded-xl border px-5 py-4 text-sm">
          A draw has already been published for {periodLabel}. Only one draw per
          month may be published.
        </p>
      ) : null}

      {plan && result ? (
        <SimulationReport
          plan={plan}
          monthlyRevenueMinor={result.monthlyRevenueMinor ?? 0}
          charityPoolMinor={result.charityPoolMinor ?? 0}
        />
      ) : null}
    </div>
  );
}

function SimulationReport({
  plan,
  monthlyRevenueMinor,
  charityPoolMinor,
}: {
  plan: DrawPlan;
  monthlyRevenueMinor: number;
  charityPoolMinor: number;
}) {
  return (
    <div className="border-line bg-canvas space-y-6 rounded-2xl border p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Simulation</p>
        <Badge tone="waiting">Not saved</Badge>
      </div>

      <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Stat label="Monthly revenue" value={formatMinor(monthlyRevenueMinor)} />
        <Stat
          label="Prize pool (50%)"
          value={formatMinor(plan.prizePoolMinor)}
          accent="text-ember"
        />
        <Stat label="Charity pool" value={formatMinor(charityPoolMinor)} accent="text-blush" />
        <Stat label="Eligible players" value={String(plan.eligibleCount)} />
      </dl>

      {plan.rolloverInMinor > 0 ? (
        <p className="text-ember text-sm">
          Includes {formatMinor(plan.rolloverInMinor)} carried over from
          previous unclaimed jackpots.
        </p>
      ) : null}

      {/* Tier breakdown */}
      <div className="border-line divide-line divide-y rounded-xl border">
        {plan.tiers.map((tier) => (
          <div
            key={tier.tier}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-medium">{tier.tier}-number match tier</p>
              <p className="text-ink-faint mt-1 font-mono text-xs">
                {tier.tier === 5 ? "40%" : tier.tier === 4 ? "35%" : "25%"} of
                pool · top{" "}
                {tier.tier === 5 ? "5%" : tier.tier === 4 ? "10%" : "20%"} of
                players
              </p>
            </div>

            <div className="text-right">
              <p className="font-display text-2xl">{formatMinor(tier.poolMinor)}</p>
              <p className="text-ink-dim mt-1 text-xs">
                {tier.winnerCount > 0 ? (
                  `${tier.winnerCount} winner${tier.winnerCount === 1 ? "" : "s"}`
                ) : (
                  <span className="text-ink-faint">
                    no winners · needs {tier.playersNeeded} more player
                    {tier.playersNeeded === 1 ? "" : "s"}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {plan.rolloverOutMinor > 0 ? (
        <p className="text-ink-dim text-sm">
          <span className="text-ember">
            {formatMinor(plan.rolloverOutMinor)}
          </span>{" "}
          will roll over to next month&rsquo;s jackpot — nobody reached the top
          tier.
        </p>
      ) : null}

      {plan.undistributedMinor > 0 ? (
        <p className="text-ink-dim text-sm">
          {formatMinor(plan.undistributedMinor)} stays undistributed: the 4- and
          3-number tiers do not roll over.
        </p>
      ) : null}

      {plan.winners.length > 0 ? (
        <div>
          <p className="eyebrow mb-3">
            Winners ({plan.winners.length}) · {formatMinor(plan.totalAwardedMinor)}{" "}
            total
          </p>
          <div className="border-line max-h-80 overflow-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-ink-faint sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-mono text-xs font-normal">#</th>
                  <th className="px-4 py-2 font-mono text-xs font-normal">Member</th>
                  <th className="px-4 py-2 font-mono text-xs font-normal">Tier</th>
                  <th className="px-4 py-2 text-right font-mono text-xs font-normal">
                    Prize
                  </th>
                  <th className="px-4 py-2 text-right font-mono text-xs font-normal">
                    To charity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {plan.winners.map((winner) => (
                  <tr key={`${winner.userId}-${winner.tier}`}>
                    <td className="text-ink-faint px-4 py-2 font-mono text-xs">
                      {winner.rank}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {winner.userId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2">{winner.tier}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatMinor(winner.prizeMinor)}
                    </td>
                    <td className="text-blush px-4 py-2 text-right tabular-nums">
                      {formatMinor(winner.charityMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-ink-dim text-sm">
          No tier reached its selection threshold, so this draw would record no
          winners.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={`font-display mt-2 text-2xl tabular-nums ${accent}`}>
        {value}
      </dd>
    </div>
  );
}
