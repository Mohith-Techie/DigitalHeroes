/**
 * Stableford scoring rules (PRD §05).
 *
 * Kept in one module so the client-side input constraints and the server-side
 * validation can never drift apart. The server is the authority — the browser
 * rules exist only to make the form pleasant.
 */

export const MIN_SCORE = 1;
export const MAX_SCORE = 45;

/** PRD §05: only the latest five scores are retained. Enforced by a DB trigger. */
export const MAX_STORED_SCORES = 5;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Accepts only a whole number from 1 to 45.
 *
 * Rejects decimals, exponent notation, leading `+`, whitespace-padded junk and
 * anything `Number()` would silently coerce (`""` → 0, `"1e1"` → 10).
 */
export function parseScore(input: unknown): Parsed<number> {
  const raw = typeof input === "string" ? input.trim() : String(input ?? "");

  if (raw === "") return { ok: false, error: "Enter your score." };
  if (!/^\d+$/.test(raw)) {
    return { ok: false, error: "Scores must be a whole number, with no decimals." };
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    return { ok: false, error: "That is not a valid score." };
  }
  if (value < MIN_SCORE || value > MAX_SCORE) {
    return {
      ok: false,
      error: `Stableford scores run from ${MIN_SCORE} to ${MAX_SCORE}.`,
    };
  }

  return { ok: true, value };
}

/** Today in the timezone-offset-free "YYYY-MM-DD" form. */
export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Shifts a "YYYY-MM-DD" string by whole days. Pure — reads no clock. */
export function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Accepts a calendar date that is not in the future.
 *
 * A one-day grace is allowed because the server compares against its own clock:
 * a player in Auckland posting "today" is already tomorrow in UTC, and it would
 * be wrong to reject that.
 */
export function parseScoreDate(input: unknown): Parsed<string> {
  const raw = typeof input === "string" ? input.trim() : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { ok: false, error: "Choose the date you played." };
  }

  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Catches impossible dates like 2026-02-31, which Date would roll forward.
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false, error: "That date does not exist." };
  }

  const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
  if (date.getTime() > tomorrow) {
    return { ok: false, error: "You cannot post a score for a future date." };
  }

  return { ok: true, value: raw };
}
