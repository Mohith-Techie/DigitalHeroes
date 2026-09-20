"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/ui";
import { MAX_SCORE, MIN_SCORE, parseScore } from "@/lib/scores";

import { addScore, type ActionState } from "./actions";

const INITIAL: ActionState = {};

const INPUT =
  "border-line bg-canvas text-ink placeholder:text-ink-faint focus:border-ember w-full rounded-xl border px-4 py-3 outline-none transition-colors duration-200";

export function ScoreForm({
  /** Server's current date, "YYYY-MM-DD". */
  today,
  /** Server's date + 1 day, so a player in a timezone ahead of the server
   *  can still log today. The action applies the same grace. */
  latestAllowed,
  disabled,
}: {
  today: string;
  latestAllowed: string;
  disabled?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(addScore, INITIAL);
  const [score, setScore] = useState("");

  // React only auto-resets uncontrolled fields, and `score` is controlled — so
  // clear it by hand once a submission succeeds. `useActionState` returns a
  // fresh object each run, so identity is a reliable "this result is new"
  // signal even when two submissions produce the same message.
  //
  // Adjusted during render rather than in an effect: React re-runs the
  // component immediately without committing the intermediate DOM, so the
  // field never paints with the stale value.
  const [lastResult, setLastResult] = useState(state);
  if (state !== lastResult) {
    setLastResult(state);
    if (state.notice) setScore("");
  }

  // Live feedback while typing; the server re-validates regardless.
  const parsed = parseScore(score);
  const showHint = score !== "" && !parsed.ok;

  return (
    <form
      action={formAction}
      className="space-y-4"
      // The browser's own bubble would fight the inline messages below.
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2">
          <label htmlFor="score" className="eyebrow block">
            Stableford points
          </label>
          <input
            id="score"
            name="score"
            // `type="text"` with a numeric keypad rather than `type="number"`:
            // number inputs still accept "e", "+" and "." in most browsers,
            // and read back as "" when the value is unparseable.
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={2}
            required
            disabled={disabled}
            value={score}
            onChange={(event) =>
              // Strip everything that is not a digit, so only integers exist.
              setScore(event.target.value.replace(/\D/g, "").slice(0, 2))
            }
            placeholder={`${MIN_SCORE}–${MAX_SCORE}`}
            aria-describedby="score-hint"
            aria-invalid={showHint || undefined}
            className={`${INPUT} ${showHint ? "border-blush" : ""}`}
          />
          <p id="score-hint" className="text-ink-faint text-xs">
            {showHint ? (
              <span className="text-blush">{parsed.error}</span>
            ) : (
              `Whole numbers from ${MIN_SCORE} to ${MAX_SCORE}.`
            )}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="score_date" className="eyebrow block">
            Date played
          </label>
          <input
            id="score_date"
            name="score_date"
            type="date"
            required
            disabled={disabled}
            defaultValue={today}
            max={latestAllowed}
            className={`${INPUT} [color-scheme:dark]`}
          />
          <p className="text-ink-faint text-xs">One entry per date.</p>
        </div>
      </div>

      <FormMessage error={state.error} notice={state.notice} />

      <button
        type="submit"
        disabled={disabled || isPending || !parsed.ok}
        className="group bg-ember text-canvas hover:bg-ember-deep ease-out-expo relative inline-flex items-center justify-center overflow-hidden rounded-xl px-6 py-3 font-semibold transition-[transform,background-color,opacity] duration-300 hover:-translate-y-0.5 active:translate-y-0 active:duration-75 disabled:pointer-events-none disabled:opacity-50"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
        />
        <span className="relative">
          {isPending ? "Saving…" : "Add score"}
        </span>
      </button>
    </form>
  );
}
