'use client'
import { useState, useEffect, lazy, Suspense } from 'react';

const BelowFoldContent = lazy(
  () => import("@/components/landing/BelowFoldContent").then(m => ({ default: m.BelowFoldContent }))
);
const LandingFooter = lazy(
  () => import("@/components/landing/BelowFoldContent").then(m => ({ default: m.LandingFooter }))
);

/**
 * Lazily mounts the below-the-fold landing content. `part="footer"` mounts only the footer, so the
 * page can place it outside <main> and keep the contentinfo landmark (SHIG 59).
 */
export function BelowFoldLoader({ part = "content" }: { part?: "content" | "footer" }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional pattern for detecting client mount (hydration safety)
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      {part === "footer" ? <LandingFooter /> : <BelowFoldContent />}
    </Suspense>
  );
}
