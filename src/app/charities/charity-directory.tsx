"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { FormMessage } from "@/components/ui";
import {
  MAX_CHARITY_PERCENTAGE,
  MIN_CHARITY_PERCENTAGE,
  PERCENTAGE_PRESETS,
  parseCharityPercentage,
} from "@/lib/charity";

import { selectCharity, type CharityState } from "./actions";

const INITIAL: CharityState = {};

export type CharityCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  website_url: string | null;
};

export function CharityDirectory({
  charities,
  canSelect,
  initialCharityId,
  initialPercentage,
}: {
  charities: CharityCard[];
  canSelect: boolean;
  initialCharityId: string | null;
  initialPercentage: number;
}) {
  const [state, formAction, isPending] = useActionState(selectCharity, INITIAL);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialCharityId);
  const [percentage, setPercentage] = useState(
    // Never start below the floor, even if the stored value somehow is.
    Math.max(initialPercentage, MIN_CHARITY_PERCENTAGE),
  );

  // Only offer category chips for categories that actually exist.
  const categories = useMemo(() => {
    const found = new Set<string>();
    for (const charity of charities) {
      if (charity.category) found.add(charity.category);
    }
    return [...found].sort();
  }, [charities]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return charities.filter((charity) => {
      if (category && charity.category !== category) return false;
      if (!needle) return true;
      return (
        charity.name.toLowerCase().includes(needle) ||
        (charity.description ?? "").toLowerCase().includes(needle) ||
        (charity.category ?? "").toLowerCase().includes(needle)
      );
    });
  }, [charities, query, category]);

  const parsed = parseCharityPercentage(String(percentage));
  const selectedCharity = charities.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="mt-12">
      {/* ── Search & filter (PRD §08.2) ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="charity-search" className="sr-only">
          Search charities
        </label>
        <input
          id="charity-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search causes…"
          className="border-line bg-surface text-ink placeholder:text-ink-faint focus:border-ember min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none transition-colors duration-200 sm:max-w-xs"
        />

        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={category === null}
              onClick={() => setCategory(null)}
            >
              All
            </FilterChip>
            {categories.map((name) => (
              <FilterChip
                key={name}
                active={category === name}
                onClick={() => setCategory(name)}
              >
                {name}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <span className="text-ink-faint ml-auto font-mono text-xs">
          {visible.length} of {charities.length}
        </span>
      </div>

      {/* ── Directory ────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <p className="text-ink-dim mt-10 text-sm">
          No causes match that search.
        </p>
      ) : (
        <div
          role={canSelect ? "radiogroup" : undefined}
          aria-label={canSelect ? "Choose a charity" : undefined}
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((charity) => {
            const isSelected = selectedId === charity.id;

            const body = (
              <>
                {charity.category ? (
                  <p className="eyebrow">{charity.category}</p>
                ) : null}
                <h2 className="mt-2 text-lg font-semibold tracking-tight">
                  {charity.name}
                </h2>
                <p className="text-ink-dim mt-3 line-clamp-4 text-sm leading-relaxed">
                  {charity.description ?? "No description provided yet."}
                </p>
                {charity.website_url ? (
                  <span className="text-ink-faint mt-4 block truncate text-xs">
                    {charity.website_url.replace(/^https?:\/\//, "")}
                  </span>
                ) : null}
              </>
            );

            const shared = `ease-out-expo relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-500 hover:-translate-y-1 ${
              isSelected
                ? "border-ember bg-surface shadow-[0_20px_60px_-30px_var(--color-ember)]"
                : "border-line bg-surface hover:border-line-bright"
            }`;

            // Only render a control when it does something. For signed-out
            // visitors this is a plain article, not a dead button.
            return canSelect ? (
              <button
                key={charity.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedId(charity.id)}
                className={shared}
              >
                {isSelected ? (
                  <span className="bg-ember text-canvas absolute top-5 right-5 rounded-full px-2.5 py-1 font-mono text-[0.625rem] tracking-wider uppercase">
                    Chosen
                  </span>
                ) : null}
                {body}
              </button>
            ) : (
              <article key={charity.id} className={shared}>
                {body}
              </article>
            );
          })}
        </div>
      )}

      {/* ── Contribution (PRD §08.1) ─────────────────────────────────────── */}
      {canSelect ? (
        <form
          action={formAction}
          className="border-line bg-surface mt-12 rounded-2xl border p-7 sm:p-8"
        >
          <input type="hidden" name="charity_id" value={selectedId ?? ""} />
          <input
            type="hidden"
            name="charity_percentage"
            value={String(percentage)}
          />

          <p className="eyebrow">Your contribution</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            {selectedCharity
              ? `How much of your subscription goes to ${selectedCharity.name}?`
              : "Pick a cause above to continue"}
          </h2>

          <div className="mt-8 flex flex-wrap items-end gap-6">
            <p className="font-display text-blush text-6xl tabular-nums">
              {percentage}
              <span className="text-ink-faint text-3xl">%</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {PERCENTAGE_PRESETS.map((preset) => (
                <FilterChip
                  key={preset}
                  active={percentage === preset}
                  onClick={() => setPercentage(preset)}
                >
                  {preset}%
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="percentage-range" className="sr-only">
              Contribution percentage
            </label>
            <input
              id="percentage-range"
              type="range"
              min={MIN_CHARITY_PERCENTAGE}
              max={MAX_CHARITY_PERCENTAGE}
              step={1}
              value={percentage}
              onChange={(event) => setPercentage(Number(event.target.value))}
              className="accent-ember w-full"
              aria-describedby="percentage-help"
            />
            <div className="text-ink-faint mt-2 flex justify-between font-mono text-xs">
              <span>{MIN_CHARITY_PERCENTAGE}% minimum</span>
              <span>{MAX_CHARITY_PERCENTAGE}%</span>
            </div>
          </div>

          <p id="percentage-help" className="text-ink-dim mt-5 text-sm leading-relaxed">
            Every member gives at least {MIN_CHARITY_PERCENTAGE}% of their
            subscription. You can raise yours at any time — and lower it again,
            but never below the {MIN_CHARITY_PERCENTAGE}% floor.
          </p>

          <div className="mt-6">
            <FormMessage error={state.error} notice={state.notice} />
          </div>

          <button
            type="submit"
            disabled={!selectedId || !parsed.ok || isPending}
            className="group bg-ember text-canvas hover:bg-ember-deep ease-out-expo relative mt-2 inline-flex items-center justify-center overflow-hidden rounded-xl px-7 py-3.5 font-semibold transition-[transform,background-color,opacity] duration-300 hover:-translate-y-0.5 active:translate-y-0 active:duration-75 disabled:pointer-events-none disabled:opacity-50"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
            />
            <span className="relative">
              {isPending ? "Saving…" : "Save my choice"}
            </span>
          </button>
        </form>
      ) : (
        <div className="border-ember/40 bg-ember/10 mt-12 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4">
          <p className="text-ember text-sm">
            Sign in to choose your cause and set your contribution.
          </p>
          <Link
            href="/login?redirectTo=%2Fcharities"
            className="bg-ember text-canvas hover:bg-ember-deep rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 font-mono text-xs tracking-wide transition-colors duration-200 ${
        active
          ? "border-ember text-ember bg-ember/10"
          : "border-line text-ink-dim hover:border-line-bright hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
