"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export function LandingNav() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const heroEl = document.getElementById("lp-hero");
    function update() {
      if (!heroEl || !el) return;
      const r = heroEl.getBoundingClientRect();
      if (r.bottom < 80) el.classList.add("scrolled");
      else el.classList.remove("scrolled");
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      ref={ref}
      className="lp-nav fixed top-0 left-0 right-0 z-50 border-b"
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" className="lp-nav-amber flex-shrink-0">
            <path d="M2 22 L10 10 L15 16 L20 8 L26 22 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 22 L26 22" stroke="currentColor" strokeWidth="2"/>
            <circle cx="20" cy="8" r="1.8" fill="currentColor"/>
          </svg>
          <span className="lp-nav-logo font-black text-[15px] tracking-tight">
            LifePlan <span className="lp-nav-amber">/ Summit</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13px] font-bold">
          <a href="#lp-concern" className="lp-nav-link transition-colors">課題</a>
          <a href="#lp-solution" className="lp-nav-link transition-colors">できること</a>
          <a href="#lp-features" className="lp-nav-link transition-colors">機能</a>
          <a href="#lp-route" className="lp-nav-link transition-colors">使い方</a>
          <a href="#lp-faq" className="lp-nav-link transition-colors">FAQ</a>
        </nav>

        <Link
          href="/simulator"
          className="lp-nav-cta inline-flex items-center gap-2 font-black text-[12px] px-4 py-2.5 rounded-full transition-colors"
        >
          無料ではじめる
          <span>↗</span>
        </Link>
      </div>
    </header>
  );
}
