import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to manage your subscription, post your scores and follow your charity's total.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // `searchParams` is a Promise in Next.js 16, and each value may be a string,
  // an array (repeated key), or undefined.
  const params = await searchParams;
  const raw = params.redirectTo;
  const redirectTo = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-6 py-16">
      {/* Same ambient warmth as the landing page, so the two feel continuous. */}
      <div
        aria-hidden
        className="bg-ember/12 animate-drift pointer-events-none absolute -top-40 left-1/2 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-[130px]"
      />

      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="group text-ink-dim hover:text-ink mb-12 inline-flex items-center gap-2 text-sm transition-colors duration-200"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          Back to Digital Heroes
        </Link>

        <p className="eyebrow">Members</p>
        <h1 className="font-display mt-4 text-4xl tracking-tight text-balance sm:text-5xl">
          Welcome back.
        </h1>
        <p className="text-ink-dim mt-4 leading-relaxed">
          Sign in to post your scores, check the draw, and see what your charity
          has raised.
        </p>

        <div className="border-line bg-surface mt-10 rounded-2xl border p-7 sm:p-8">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <p className="text-ink-faint mt-8 text-center text-xs leading-relaxed">
          Creating an account is free. You pick your charity and your plan on the
          next step.
        </p>
      </div>
    </main>
  );
}
