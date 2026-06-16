'use client'
import { useState, useEffect, lazy, Suspense } from 'react';

const BelowFoldContent = lazy(
  () => import("@/components/landing/BelowFoldContent").then(m => ({ default: m.BelowFoldContent }))
);

export function BelowFoldLoader() {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- クライアントマウント検知（ハイドレーション対策）の意図的パターン
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <BelowFoldContent />
    </Suspense>
  );
}
