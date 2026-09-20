import Link from "next/link";

type Props = {
  /** Visible label. */
  children: React.ReactNode;
  /** `lg` is for the hero and the closing section; `sm` for the header bar. */
  size?: "sm" | "lg";
  className?: string;
};

/**
 * The platform's primary call to action (PRD §12: "Subscribe button / flow must
 * be prominent and persuasive").
 *
 * Micro-interaction: a light sheen sweeps across on hover and the button lifts
 * a fraction, settling back on press. Built from transitions rather than
 * keyframes so it starts and reverses with the pointer instead of running on a
 * fixed loop.
 */
export function SubscribeCta({ children, size = "lg", className = "" }: Props) {
  return (
    <Link
      href="/subscribe"
      className={`group bg-ember text-canvas ease-out-expo relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:bg-ember-deep hover:shadow-[0_16px_44px_-16px_var(--color-ember)] active:translate-y-0 active:duration-75 ${
        size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm"
      } ${className}`}
    >
      {/* Sheen. Decorative only, and non-interactive so it never eats clicks. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
      />
      <span className="relative">{children}</span>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="relative h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 8h11M9 4l4 4-4 4" />
      </svg>
    </Link>
  );
}
