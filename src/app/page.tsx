import Link from "next/link";

import { CountUp } from "@/components/count-up";
import { SiteHeader } from "@/components/site-header";
import { SubscribeCta } from "@/components/subscribe-cta";

/**
 * Landing page.
 *
 * PRD §12 requires the homepage to communicate four things: what the user does,
 * how they win, the charity impact, and the call to action — while explicitly
 * avoiding golf clichés as the primary design language. So charitable impact
 * opens the page and the sport arrives only as the mechanic that funds it.
 */

/**
 * Headline impact figures.
 *
 * PLACEHOLDER — these are illustrative, not measured. Replace with live
 * aggregates before this page is publicly deployed, e.g. a Supabase view over
 * `winners.charity_amount` and `users` joined to `charities`.
 */
const IMPACT: {
  value: number;
  prefix?: string;
  label: string;
  accent: string;
}[] = [
  { value: 248910, prefix: "£", label: "Raised for charity", accent: "text-blush" },
  { value: 37, label: "Causes supported", accent: "text-ember" },
  { value: 61400, prefix: "£", label: "Paid out to members", accent: "text-iris" },
];

const STEPS = [
  {
    n: "01",
    title: "Choose your cause",
    body: "Pick a charity when you join. At least 10% of every payment goes to it automatically — push that higher whenever you want, or donate on top.",
  },
  {
    n: "02",
    title: "Post your scores",
    body: "Log your last five rounds in Stableford points. A new entry rolls off the oldest, so your card always shows current form.",
  },
  {
    n: "03",
    title: "Enter the monthly draw",
    body: "Every active subscriber is entered. Match three, four or five numbers and take a share of that month's pool.",
  },
] as const;

const TIERS = [
  {
    match: "5 numbers",
    share: 40,
    note: "Rolls over if nobody claims it",
    accent: "from-ember to-ember-deep",
  },
  { match: "4 numbers", share: 35, note: "Paid out every month", accent: "from-blush to-ember" },
  { match: "3 numbers", share: 25, note: "Paid out every month", accent: "from-iris to-blush" },
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 pt-20">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Ambient warmth. Decorative, drifts slowly, never a turf texture. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="bg-ember/20 animate-drift absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[120px]" />
            <div className="bg-blush/15 animate-drift absolute top-20 -right-32 h-96 w-96 rounded-full blur-[110px] [animation-delay:-8s]" />
          </div>

          <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
            <p className="eyebrow animate-fade-up">
              Every subscription funds a cause
            </p>

            <h1 className="font-display animate-fade-up mt-6 max-w-4xl text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl [animation-delay:120ms]">
              Turn your next round into{" "}
              <em className="text-ember">someone&rsquo;s breakthrough</em>.
            </h1>

            <p className="text-ink-dim animate-fade-up mt-8 max-w-xl text-lg leading-relaxed text-balance [animation-delay:240ms]">
              Digital Heroes is a subscription with a conscience. You choose the
              charity. A minimum of 10% of everything you pay goes straight to
              it, every month. Then you post your scores and play for a share of
              the pool.
            </p>

            <div className="animate-fade-up mt-10 flex flex-wrap items-center gap-4 [animation-delay:360ms]">
              <SubscribeCta>Subscribe and start giving</SubscribeCta>
              <a
                href="#how-it-works"
                className="group text-ink-dim hover:text-ink inline-flex items-center gap-2 px-2 py-3 text-base transition-colors duration-200"
              >
                See how it works
                <span className="transition-transform duration-300 group-hover:translate-y-0.5">
                  ↓
                </span>
              </a>
            </div>

            <p className="text-ink-faint animate-fade-up mt-8 font-mono text-xs tracking-wide [animation-delay:480ms]">
              Monthly or yearly · Cancel anytime · Minimum 10% to your charity
            </p>
          </div>
        </section>

        {/* ── Impact ───────────────────────────────────────────────────────── */}
        <section
          id="impact"
          className="border-line bg-surface/40 scroll-mt-24 border-y"
        >
          <div className="reveal mx-auto grid max-w-6xl gap-px px-6 sm:grid-cols-3">
            {IMPACT.map(({ value, prefix, label, accent }) => (
              <div key={label} className="py-12 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <p
                  className={`font-display text-5xl tracking-tight sm:text-6xl ${accent}`}
                >
                  <CountUp value={value} prefix={prefix} />
                </p>
                <p className="eyebrow mt-3">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── What you do ──────────────────────────────────────────────────── */}
        <section id="how-it-works" className="scroll-mt-24 py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="reveal max-w-2xl">
              <p className="eyebrow">What you do</p>
              <h2 className="font-display mt-5 text-4xl tracking-tight text-balance sm:text-5xl">
                Three things, and the rest runs itself.
              </h2>
            </div>

            <ol className="mt-16 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ n, title, body }) => (
                <li
                  key={n}
                  className="reveal group border-line bg-surface hover:border-line-bright ease-out-expo relative overflow-hidden rounded-2xl border p-8 transition-all duration-500 hover:-translate-y-1"
                >
                  {/* Warm wash that fades in behind the card on hover. */}
                  <div
                    aria-hidden
                    className="from-ember/8 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <span className="text-ember/40 group-hover:text-ember relative font-mono text-sm transition-colors duration-500">
                    {n}
                  </span>
                  <h3 className="relative mt-5 text-xl font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-ink-dim relative mt-3 leading-relaxed">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── How you win ──────────────────────────────────────────────────── */}
        <section
          id="draw"
          className="border-line bg-surface/40 scroll-mt-24 border-y py-28"
        >
          <div className="mx-auto max-w-6xl px-6">
            <div className="reveal flex flex-wrap items-end justify-between gap-8">
              <div className="max-w-2xl">
                <p className="eyebrow">How you win</p>
                <h2 className="font-display mt-5 text-4xl tracking-tight text-balance sm:text-5xl">
                  One draw a month. Three ways to take a share.
                </h2>
              </div>
              <p className="text-ink-dim max-w-sm leading-relaxed">
                A fixed portion of every subscription builds the pool, so it
                grows with the community. Winners in the same tier split their
                share equally.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {TIERS.map(({ match, share, note, accent }) => (
                <div
                  key={match}
                  className="reveal group border-line bg-canvas hover:border-line-bright ease-out-expo rounded-2xl border p-8 transition-all duration-500 hover:-translate-y-1"
                >
                  <p className="eyebrow">{match}</p>
                  <p className="font-display mt-4 text-6xl tracking-tight">
                    {share}
                    <span className="text-ink-faint text-3xl">%</span>
                  </p>
                  <p className="text-ink-faint mt-1 font-mono text-xs tracking-wide">
                    of the monthly pool
                  </p>

                  {/* Share of pool, drawn to scale. */}
                  <div className="bg-line mt-6 h-1 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${accent} transition-[filter,box-shadow] duration-500 group-hover:brightness-125`}
                      style={{ width: `${share}%` }}
                    />
                  </div>

                  <p className="text-ink-dim mt-5 text-sm">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Charity spotlight (PRD §08.2) ────────────────────────────────── */}
        <section id="charities" className="scroll-mt-24 py-28">
          <div className="mx-auto max-w-6xl px-6">
            <div className="reveal border-line bg-surface relative overflow-hidden rounded-3xl border p-10 sm:p-14">
              <div
                aria-hidden
                className="bg-blush/10 pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-[100px]"
              />

              <div className="relative grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                <div>
                  <p className="eyebrow">Charity spotlight</p>
                  <h2 className="font-display mt-5 text-4xl tracking-tight text-balance sm:text-5xl">
                    You decide where the money lands.
                  </h2>
                  <p className="text-ink-dim mt-6 max-w-xl leading-relaxed">
                    Browse the full directory, read what each organisation
                    actually does, and see the events they are running. Switch
                    your cause whenever you like — your contribution follows it.
                  </p>

                  <Link
                    href="/charities"
                    className="group border-line hover:border-ember hover:text-ember mt-9 inline-flex items-center gap-3 rounded-full border px-6 py-3 text-sm font-medium transition-all duration-300"
                  >
                    Explore the directory
                    <span className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </div>

                {/* Contribution model, PRD §08.1 */}
                <dl className="border-line divide-line divide-y rounded-2xl border">
                  {[
                    ["Minimum contribution", "10% of your subscription"],
                    ["Your choice", "Raise it any time"],
                    ["Extra giving", "One-off donations, no draw attached"],
                  ].map(([term, detail]) => (
                    <div key={term} className="flex flex-col gap-1 p-6">
                      <dt className="eyebrow">{term}</dt>
                      <dd className="text-lg">{detail}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ──────────────────────────────────────────────────── */}
        <section className="border-line relative overflow-hidden border-t py-28">
          <div
            aria-hidden
            className="bg-ember/15 animate-drift pointer-events-none absolute -bottom-52 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-[130px]"
          />
          <div className="reveal relative mx-auto max-w-3xl px-6 text-center">
            <p className="eyebrow">Ready when you are</p>
            <h2 className="font-display mt-5 text-4xl tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Your subscription is somebody&rsquo;s{" "}
              <span className="text-ember italic">good month</span>.
            </h2>
            <p className="text-ink-dim mx-auto mt-6 max-w-lg leading-relaxed text-balance">
              Join monthly, or take the discounted year. Either way the giving
              starts on day one.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <SubscribeCta>Choose your plan</SubscribeCta>
              <Link
                href="/login"
                className="text-ink-dim hover:text-ink px-6 py-3.5 text-base transition-colors duration-200"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-line border-t">
        <div className="text-ink-faint mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-10 text-sm">
          <p className="flex items-baseline">
            <span>digital.</span>
            <span className="text-ink-dim font-semibold">HEROES</span>
            <span className="text-ember">.</span>
          </p>
          <nav className="flex flex-wrap gap-6">
            {[
              ["/charities", "Charities"],
              ["/login", "Sign in"],
              ["/subscribe", "Subscribe"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="hover:text-ink transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </nav>
          <p>© {new Date().getFullYear()} Digital Heroes</p>
        </div>
      </footer>
    </>
  );
}
