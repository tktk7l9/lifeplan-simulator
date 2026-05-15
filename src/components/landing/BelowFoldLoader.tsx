'use client'
import { useState, useEffect, lazy, Suspense } from 'react';

const BelowFoldContent = lazy(
  () => import("@/components/landing/BelowFoldContent").then(m => ({ default: m.BelowFoldContent }))
);

export function BelowFoldLoader() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <BelowFoldContent />
    </Suspense>
  );
}
