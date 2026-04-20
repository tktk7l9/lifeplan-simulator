"use client";

import dynamic from "next/dynamic";

const FloatingParticles = dynamic(
  () => import("./FloatingParticles").then((m) => m.FloatingParticles),
  { ssr: false }
);

export function FloatingParticlesWrapper({ count = 60, opacity = 0.18 }: { count?: number; opacity?: number }) {
  return <FloatingParticles count={count} opacity={opacity} />;
}
