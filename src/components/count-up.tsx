"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Final value to land on. */
  value: number;
  prefix?: string;
  suffix?: string;
  /** Duration in ms. */
  duration?: number;
};

/**
 * Counts up to `value` the first time it scrolls into view.
 *
 * Renders the *final* value during SSR and as the initial client state, so the
 * correct figure is on screen even if JavaScript never runs or the user
 * prefers reduced motion. The animation only ever replaces a correct number
 * with the same correct number.
 */
export function CountUp({ value, prefix = "", suffix = "", duration = 1600 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          // easeOutExpo — fast off the line, long settle.
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        setDisplay(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display.toLocaleString("en-GB")}
      {suffix}
    </span>
  );
}
