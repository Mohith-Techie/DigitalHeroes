"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SubscribeCta } from "./subscribe-cta";

const NAV = [
  { href: "#impact", label: "Impact" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#draw", label: "The draw" },
  { href: "#charities", label: "Charities" },
];

/**
 * Sticky header that condenses once the page scrolls — the bar gains a blurred
 * backdrop and a hairline rule, so it separates from content without ever
 * being a solid slab over the hero.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); // account for a restored scroll position on reload
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`ease-out-expo fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-line bg-canvas/80 border-b backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-6 transition-all duration-500 ${
          scrolled ? "h-16" : "h-20"
        }`}
      >
        <Link
          href="/"
          className="group text-ink flex items-baseline text-lg tracking-tight"
        >
          <span className="text-ink-dim group-hover:text-ember transition-colors duration-300">
            digital.
          </span>
          <span className="font-semibold">HEROES</span>
          <span className="text-ember">.</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="group text-ink-dim hover:text-ink relative text-sm transition-colors duration-200"
            >
              {label}
              {/* Underline wipes in from the left on hover. */}
              <span
                aria-hidden
                className="bg-ember absolute -bottom-1.5 left-0 h-px w-0 transition-[width] duration-300 ease-out group-hover:w-full"
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="text-ink-dim hover:text-ink px-2 py-2 text-sm transition-colors duration-200"
          >
            Sign in
          </Link>
          <SubscribeCta size="sm">Subscribe</SubscribeCta>
        </div>
      </div>
    </header>
  );
}
