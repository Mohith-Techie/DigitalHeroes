"use client";

import { useActionState } from "react";

import { authenticate, type AuthState } from "./actions";

const INITIAL: AuthState = {};

const FIELD_CLASSES =
  "peer border-line bg-canvas text-ink placeholder:text-ink-faint focus:border-ember w-full rounded-xl border px-4 py-3.5 outline-none transition-colors duration-200";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(authenticate, INITIAL);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="eyebrow block">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={FIELD_CLASSES}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="eyebrow block">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className={FIELD_CLASSES}
        />
      </div>

      {/* Feedback. `aria-live` announces it to screen readers without moving focus. */}
      <div aria-live="polite" className="min-h-[1.25rem]">
        {state.error ? (
          <p className="text-blush animate-fade-up text-sm">{state.error}</p>
        ) : null}
        {state.notice ? (
          <p className="text-ember animate-fade-up text-sm">{state.notice}</p>
        ) : null}
      </div>

      <div className="space-y-3 pt-1">
        <button
          type="submit"
          name="intent"
          value="signin"
          disabled={isPending}
          className="group bg-ember text-canvas hover:bg-ember-deep ease-out-expo relative flex w-full items-center justify-center overflow-hidden rounded-xl px-6 py-3.5 font-semibold transition-[transform,background-color,opacity] duration-300 hover:-translate-y-0.5 active:translate-y-0 active:duration-75 disabled:pointer-events-none disabled:opacity-60"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-white/30 blur-md transition-transform duration-700 ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
          />
          <span className="relative">
            {isPending ? "One moment…" : "Sign in"}
          </span>
        </button>

        <button
          type="submit"
          name="intent"
          value="signup"
          disabled={isPending}
          className="border-line hover:border-ember hover:text-ember w-full rounded-xl border px-6 py-3.5 font-medium transition-colors duration-300 disabled:pointer-events-none disabled:opacity-60"
        >
          Create an account
        </button>
      </div>
    </form>
  );
}
