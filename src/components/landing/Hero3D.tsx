"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

export function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  function initHero() {
    if (initialized.current) return;
    if (typeof window === "undefined") return;
    const w = window as typeof window & { THREE?: unknown };
    if (!w.THREE) return;
    // hero3d.js looks for #hero3d element
    const el = document.getElementById("hero3d");
    if (!el) return;
    initialized.current = true;
    // dynamically import and run hero3d script (already loaded via Script tag)
  }

  return (
    <>
      <Script
        src="https://unpkg.com/three@0.160.0/build/three.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="/hero3d.js"
        strategy="afterInteractive"
        onLoad={initHero}
      />
      <div
        id="hero3d"
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "hidden" }}
      />
    </>
  );
}
