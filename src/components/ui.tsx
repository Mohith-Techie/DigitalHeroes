import type { ReactNode } from "react";

/** Panel used for every dashboard module. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-line bg-surface rounded-2xl border p-6 sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </header>
  );
}

type Tone = "neutral" | "positive" | "waiting" | "alert";

const TONES: Record<Tone, string> = {
  // Deliberately no greens anywhere — see the PRD's "avoid golf clichés" note.
  neutral: "border-line text-ink-dim",
  positive: "border-iris/40 text-iris bg-iris/10",
  waiting: "border-ember/40 text-ember bg-ember/10",
  alert: "border-blush/40 text-blush bg-blush/10",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[0.6875rem] tracking-wider uppercase ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Label + value pair, used across the subscription and winnings modules. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 text-lg">{children}</dd>
    </div>
  );
}

/** Inline form error / success message with a polite live region. */
export function FormMessage({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  return (
    <div aria-live="polite" className="min-h-[1.25rem]">
      {error ? <p className="text-blush text-sm">{error}</p> : null}
      {notice ? <p className="text-ember text-sm">{notice}</p> : null}
    </div>
  );
}
