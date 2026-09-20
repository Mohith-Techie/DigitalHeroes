"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/ui";
import { formatDate } from "@/lib/display";
import { MAX_SCORE, MIN_SCORE, parseScore } from "@/lib/scores";

import { deleteScore, updateScore, type ActionState } from "./actions";

const INITIAL: ActionState = {};

export type ScoreRecord = {
  id: string;
  score: number;
  score_date: string;
};

const INPUT =
  "border-line bg-canvas text-ink focus:border-ember w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors duration-200";

const GHOST_BUTTON =
  "border-line hover:border-ember hover:text-ember rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

export function ScoreHistory({
  scores,
  latestAllowed,
}: {
  scores: ScoreRecord[];
  latestAllowed: string;
}) {
  if (scores.length === 0) {
    return (
      <p className="text-ink-dim py-6 text-sm">
        No scores yet. Add your first one above — your five most recent rounds
        are kept.
      </p>
    );
  }

  return (
    <ol className="divide-line divide-y">
      {scores.map((record, index) => (
        <ScoreRow
          key={record.id}
          record={record}
          latestAllowed={latestAllowed}
          isMostRecent={index === 0}
        />
      ))}
    </ol>
  );
}

function ScoreRow({
  record,
  latestAllowed,
  isMostRecent,
}: {
  record: ScoreRecord;
  latestAllowed: string;
  isMostRecent: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");

  const [editState, editAction, isSaving] = useActionState(
    updateScore,
    INITIAL,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteScore,
    INITIAL,
  );

  const [draftScore, setDraftScore] = useState(String(record.score));
  const parsed = parseScore(draftScore);

  if (mode === "edit") {
    return (
      <li className="py-4">
        <form action={editAction} className="space-y-3" noValidate>
          <input type="hidden" name="id" value={record.id} />

          <div className="grid gap-3 sm:grid-cols-[6rem_1fr_auto]">
            <div>
              <label
                htmlFor={`score-${record.id}`}
                className="eyebrow mb-1.5 block"
              >
                Points
              </label>
              <input
                id={`score-${record.id}`}
                name="score"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                autoComplete="off"
                value={draftScore}
                onChange={(event) =>
                  setDraftScore(event.target.value.replace(/\D/g, "").slice(0, 2))
                }
                aria-invalid={!parsed.ok || undefined}
                className={`${INPUT} ${parsed.ok ? "" : "border-blush"}`}
              />
            </div>

            <div>
              <label
                htmlFor={`date-${record.id}`}
                className="eyebrow mb-1.5 block"
              >
                Date
              </label>
              <input
                id={`date-${record.id}`}
                name="score_date"
                type="date"
                defaultValue={record.score_date.slice(0, 10)}
                max={latestAllowed}
                className={`${INPUT} [color-scheme:dark]`}
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={isSaving || !parsed.ok}
                className="bg-ember text-canvas hover:bg-ember-deep rounded-lg px-4 py-2 text-xs font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftScore(String(record.score));
                  setMode("view");
                }}
                className={GHOST_BUTTON}
              >
                Cancel
              </button>
            </div>
          </div>

          {!parsed.ok && draftScore !== "" ? (
            <p className="text-blush text-xs">{parsed.error}</p>
          ) : null}
          <FormMessage error={editState.error} />
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex items-baseline gap-4">
        <span className="font-display text-ember w-12 text-3xl tabular-nums">
          {record.score}
        </span>
        <span className="text-ink-faint text-xs">
          / {MAX_SCORE}
          <span className="sr-only"> Stableford points, minimum {MIN_SCORE}</span>
        </span>
        <span className="text-ink-dim text-sm">
          {formatDate(record.score_date)}
        </span>
        {isMostRecent ? (
          <span className="border-ember/40 text-ember rounded-full border px-2 py-0.5 font-mono text-[0.625rem] tracking-wider uppercase">
            Latest
          </span>
        ) : null}
      </div>

      {mode === "confirm-delete" ? (
        <form action={deleteAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={record.id} />
          <span className="text-ink-dim mr-1 text-xs">Delete this score?</span>
          <button
            type="submit"
            disabled={isDeleting}
            className="border-blush/50 text-blush hover:bg-blush/10 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className={GHOST_BUTTON}
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={GHOST_BUTTON}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("confirm-delete")}
            className={GHOST_BUTTON}
          >
            Delete
          </button>
        </div>
      )}

      {deleteState.error ? (
        <p className="text-blush w-full text-xs">{deleteState.error}</p>
      ) : null}
    </li>
  );
}
