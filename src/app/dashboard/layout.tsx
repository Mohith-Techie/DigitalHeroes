import Link from "next/link";

import { signOut } from "../login/actions";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-line bg-canvas/80 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="group flex items-baseline text-base tracking-tight"
          >
            <span className="text-ink-dim group-hover:text-ember transition-colors duration-300">
              digital.
            </span>
            <span className="font-semibold">HEROES</span>
            <span className="text-ember">.</span>
          </Link>

          <div className="flex items-center gap-5">
            <span className="eyebrow hidden sm:inline">Dashboard</span>
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
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
