"use client";
import { useEffect } from "react";

// Content is always visible without JS. One observer discovers only marked elements;
// motion runs on entry, never on a scroll handler or a numeric interpolation loop.
export default function MotionPreferences() {
  useEffect(() => {
    const root = document.documentElement;
    const system = matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      let saved = false,
        contrast = false;
      try {
        saved = localStorage.getItem("dermaloop-motion") === "reduced";
        contrast = localStorage.getItem("dermaloop-contrast") === "high";
      } catch {
        /* System preference still works without storage. */
      }
      root.dataset.motion = system.matches || saved ? "reduced" : "full";
      root.dataset.contrast = contrast ? "high" : "default";
      root.dataset.documentVisible = String(!document.hidden);
    };
    apply();
    system.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    window.addEventListener("dermaloop-preferences", apply);
    document.addEventListener("visibilitychange", apply);
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.matches(".hero-art"))
            entry.target.setAttribute(
              "data-ambient-active",
              String(entry.isIntersecting),
            );
          else if (entry.isIntersecting) {
            entry.target.setAttribute("data-entered", "true");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    const discover = (container: ParentNode) => {
      const candidates = [
        ...container.querySelectorAll("[data-reveal], .hero-art"),
      ];
      if (
        container instanceof Element &&
        container.matches("[data-reveal], .hero-art")
      )
        candidates.unshift(container);
      for (const el of candidates)
        if (!seen.has(el)) {
          seen.add(el);
          observer.observe(el);
        }
    };
    discover(document);
    const mutations = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node instanceof Element) discover(node);
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      system.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
      window.removeEventListener("dermaloop-preferences", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);
  return null;
}
export function ScoreValue({
  value,
  active = true,
}: {
  value: string | number;
  active?: boolean;
}) {
  // Show only the actual value: no count-up, intermediate score or live-region spam.
  return (
    <span
      key={String(value)}
      className={active ? "score-value numeric-change" : "score-value"}
    >
      {value}
    </span>
  );
}
