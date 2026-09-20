import type { Metadata } from "next";
import Link from "next/link";

import { MIN_CHARITY_PERCENTAGE } from "@/lib/charity";
import { createClient } from "@/utils/supabase/server";

import { CharityDirectory, type CharityCard } from "./charity-directory";

export const metadata: Metadata = {
  title: "Charities",
  description:
    "Browse every cause on the platform and choose where your subscription goes.",
};

export default async function CharitiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // PRD §08.2: the directory lists active charities. Readable by anonymous
  // visitors, so the page works as a public marketing surface too.
  const { data: charities, error } = await supabase
    .from("charities")
    .select("id, name, slug, description, category, website_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // A signed-in member sees their existing choice pre-selected.
  let currentCharityId: string | null = null;
  let currentPercentage = MIN_CHARITY_PERCENTAGE;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("charity_id, charity_percentage")
      .eq("id", user.id)
      .maybeSingle();

    currentCharityId = profile?.charity_id ?? null;
    if (typeof profile?.charity_percentage === "number") {
      currentPercentage = profile.charity_percentage;
    }
  }

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-blush/12 animate-drift pointer-events-none absolute -top-48 right-0 -z-10 h-[32rem] w-[32rem] rounded-full blur-[130px]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="group text-ink-dim hover:text-ink mb-12 inline-flex items-center gap-2 text-sm transition-colors duration-200"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          Back to Digital Heroes
        </Link>

        <p className="eyebrow">The directory</p>
        <h1 className="font-display mt-4 max-w-3xl text-4xl tracking-tight text-balance sm:text-6xl">
          Every cause on the platform.
        </h1>
        <p className="text-ink-dim mt-6 max-w-xl text-lg leading-relaxed text-balance">
          Pick the one that means something to you. At least{" "}
          {MIN_CHARITY_PERCENTAGE}% of your subscription goes to it every month,
          and you can change your mind whenever you like.
        </p>

        {error ? (
          <p className="border-blush/40 bg-blush/10 text-blush mt-10 rounded-xl border px-5 py-4 text-sm">
            Could not load the directory: {error.message}
          </p>
        ) : charities && charities.length > 0 ? (
          <CharityDirectory
            charities={charities as CharityCard[]}
            canSelect={Boolean(user)}
            initialCharityId={currentCharityId}
            initialPercentage={currentPercentage}
          />
        ) : (
          <div className="border-line bg-surface mt-12 rounded-2xl border p-8">
            <p className="eyebrow">Nothing listed yet</p>
            <p className="text-ink-dim mt-3 text-sm leading-relaxed">
              No active charities have been added. An administrator can add them
              from the admin dashboard, or you can seed{" "}
              <code className="text-ember">public.charities</code> directly.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
