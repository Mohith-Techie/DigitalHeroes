import type { Metadata } from "next";

import { Badge, Card, CardTitle } from "@/components/ui";
import { requireAdminPage } from "@/lib/dal";
import { formatDate, formatDateTime, formatMoney } from "@/lib/display";
import { drawPeriod } from "@/lib/draw";
import { createClient } from "@/utils/supabase/server";

import { DrawRunner } from "./draw-runner";

export const metadata: Metadata = { title: "Draw management" };

const DRAW_STATUS_TONE = {
  drawn: "positive",
  settled: "positive",
  open: "waiting",
  scheduled: "waiting",
  closed: "waiting",
  cancelled: "alert",
} as const;

export default async function AdminDrawsPage() {
  // Repeated here on purpose: the layout's check does not gate this segment.
  await requireAdminPage();

  const supabase = await createClient();
  const period = drawPeriod();

  const [drawsResult, winnerCountResult] = await Promise.all([
    supabase
      .from("draws")
      .select(
        "id, draw_date, status, entries_count, total_pool, prize_pool, charity_pool, drawn_at",
      )
      .order("draw_date", { ascending: false })
      .limit(24),
    supabase.from("winners").select("draw_id, match_tier, prize_amount"),
  ]);

  const draws = drawsResult.data ?? [];
  const winners = winnerCountResult.data ?? [];

  const winnersByDraw = winners.reduce((map, row) => {
    const entry = map.get(row.draw_id) ?? { count: 0, jackpot: false };
    entry.count += 1;
    if (row.match_tier === 5) entry.jackpot = true;
    map.set(row.draw_id, entry);
    return map;
  }, new Map<string, { count: number; jackpot: boolean }>());

  const periodLabel = formatDate(period);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10">
        <p className="eyebrow">Draw management</p>
        <h1 className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">
          Run the monthly draw.
        </h1>
        <p className="text-ink-dim mt-3 max-w-2xl text-sm leading-relaxed">
          Winners are ranked on their retained Stableford scores: the top 5%
          take the 5-number tier, the next 10% the 4-number tier, and the next
          20% the 3-number tier. The prize pool is half of this month&rsquo;s
          subscription revenue, read live from Stripe.
        </p>
      </header>

      <Card>
        <CardTitle
          eyebrow={`Period · ${periodLabel}`}
          title="Simulate, then publish"
          action={<Badge tone="waiting">Irreversible</Badge>}
        />
        <DrawRunner periodLabel={periodLabel} />
      </Card>

      <Card className="mt-6">
        <CardTitle eyebrow="History" title="Past draws" />

        {drawsResult.error ? (
          <p className="border-blush/40 bg-blush/10 text-blush rounded-xl border px-4 py-3 text-sm">
            Could not load draws: {drawsResult.error.message}
          </p>
        ) : draws.length === 0 ? (
          <p className="text-ink-dim text-sm">
            No draws have been run yet. Simulate one above to see what this
            month would pay out.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-ink-faint">
                <tr className="border-line border-b">
                  <th className="py-3 pr-4 font-mono text-xs font-normal">Period</th>
                  <th className="py-3 pr-4 font-mono text-xs font-normal">Status</th>
                  <th className="py-3 pr-4 font-mono text-xs font-normal">Entries</th>
                  <th className="py-3 pr-4 font-mono text-xs font-normal">Winners</th>
                  <th className="py-3 pr-4 text-right font-mono text-xs font-normal">
                    Prize pool
                  </th>
                  <th className="py-3 pr-4 text-right font-mono text-xs font-normal">
                    Charity
                  </th>
                  <th className="py-3 text-right font-mono text-xs font-normal">
                    Drawn
                  </th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {draws.map((draw) => {
                  const stats = winnersByDraw.get(draw.id);
                  return (
                    <tr key={draw.id}>
                      <td className="py-4 pr-4 font-medium">
                        {formatDate(draw.draw_date)}
                      </td>
                      <td className="py-4 pr-4">
                        <Badge
                          tone={
                            DRAW_STATUS_TONE[
                              draw.status as keyof typeof DRAW_STATUS_TONE
                            ] ?? "neutral"
                          }
                        >
                          {draw.status}
                        </Badge>
                      </td>
                      <td className="text-ink-dim py-4 pr-4 tabular-nums">
                        {draw.entries_count}
                      </td>
                      <td className="text-ink-dim py-4 pr-4 tabular-nums">
                        {stats?.count ?? 0}
                        {stats && !stats.jackpot ? (
                          <span className="text-ember ml-2 font-mono text-[0.625rem] tracking-wider uppercase">
                            rolled
                          </span>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4 text-right tabular-nums">
                        {formatMoney(Number(draw.prize_pool))}
                      </td>
                      <td className="text-blush py-4 pr-4 text-right tabular-nums">
                        {formatMoney(Number(draw.charity_pool))}
                      </td>
                      <td className="text-ink-faint py-4 text-right text-xs">
                        {draw.drawn_at ? formatDateTime(draw.drawn_at) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
