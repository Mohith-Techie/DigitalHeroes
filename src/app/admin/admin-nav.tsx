"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Draws" },
  { href: "/admin/payouts", label: "Payouts" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-line/60 border-t">
      <div className="mx-auto flex max-w-6xl gap-1 px-4">
        {TABS.map(({ href, label }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative px-4 py-3 text-sm transition-colors duration-200 ${
                active ? "text-ink" : "text-ink-dim hover:text-ink"
              }`}
            >
              {label}
              <span
                aria-hidden
                className={`bg-ember absolute inset-x-4 -bottom-px h-px transition-opacity duration-300 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
