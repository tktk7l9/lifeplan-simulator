"use client";

import { ReactNode } from "react";

interface BirdHoverZoneProps {
  action: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function BirdHoverZone({ action, children, className, style }: BirdHoverZoneProps) {
  const dispatch = (a: string) =>
    window.dispatchEvent(new CustomEvent("bird-action", { detail: { action: a } }));

  return (
    <div
      className={className}
      style={style}
      onMouseEnter={() => dispatch(action)}
      onMouseLeave={() => dispatch("idle")}
    >
      {children}
    </div>
  );
}
