import Link from "next/link";

import { requireAdminPage } from "@/lib/dal";

import { signOut } from "../login/actions";
import { AdminNav } from "./admin-nav";

/**
 * Admin shell.
 *
 * The `requireAdminPage()` call here is what renders the chrome, NOT what
 * secures the area. Next.js is explicit that a layout "does not control
 * whether the rest of the route renders" and that layouts skip re-rendering on
 * client navigation, so each admin page and every admin Server Action repeats
 * the check for itself. See `src/lib/dal.ts`.
 */
export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const admin = await requireAdminPage();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-line bg-canvas/80 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-baseline text-base tracking-tight">
              <span className="text-ink-dim group-hover:text-ember transition-colors duration-300">
                digital.
              </span>
              <span className="font-semibold">HEROES</span>
              <span className="text-ember">.</span>
            </Link>
            <span className="border-ember/40 text-ember hidden rounded-full border px-3 py-1 font-mono text-[0.625rem] tracking-wider uppercase sm:inline">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-ink-faint hidden text-xs md:inline">
              {admin.email ?? admin.fullName ?? "Administrator"}
            </span>
            <Link
              href="/dashboard"
              className="text-ink-dim hover:text-ink text-sm transition-colors duration-200"
            >
              My dashboard
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-ink-dim hover:text-ink text-sm transition-colors duration-200"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <AdminNav />
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
