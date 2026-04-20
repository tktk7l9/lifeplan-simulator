"use client";

import dynamic from "next/dynamic";

const CursorBird = dynamic(
  () => import("./CursorBird").then((m) => ({ default: m.CursorBird })),
  { ssr: false }
);

export function CursorBirdWrapper() {
  return <CursorBird />;
}
